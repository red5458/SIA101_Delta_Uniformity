import Link from "next/link";
import { BadgeCheck, Settings2, ShieldCheck } from "lucide-react";
import { ProfileForm } from "@/components/auth/profile-form";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { requireVerifiedUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { DEPARTMENT_LABELS } from "@/lib/constants";

export const metadata = { title: "Profile | Uniformity" };

export default async function ProfilePage() {
  const session = await requireVerifiedUser();
  const profile = session.profile;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Your profile</h1>
          <p className="mt-1 text-sm text-muted">
            This is what buyers see on your verified seller card.
          </p>
        </div>
        <Link href="/settings" className="btn-secondary shrink-0 px-3 py-2 text-xs"><Settings2 className="h-4 w-4" /> Settings</Link>
      </div>

      <div className="card mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified BU Student
          </span>
          {profile.is_admin && (
            <span className="badge border-brand-200 bg-brand-50 text-brand-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrator
            </span>
          )}
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Student email</dt>
            <dd className="break-all font-medium text-ink">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Department</dt>
            <dd className="font-medium text-ink">
              {profile.department ? DEPARTMENT_LABELS[profile.department] : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Program · Year</dt>
            <dd className="font-medium text-ink">
              {profile.program ?? "—"} · {profile.year_level ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Member since</dt>
            <dd className="font-medium text-ink">{formatDate(profile.created_at)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5">
        <InstallPrompt />
      </div>

      <div className="mt-5">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
