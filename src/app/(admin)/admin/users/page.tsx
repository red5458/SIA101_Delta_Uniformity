import { BadgeCheck, ShieldCheck } from "lucide-react";
import { SuspendButton } from "@/components/admin/suspend-button";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminUsers } from "@/lib/data/admin";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Manage users | Uniformity" };

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const users = await listAdminUsers();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">User management</h1>
      <p className="mt-1 text-sm text-muted">
        Suspend accounts that break community rules. Suspended users cannot post,
        comment, or save listings.
      </p>

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-brand-50/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Student</th>
                <th className="px-3 py-2.5 font-semibold">Program</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Joined</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="flex items-center gap-1.5 font-medium text-ink">
                        {user.name}
                        {user.is_admin && (
                          <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                        )}
                      </p>
                      <p className="max-w-[220px] truncate text-xs text-muted">
                        {user.email}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      <p className="text-ink">{user.program ?? "—"}</p>
                      <p>
                        {user.department ?? "—"} · {user.year_level ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {user.is_verified && (
                          <span className="badge border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                            <BadgeCheck className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                        {user.is_suspended && (
                          <span className="badge border-red-200 bg-red-50 text-[10px] text-red-600">
                            Suspended
                          </span>
                        )}
                        {!user.is_verified && !user.is_suspended && (
                          <span className="badge border-line bg-brand-50 text-[10px] text-muted">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      {user.user_id === session.authUser.id ? (
                        <span className="text-xs text-muted">You</span>
                      ) : (
                        <SuspendButton userId={user.user_id} suspended={user.is_suspended} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
