import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Sign in | Uniformity" };

export default async function LoginPage() {
  const session = await getSession();
  if (session.authUser && session.profile?.is_verified) redirect("/browse");
  if (session.authUser && session.profile?.is_suspended) redirect("/suspended");

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted">
        Sign in with your verified BU student account.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
