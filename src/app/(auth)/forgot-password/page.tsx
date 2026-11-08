import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot password | Uniformity" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted">We&apos;ll send a single-use code to your verified BU student email.</p>
      <div className="mt-6"><ForgotPasswordForm /></div>
    </div>
  );
}
