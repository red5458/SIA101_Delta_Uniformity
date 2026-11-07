"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, MessageSquare, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRelative, initials } from "@/lib/utils";
import type { Comment } from "@/types/db";

interface Props {
  listingId: string;
  sellerId: string;
  currentUserId: string;
  isAdmin: boolean;
  initialComments: Comment[];
}

interface Node extends Comment {
  children: Node[];
}

interface CommentNodeProps {
  node: Node;
  depth: number;
  sellerId: string;
  currentUserId: string;
  isAdmin: boolean;
  replyTo: string | null;
  replyText: string;
  posting: boolean;
  expandedReplies: Set<string>;
  toggleReplies: (commentId: string) => void;
  setReplyTo: (commentId: string | null) => void;
  setReplyText: (text: string) => void;
  post: (parentId: string | null, body: string, reset: () => void) => void;
  remove: (commentId: string) => void;
}

function buildTree(comments: Comment[]): Node[] {
  const map = new Map<string, Node>();
  comments.forEach((comment) => map.set(comment.comment_id, { ...comment, children: [] }));

  const roots: Node[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function CommentNode({
  node,
  depth,
  sellerId,
  currentUserId,
  isAdmin,
  replyTo,
  replyText,
  posting,
  expandedReplies,
  toggleReplies,
  setReplyTo,
  setReplyText,
  post,
  remove,
}: CommentNodeProps) {
  const isSeller = node.user_id === sellerId;
  const canDelete = node.user_id === currentUserId || isAdmin;

  return (
    <div className={cn(depth > 0 && "ml-4 border-l border-line pl-3 sm:ml-6")}>
      <div
        className={cn(
          "rounded-xl border p-3",
          isSeller ? "border-gold-200 bg-gold-50/60" : "border-line bg-white",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
              {initials(node.author?.name ?? "Student")}
            </span>
            <span className="truncate text-sm font-semibold text-ink">
              {node.author?.name ?? "Student"}
            </span>
            {isSeller && (
              <span className="badge border-gold-300 bg-gold-100 text-[10px] text-brand-800">
                Seller
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-muted">
            {formatRelative(node.created_at)}
          </span>
        </div>

        <p className="mt-2 whitespace-pre-line break-words text-sm text-ink">
          {node.text}
        </p>

        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
          <button
            type="button"
            onClick={() => {
              setReplyTo(replyTo === node.comment_id ? null : node.comment_id);
              setReplyText("");
            }}
            className="inline-flex items-center gap-1 hover:text-brand-700"
          >
            <Reply className="h-3.5 w-3.5" />
            Reply
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => remove(node.comment_id)}
              className="inline-flex items-center gap-1 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>

        {replyTo === node.comment_id && (
          <div className="mt-2 flex gap-2">
            <input
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder={`Reply to ${node.author?.name ?? "student"}…`}
              className="input"
              maxLength={1000}
            />
            <button
              type="button"
              disabled={posting || !replyText.trim()}
              onClick={() => post(node.comment_id, replyText, () => setReplyText(""))}
              className="btn-primary shrink-0"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </button>
          </div>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => toggleReplies(node.comment_id)}
            aria-expanded={expandedReplies.has(node.comment_id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
          >
            {expandedReplies.has(node.comment_id) ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Hide replies</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> View {node.children.length} {node.children.length === 1 ? "reply" : "replies"}</>
            )}
          </button>
          {expandedReplies.has(node.comment_id) && (
            <div className="mt-2 space-y-2">
              {node.children.map((child) => (
                <CommentNode
                  key={child.comment_id}
                  node={child}
                  depth={depth + 1}
                  sellerId={sellerId}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  replyTo={replyTo}
                  replyText={replyText}
                  posting={posting}
                  expandedReplies={expandedReplies}
                  toggleReplies={toggleReplies}
                  setReplyTo={setReplyTo}
                  setReplyText={setReplyText}
                  post={post}
                  remove={remove}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CommentThread({
  listingId,
  sellerId,
  currentUserId,
  isAdmin,
  initialComments,
}: Props) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(() => new Set());
  const [visibleRootCount, setVisibleRootCount] = useState(5);

  const tree = useMemo(() => buildTree(comments), [comments]);
  const visibleRoots = tree.slice(0, visibleRootCount);

  function toggleReplies(commentId: string) {
    setExpandedReplies((previous) => {
      const next = new Set(previous);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  async function post(parentId: string | null, body: string, reset: () => void) {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, text: body.trim(), parentId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not post comment");
      }

      setComments((prev) => [
        ...prev,
        {
          comment_id: payload.data.commentId,
          listing_id: listingId,
          user_id: currentUserId,
          parent_id: parentId,
          text: body.trim(),
          created_at: new Date().toISOString(),
          author: {
            user_id: currentUserId,
            name: "You",
            program: null,
            year_level: null,
          },
        },
      ]);
      if (parentId) {
        setExpandedReplies((previous) => new Set(previous).add(parentId));
      } else {
        setVisibleRootCount((count) => Math.max(count, tree.length + 1));
      }
      reset();
      setReplyTo(null);
      toast.success("Posted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post comment");
    } finally {
      setPosting(false);
    }
  }

  async function remove(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete comment");
      return;
    }
    setComments((prev) => prev.filter((comment) => comment.comment_id !== commentId));
    toast.success("Comment removed");
  }

  return (
    <section className="card p-4" aria-label="Questions and answers">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
        <MessageSquare className="h-5 w-5 text-brand-600" />
        Q&amp;A
        <span className="text-sm font-normal text-muted">({comments.length})</span>
      </h2>
      <p className="mt-1 text-xs text-muted">
        Ask about sizing, condition, or meetup details. Replies are public.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ask the seller a question…"
          className="input"
          maxLength={1000}
        />
        <button
          type="button"
          disabled={posting || !text.trim()}
          onClick={() => post(null, text, () => setText(""))}
          className="btn-primary shrink-0"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {tree.length === 0 ? (
          <p className="rounded-xl bg-brand-50/50 px-4 py-6 text-center text-sm text-muted">
            No questions yet. Be the first to ask.
          </p>
        ) : (
          visibleRoots.map((node) => (
            <CommentNode
              key={node.comment_id}
              node={node}
              depth={0}
              sellerId={sellerId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              replyTo={replyTo}
              replyText={replyText}
              posting={posting}
              expandedReplies={expandedReplies}
              toggleReplies={toggleReplies}
              setReplyTo={setReplyTo}
              setReplyText={setReplyText}
              post={post}
              remove={remove}
            />
          ))
        )}
        {visibleRootCount < tree.length && (
          <button
            type="button"
            onClick={() => setVisibleRootCount((count) => count + 5)}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition hover:border-brand-200 hover:bg-brand-50/50"
          >
            <ChevronDown className="h-4 w-4" />
            View {Math.min(5, tree.length - visibleRootCount)} more {tree.length - visibleRootCount === 1 ? "comment" : "comments"}
          </button>
        )}
      </div>
    </section>
  );
}
