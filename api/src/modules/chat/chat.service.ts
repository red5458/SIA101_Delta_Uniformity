import { query, withTransaction } from "../../config/db";
import type { UserRow } from "../../types";
import { badRequest, forbidden, notFound } from "../../utils/ApiError";
import { createNotification } from "../notifications/notifications.service";
import type { z } from "zod";
import type { messageQuerySchema, sendMessageSchema } from "./chat.schema";

type MessageQuery = z.infer<typeof messageQuerySchema>;
type MessageInput = z.infer<typeof sendMessageSchema>;

export interface ChatMessage {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  attachments: ChatAttachment[];
}

export interface ChatAttachment {
  attachment_id: string;
  resource_type: "image" | "video";
  url: string;
  file_name: string;
  content_type: string;
  file_size: number;
}

export interface ChatConversationSummary {
  conversation_id: string;
  listing_id: string;
  listing_title: string;
  listing_status: "Active" | "Sold";
  other_user: {
    user_id: string;
    name: string;
    program: string | null;
    department: string | null;
    avatar_url: string | null;
  };
  last_message: {
    body: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;
  updated_at: string;
}

function iso(value: Date | string | null) {
  return value ? new Date(value).toISOString() : null;
}

export async function getOrCreateConversation(user: UserRow, listingId: string) {
  const { rows: listingRows } = await query<{
    seller_id: string;
    status: string;
    title: string;
    seller_suspended: boolean;
  }>(
    `SELECT l.seller_id, l.status, l.title, u.is_suspended AS seller_suspended
       FROM listings l
       JOIN users u ON u.user_id = l.seller_id
      WHERE l.listing_id = $1`,
    [listingId],
  );
  const listing = listingRows[0];
  if (!listing || listing.seller_suspended) throw notFound("Listing not found");
  if (listing.seller_id === user.user_id) {
    throw badRequest("You cannot start a conversation about your own listing.", "SELF_CHAT");
  }
  if (listing.status !== "Active") {
    throw badRequest("This listing is no longer available for new conversations.", "LISTING_UNAVAILABLE");
  }

  const { rows } = await query<{ conversation_id: string }>(
    `INSERT INTO chat_conversations (listing_id, buyer_id, seller_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (listing_id, buyer_id) DO UPDATE
       SET updated_at = chat_conversations.updated_at
     RETURNING conversation_id`,
    [listingId, user.user_id, listing.seller_id],
  );

  return { conversation_id: rows[0]!.conversation_id };
}

export async function getConversations(userId: string): Promise<ChatConversationSummary[]> {
  const { rows } = await query<ChatConversationSummary>(
    `SELECT
       c.conversation_id,
       c.listing_id,
       l.title AS listing_title,
       l.status AS listing_status,
       json_build_object(
         'user_id', other.user_id,
         'name', other.name,
         'program', other.program,
         'department', other.department,
         'avatar_url', other.avatar_url
       ) AS other_user,
       CASE WHEN latest.message_id IS NULL THEN NULL ELSE json_build_object(
         'body', latest.body,
         'sender_id', latest.sender_id,
         'created_at', latest.created_at
       ) END AS last_message,
       (SELECT count(*)::int
          FROM chat_messages unread
         WHERE unread.conversation_id = c.conversation_id
           AND unread.sender_id <> $1
           AND unread.read_at IS NULL) AS unread_count,
       c.updated_at
     FROM chat_conversations c
     JOIN listings l ON l.listing_id = c.listing_id
     JOIN users other ON other.user_id = CASE
       WHEN c.buyer_id = $1 THEN c.seller_id
       ELSE c.buyer_id
     END
     LEFT JOIN LATERAL (
       SELECT
         m.message_id,
         CASE
           WHEN btrim(m.body) <> '' THEN m.body
           ELSE COALESCE((
             SELECT CASE a.resource_type WHEN 'video' THEN 'Sent a video' ELSE 'Sent a photo' END
               FROM chat_attachments a
              WHERE a.message_id = m.message_id
              ORDER BY a.created_at
              LIMIT 1
           ), 'Attachment')
         END AS body,
         m.sender_id,
         m.created_at
         FROM chat_messages m
        WHERE m.conversation_id = c.conversation_id
        ORDER BY m.created_at DESC, m.message_id DESC
        LIMIT 1
     ) latest ON true
     WHERE c.buyer_id = $1 OR c.seller_id = $1
     ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
    [userId],
  );
  return rows;
}

async function assertParticipant(conversationId: string, userId: string) {
  const { rows } = await query<{ conversation_id: string; buyer_id: string; seller_id: string; listing_id: string }>(
    `SELECT conversation_id, buyer_id, seller_id, listing_id
       FROM chat_conversations
      WHERE conversation_id = $1`,
    [conversationId],
  );
  const conversation = rows[0];
  if (!conversation) throw notFound("Conversation not found");
  if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
    throw notFound("Conversation not found");
  }
  return conversation;
}

function serializeMessage(row: Omit<ChatMessage, "created_at" | "read_at" | "attachments"> & {
  created_at: Date | string;
  read_at: Date | string | null;
  attachments?: ChatAttachment[] | null;
}): ChatMessage {
  return {
    ...row,
    created_at: iso(row.created_at)!,
    read_at: iso(row.read_at),
    attachments: row.attachments ?? [],
  };
}

function validateAttachmentOwnership(
  userId: string,
  attachment: MessageInput["attachments"][number],
) {
  const allowedTypes = attachment.resourceType === "image"
    ? new Set(["image/jpeg", "image/png", "image/webp", "image/avif"])
    : new Set(["video/mp4", "video/quicktime", "video/webm"]);
  const maxSize = attachment.resourceType === "image" ? 5 * 1024 * 1024 : 25 * 1024 * 1024;
  if (!allowedTypes.has(attachment.contentType) || attachment.fileSize > maxSize) {
    throw badRequest("The attachment type does not match its file.", "ATTACHMENT_TYPE");
  }

  if (attachment.key.startsWith(`local:${userId}/`)) {
    if (!attachment.url.startsWith(`/uploads/${userId}/`)) {
      throw forbidden("Attachment upload does not belong to your account.", "ATTACHMENT_OWNER");
    }
    return;
  }

  const folder = `uniformity/${userId}/`;
  let url: URL;
  try {
    url = new URL(attachment.url);
  } catch {
    throw badRequest("The uploaded attachment URL is invalid.", "ATTACHMENT_URL");
  }
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    throw badRequest("The uploaded attachment URL is invalid.", "ATTACHMENT_URL");
  }
  if (
    !attachment.key.startsWith(folder) ||
    url.hostname !== "res.cloudinary.com" ||
    !path.includes(`/${attachment.resourceType}/upload/`) ||
    !path.includes(attachment.key)
  ) {
    throw forbidden("Attachment upload does not belong to your account.", "ATTACHMENT_OWNER");
  }
}

export async function getMessages(
  userId: string,
  conversationId: string,
  options: MessageQuery,
) {
  await assertParticipant(conversationId, userId);
  const { beforeId, afterId } = options;
  let cursor: { created_at: Date | string; message_id: string } | undefined;
  if (beforeId || afterId) {
    const { rows } = await query<{ created_at: Date | string; message_id: string }>(
      `SELECT created_at, message_id
         FROM chat_messages
        WHERE conversation_id = $1 AND message_id = $2`,
      [conversationId, beforeId ?? afterId],
    );
    cursor = rows[0];
    if (!cursor) throw badRequest("Message cursor is invalid.", "CURSOR_INVALID");
  }

  let sql = `SELECT m.message_id, m.conversation_id, m.sender_id, m.body, m.created_at, m.read_at,
                    COALESCE(a.items, '[]'::json) AS attachments
               FROM chat_messages m
               LEFT JOIN LATERAL (
                 SELECT json_agg(json_build_object(
                   'attachment_id', ca.attachment_id,
                   'resource_type', ca.resource_type,
                   'url', ca.url,
                   'file_name', ca.file_name,
                   'content_type', ca.content_type,
                   'file_size', ca.file_size
                 ) ORDER BY ca.created_at) AS items
                   FROM chat_attachments ca
                  WHERE ca.message_id = m.message_id
               ) a ON TRUE
              WHERE m.conversation_id = $1`;
  const params: unknown[] = [conversationId];
  if (beforeId && cursor) {
    params.push(cursor.created_at, cursor.message_id);
    sql += ` AND (m.created_at, m.message_id) < ($2, $3)`;
  } else if (afterId && cursor) {
    params.push(cursor.created_at, cursor.message_id);
    sql += ` AND (m.created_at, m.message_id) > ($2, $3)`;
  }
  const isAfter = Boolean(afterId);
  params.push(isAfter ? 100 : 51);
  sql += ` ORDER BY m.created_at ${isAfter ? "ASC" : "DESC"}, m.message_id ${isAfter ? "ASC" : "DESC"} LIMIT $${params.length}`;

  const { rows } = await query<{
    message_id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: Date | string;
    read_at: Date | string | null;
    attachments: ChatAttachment[] | null;
  }>(sql, params);
  const hasMore = !isAfter && rows.length > 50;
  const messages = (hasMore ? rows.slice(0, 50) : rows).map(serializeMessage);
  if (!isAfter) messages.reverse();
  return { items: messages, hasMore };
}

export async function markMessagesRead(userId: string, conversationId: string) {
  await assertParticipant(conversationId, userId);
  await query(
    `UPDATE chat_messages
        SET read_at = now()
      WHERE conversation_id = $1
        AND sender_id <> $2
        AND read_at IS NULL`,
    [conversationId, userId],
  );
  return { read: true };
}

export async function sendMessage(
  user: UserRow,
  conversationId: string,
  input: MessageInput,
) {
  const result = await withTransaction(async (client) => {
    const { rows: conversations } = await client.query<{
      conversation_id: string;
      buyer_id: string;
      seller_id: string;
      listing_id: string;
      listing_title: string;
    }>(
      `SELECT c.conversation_id, c.buyer_id, c.seller_id, c.listing_id, l.title AS listing_title
         FROM chat_conversations c
         JOIN listings l ON l.listing_id = c.listing_id
        WHERE c.conversation_id = $1`,
      [conversationId],
    );
    const conversation = conversations[0];
    if (!conversation) throw notFound("Conversation not found");
    if (conversation.buyer_id !== user.user_id && conversation.seller_id !== user.user_id) {
      throw notFound("Conversation not found");
    }

    input.attachments.forEach((attachment) => validateAttachmentOwnership(user.user_id, attachment));

    const { rows } = await client.query<{
      message_id: string;
      conversation_id: string;
      sender_id: string;
      body: string;
      created_at: Date | string;
      read_at: Date | string | null;
    }>(
      `INSERT INTO chat_messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING message_id, conversation_id, sender_id, body, created_at, read_at`,
      [conversationId, user.user_id, input.body],
    );
    for (const attachment of input.attachments) {
      await client.query(
        `INSERT INTO chat_attachments
           (message_id, uploader_id, resource_type, url, asset_key, content_type, file_name, file_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          rows[0]!.message_id,
          user.user_id,
          attachment.resourceType,
          attachment.url,
          attachment.key,
          attachment.contentType,
          attachment.fileName,
          attachment.fileSize,
        ],
      );
    }
    await client.query(
      `UPDATE chat_conversations SET updated_at = now(), last_message_at = now()
        WHERE conversation_id = $1`,
      [conversationId],
    );
    const { rows: messageRows } = await client.query<{
      message_id: string;
      conversation_id: string;
      sender_id: string;
      body: string;
      created_at: Date | string;
      read_at: Date | string | null;
      attachments: ChatAttachment[] | null;
    }>(
      `SELECT m.message_id, m.conversation_id, m.sender_id, m.body, m.created_at, m.read_at,
              COALESCE(a.items, '[]'::json) AS attachments
         FROM chat_messages m
         LEFT JOIN LATERAL (
           SELECT json_agg(json_build_object(
             'attachment_id', ca.attachment_id,
             'resource_type', ca.resource_type,
             'url', ca.url,
             'file_name', ca.file_name,
             'content_type', ca.content_type,
             'file_size', ca.file_size
           ) ORDER BY ca.created_at) AS items
             FROM chat_attachments ca
            WHERE ca.message_id = m.message_id
         ) a ON TRUE
        WHERE m.message_id = $1`,
      [rows[0]!.message_id],
    );

    return {
      message: serializeMessage(messageRows[0]!),
      recipientId: conversation.buyer_id === user.user_id
        ? conversation.seller_id
        : conversation.buyer_id,
      listingId: conversation.listing_id,
      listingTitle: conversation.listing_title,
    };
  });

  void createNotification({
    userId: result.recipientId,
    type: "message",
    title: `New message about ${result.listingTitle}`,
    body: input.body
      ? input.body.length > 120 ? `${input.body.slice(0, 119)}…` : input.body
      : input.attachments.some((attachment) => attachment.resourceType === "video")
        ? "Sent a video"
        : "Sent a photo",
    linkUrl: `/messages/${conversationId}`,
    listingId: result.listingId,
    actorId: user.user_id,
  });

  return result.message;
}
