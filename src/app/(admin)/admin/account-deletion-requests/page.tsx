import Link from "next/link";
import { UserRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listAccountDeletionRequests } from "@/lib/data/admin";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Account deletion requests | Uniformity" };

export default async function AccountDeletionRequestsPage() {
  await requireAdmin();
  const requests = await listAccountDeletionRequests();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-ink">Account deletion requests</h1>
      <p className="mt-1 text-sm text-muted">Students keep access to their accounts until an administrator reviews and processes their request.</p>
      <div className="mt-4 space-y-2">
        {requests.length ? requests.map((request) => (
          <article key={request.request_id} className="card flex flex-wrap items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700"><UserRound className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <Link href={`/students/${request.user_id}`} className="block truncate text-sm font-semibold text-ink hover:text-brand-700">{request.name}</Link>
              <p className="truncate text-xs text-muted">{request.email}</p>
            </div>
            <time className="text-xs text-muted">Requested {formatDate(request.requested_at)}</time>
          </article>
        )) : <div className="card px-4 py-12 text-center text-sm text-muted">No pending account deletion requests.</div>}
      </div>
    </div>
  );
}
