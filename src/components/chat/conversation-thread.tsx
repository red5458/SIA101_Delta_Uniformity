"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { ChatAttachmentInput, ChatConversationSummary, ChatMessage, ChatMessagesPage } from "@/types/db";
import { formatRelative, initials } from "@/lib/utils";

const MAX_CHAT_ATTACHMENTS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

interface PendingAttachment extends ChatAttachmentInput {
  id: string;
}

interface UploadSignatureBase {
  uploadUrl: string;
  maxBytes: number;
  resourceType: "image" | "video";
}

interface CloudinaryUploadSignature extends UploadSignatureBase {
  driver: "cloudinary";
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
}

interface LocalUploadSignature extends UploadSignatureBase {
  driver: "local";
}

function createAttachmentId() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function uploadChatAttachment(file: File): Promise<ChatAttachmentInput> {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const response = await fetch("/api/uploads/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, resourceType }),
  });
  const signaturePayload = await response.json().catch(() => null);
  if (!response.ok || !signaturePayload?.data) {
    throw new Error(signaturePayload?.error?.message ?? "Media uploads are unavailable.");
  }
  const signature = signaturePayload.data as CloudinaryUploadSignature | LocalUploadSignature;
  if (file.size > signature.maxBytes) {
    throw new Error(`${resourceType === "video" ? "Videos" : "Photos"} exceed the upload size limit.`);
  }

  let url: string;
  let key: string;
  if (signature.driver === "cloudinary") {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("signature", signature.signature);
    form.append("folder", signature.folder);
    form.append("public_id", signature.publicId);
    const uploadResponse = await fetch(signature.uploadUrl, { method: "POST", body: form });
    const uploaded = await uploadResponse.json().catch(() => null);
    if (!uploadResponse.ok || !uploaded?.secure_url || !uploaded?.public_id) {
      throw new Error(uploaded?.error?.message ?? "Cloudinary could not upload this file.");
    }
    url = uploaded.secure_url as string;
    key = uploaded.public_id as string;
  } else {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("resourceType", resourceType);
    const uploadResponse = await fetch(signature.uploadUrl, { method: "POST", body: form });
    const uploaded = await uploadResponse.json().catch(() => null);
    if (!uploadResponse.ok || !uploaded?.data?.url || !uploaded?.data?.key) {
      throw new Error(uploaded?.error?.message ?? "Could not store this file.");
    }
    url = uploaded.data.url as string;
    key = uploaded.data.key as string;
  }

  return {
    url,
    key,
    resourceType,
    contentType: file.type,
    fileName: file.name.slice(0, 255),
    fileSize: file.size,
  };
}

export function ConversationThread({
  conversation,
  initialMessages,
  initialHasMore,
  currentUserId,
}: {
  conversation: ChatConversationSummary;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const nearBottomRef = useRef(true);
  const prependHeightRef = useRef<number | null>(null);
  const skippedInitialMessagesEffectRef = useRef(false);
  messagesRef.current = messages;

  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
  }, []);

  const markRead = useCallback(() => {
    void fetch(`/api/conversations/${conversation.conversation_id}/read`, {
      method: "POST",
    }).catch(() => undefined);
  }, [conversation.conversation_id]);

  const pollForMessages = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const latest = messagesRef.current[messagesRef.current.length - 1];
    const query = latest ? `?after_id=${encodeURIComponent(latest.message_id)}` : "";
    try {
      const response = await fetch(
        `/api/conversations/${conversation.conversation_id}/messages${query}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const payload = await response.json();
      const page = payload.data as ChatMessagesPage;
      if (!page.items.length) return;
      setMessages((current) => {
        const known = new Set(current.map((message) => message.message_id));
        return [...current, ...page.items.filter((message) => !known.has(message.message_id))];
      });
      markRead();
    } catch {
      // Keep the current thread usable during a temporary network interruption.
    }
  }, [conversation.conversation_id, markRead]);

  useEffect(() => {
    markRead();
    const timer = window.setInterval(() => void pollForMessages(), 3000);
    return () => window.clearInterval(timer);
  }, [markRead, pollForMessages]);

  useEffect(() => {
    if (!skippedInitialMessagesEffectRef.current) {
      skippedInitialMessagesEffectRef.current = true;
      return;
    }
    const scrollArea = scrollAreaRef.current;
    if (scrollArea && prependHeightRef.current !== null) {
      scrollArea.scrollTop += scrollArea.scrollHeight - prependHeightRef.current;
      prependHeightRef.current = null;
    } else if (nearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  async function addAttachments(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_CHAT_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      toast.error(`Attach up to ${MAX_CHAT_ATTACHMENTS} files per message.`);
      return;
    }
    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more file${remaining === 1 ? "" : "s"} to this message.`);
    }

    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        const supportedImage = IMAGE_MIMES.has(file.type);
        const supportedVideo = VIDEO_MIMES.has(file.type);
        if (!supportedImage && !supportedVideo) {
          toast.error(`${file.name} is not a supported photo or video.`);
          continue;
        }
        const sizeLimit = supportedVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
        if (file.size > sizeLimit) {
          toast.error(`${file.name} is too large. Photos are limited to 5 MB and videos to 25 MB.`);
          continue;
        }
        try {
          const uploaded = await uploadChatAttachment(file);
          setAttachments((current) => [...current, { ...uploaded, id: createAttachmentId() }]);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : `Could not upload ${file.name}.`);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const response = await fetch(
        `/api/conversations/${conversation.conversation_id}/messages?before_id=${encodeURIComponent(oldest.message_id)}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not load older messages");
      const page = payload.data as ChatMessagesPage;
      if (page.items.length) {
        prependHeightRef.current = scrollAreaRef.current?.scrollHeight ?? 0;
      }
      setMessages((current) => [...page.items, ...current]);
      setHasMore(page.hasMore);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load older messages");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if ((!text && attachments.length === 0) || sending || uploading) return;
    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${conversation.conversation_id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          attachments: attachments.map(({ id: _id, ...attachment }) => attachment),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Message could not be sent");
      nearBottomRef.current = true;
      setMessages((current) => [...current, payload.data as ChatMessage]);
      setBody("");
      setAttachments([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Message could not be sent");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mx-auto flex h-[calc(100svh-12rem)] min-h-80 max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card md:h-[calc(100svh-9rem)] md:min-h-[28rem]">
      <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
        <Link href="/messages" aria-label="Back to messages" className="btn-ghost h-9 w-9 !px-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href={`/students/${conversation.other_user.user_id}`} className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-xs font-bold text-brand-800">
          {conversation.other_user.avatar_url ? (
            <Image src={conversation.other_user.avatar_url} alt="" fill sizes="40px" className="object-cover" />
          ) : initials(conversation.other_user.name)}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/students/${conversation.other_user.user_id}`} className="block truncate text-sm font-semibold text-ink hover:text-brand-700">
            {conversation.other_user.name}
          </Link>
          <p className="truncate text-xs text-muted">About: {conversation.listing_title}</p>
        </div>
        {conversation.listing_status === "Sold" && (
          <span className="badge border-line bg-cream text-muted">Sold</span>
        )}
      </header>

      <div
        ref={scrollAreaRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-cream/50 p-3 sm:p-5"
      >
        {hasMore && (
          <div className="text-center">
            <button type="button" onClick={loadOlder} disabled={loadingOlder} className="btn-secondary py-2 text-xs">
              {loadingOlder && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              Load older messages
            </button>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="grid min-h-48 place-items-center text-center text-muted">
            <div>
              <MessageCircle className="mx-auto h-8 w-8 text-brand-300" />
              <p className="mt-2 text-sm font-medium text-ink">Start the conversation</p>
              <p className="mt-1 text-xs">Ask about the item, sizing, or meetup details.</p>
            </div>
          </div>
        ) : messages.map((message) => {
          const own = message.sender_id === currentUserId;
          return (
            <div key={message.message_id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${own ? "rounded-br-md bg-brand-700 text-white" : "rounded-bl-md border border-line bg-white text-ink"}`}>
                {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>}
                {message.attachments?.length > 0 && (
                  <div className={`space-y-2 ${message.body ? "mt-2" : ""}`}>
                    {message.attachments.map((attachment) => (
                      <div key={attachment.attachment_id}>
                        {attachment.resource_type === "image" ? (
                          <a href={attachment.url} target="_blank" rel="noreferrer" aria-label={`Open ${attachment.file_name}`}>
                            <Image
                              src={attachment.url}
                              alt={attachment.file_name}
                              width={640}
                              height={480}
                              unoptimized
                              className="max-h-72 w-auto max-w-full rounded-xl object-contain"
                            />
                          </a>
                        ) : (
                          <video
                            src={attachment.url}
                            controls
                            playsInline
                            preload="metadata"
                            className="max-h-72 max-w-full rounded-xl"
                            aria-label={attachment.file_name}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <time dateTime={message.created_at} className={`mt-1 block text-right text-[10px] ${own ? "text-white/70" : "text-muted"}`}>
                  {formatRelative(message.created_at)}
                </time>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-line bg-white p-3 sm:p-4">
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative flex max-w-full items-center gap-2 rounded-xl border border-line bg-cream px-2 py-1.5 text-xs text-ink">
                <span className="max-w-40 truncate">{attachment.fileName}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                  aria-label={`Remove ${attachment.fileName}`}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:bg-white hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={send} className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/webm"
            multiple
            className="sr-only"
            onChange={(event) => void addAttachments(event.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending || attachments.length >= MAX_CHAT_ATTACHMENTS}
            aria-label="Attach photos or videos"
            title="Attach photos or videos"
            className="btn-secondary h-11 w-11 shrink-0 !px-0"
          >
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <label className="sr-only" htmlFor="chat-message">Write a message</label>
          <textarea
            id="chat-message"
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, 2000))}
            maxLength={2000}
            rows={1}
            placeholder="Write a message…"
            className="input max-h-32 min-h-11 flex-1 resize-y py-3"
          />
          <button type="submit" disabled={(!body.trim() && attachments.length === 0) || sending || uploading} aria-label="Send message" className="btn-primary h-11 w-11 shrink-0 !px-0">
            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        <p className="mt-1.5 text-right text-[10px] text-muted">Up to 4 attachments · photos 5 MB · videos 25 MB</p>
      </div>
    </section>
  );
}
