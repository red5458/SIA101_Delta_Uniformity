import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Create account | Uniformity" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session.authUser && session.profile?.is_verified) redirect("/browse");

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Join us</h1>
      <p className="mt-1.5 text-sm text-muted">
        Students only. We&apos;ll email a 6-digit code to verify your BU account.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
