import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/data/notifications";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, unreadCount] = await Promise.all([
    requireVerifiedUser(),
    getUnreadCount(),
  ]);

  return (
    <div className="min-h-svh bg-cream">
      <Header profile={session.profile} unreadCount={unreadCount} />
      <main className="container-page relative pb-24 pt-5 md:pb-10">
        {children}
      </main>
      <MobileNav />
      <WelcomeTour
        name={session.profile.name}
        completedAt={session.profile.onboarding_completed_at}
      />
    </div>
  );
}
