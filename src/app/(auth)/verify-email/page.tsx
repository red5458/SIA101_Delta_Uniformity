import Link from "next/link";
import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth/verify-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Verify email | Uniformity" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const session = await getSession();
  if (session.authUser && session.profile?.is_verified) redirect("/browse");

  if (!email) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Email required</h1>
        <p className="mt-2 text-sm text-muted">
          Start from the registration page so we know where to send your code.
        </p>
        <Link href="/register" className="btn-primary mt-5">
          Create an account
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Verify your email</h1>
      <p className="mt-1.5 text-sm text-muted">
        Enter the 6-digit code we sent to your student inbox. The code is single-use
        and expires quickly.
      </p>
      <div className="mt-6">
        <VerifyForm email={email} />
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Wrong email?{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          Register again
        </Link>
      </p>
    </div>
  );
}
