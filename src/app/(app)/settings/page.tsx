import { BellRing, Eye, KeyRound, Palette, Settings2, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PushToggle } from "@/components/notifications/push-toggle";
import { AccountActions } from "@/components/settings/account-actions";
import { ActiveSessions } from "@/components/settings/active-sessions";
import { ContactVisibilityToggle } from "@/components/settings/contact-visibility-toggle";
import { DisplayPreferences } from "@/components/settings/display-preferences";
import { requireVerifiedUser } from "@/lib/auth/session";

export const metadata = { title: "Settings | Uniformity" };

export default async function SettingsPage() {
  const session = await requireVerifiedUser();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-ink">
        <Settings2 className="h-7 w-7 text-brand-600" />
        Settings
      </h1>
      <p className="mt-1 text-sm text-muted">Manage your privacy, appearance, accessibility, and account.</p>

      <section className="mt-5" aria-labelledby="notification-settings-heading">
        <h2 id="notification-settings-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <BellRing className="h-4 w-4 text-brand-600" /> Notifications
        </h2>
        <PushToggle />
      </section>

      <section className="mt-5" aria-labelledby="security-settings-heading">
        <h2 id="security-settings-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <KeyRound className="h-4 w-4 text-brand-600" /> Account security
        </h2>
        <ChangePasswordForm />
        <div className="mt-3"><ActiveSessions /></div>
      </section>

      <section className="mt-5" aria-labelledby="privacy-settings-heading">
        <h2 id="privacy-settings-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <Eye className="h-4 w-4 text-brand-600" /> Privacy
        </h2>
        <ContactVisibilityToggle initialValue={session.profile.show_contact_details} />
      </section>

      <section className="mt-5" aria-labelledby="display-settings-heading">
        <h2 id="display-settings-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <Palette className="h-4 w-4 text-brand-600" /> Appearance & accessibility
        </h2>
        <DisplayPreferences />
      </section>

      <section className="mt-5" aria-labelledby="account-actions-heading">
        <h2 id="account-actions-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldCheck className="h-4 w-4 text-brand-600" /> Account actions
        </h2>
        <AccountActions />
      </section>
    </div>
  );
}
