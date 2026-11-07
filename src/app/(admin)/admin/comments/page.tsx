import Link from "next/link";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminComments } from "@/lib/data/admin";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Moderate comments | Uniformity" };

export default async function AdminCommentsPage() {
  await requireAdmin();
  const comments = await listAdminComments();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Comment moderation</h1>
      <p className="mt-1 text-sm text-muted">
        Remove inappropriate questions or replies. {comments.length} recent comment
        {comments.length === 1 ? "" : "s"} shown.
      </p>

      <div className="mt-4 space-y-2.5">
        {comments.length === 0 ? (
          <div className="card px-4 py-10 text-center text-sm text-muted">
            No comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <article key={comment.comment_id} className="card p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {comment.author?.name ?? "Student"}
                  </p>
                  <p className="text-xs text-muted">
                    on{" "}
                    <Link
                      href={`/listings/${comment.listing_id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {comment.listing?.title ?? "listing"}
                    </Link>{" "}
                    · {formatRelative(comment.created_at)}
                  </p>
                </div>
                <AdminDeleteButton
                  endpoint={`/api/admin/comments/${comment.comment_id}`}
                  confirmText="Delete this comment? Replies to it will also be removed."
                />
              </div>
              <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-brand-50/50 px-3 py-2 text-sm text-ink">
                {comment.text}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
