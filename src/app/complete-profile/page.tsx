import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileForm } from "@/components/auth/profile-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Complete your profile | Uniformity" };

export default async function CompleteProfilePage() {
  const session = await getSession();
  if (!session.authUser) redirect("/login");
  if (session.profile?.is_suspended) redirect("/suspended");
  if (!session.profile) redirect("/login");

  const complete =
    session.profile.is_verified &&
    session.profile.year_level &&
    session.profile.department &&
    session.profile.program;

  if (complete) redirect("/browse");

  return (
    <div className="container-page max-w-2xl py-10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">
            Complete your student profile
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            We need your program, year level, and contact details before you can buy or
            sell. Your email is already verified.
          </p>
        </div>
        <LogoutButton />
      </div>
      <ProfileForm profile={session.profile} redirectTo="/browse" />
    </div>
  );
}
