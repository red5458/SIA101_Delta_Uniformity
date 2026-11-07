import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Account suspended | Uniformity" };

export default async function SuspendedPage() {
  const session = await getSession();
  if (!session.authUser) redirect("/login");
  if (!session.profile?.is_suspended) redirect("/browse");

  return (
    <div className="grid min-h-dvh place-items-center bg-cream px-4">
      <div className="card max-w-md p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          Account suspended
        </h1>
        <p className="mt-2 text-sm text-muted">
          An administrator has suspended this account. You can still sign out. If you
          believe this is a mistake, contact the Uniformity admin team through your BU
          email.
        </p>
        <div className="mt-5 flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
