import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";
import { ChatUnreadProvider } from "@/components/chat/chat-unread-provider";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getUnreadMessageCount } from "@/lib/data/chat";
import { getUnreadCount } from "@/lib/data/notifications";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, unreadCount, chatUnreadCount] = await Promise.all([
    requireVerifiedUser(),
    getUnreadCount(),
    getUnreadMessageCount(),
  ]);

  return (
    <div className="min-h-svh bg-cream">
      <ChatUnreadProvider initialCount={chatUnreadCount}>
        <Header profile={session.profile} unreadCount={unreadCount} />
        <main className="container-page relative pb-24 pt-5 md:pb-10">
          {children}
        </main>
        <MobileNav />
        <WelcomeTour
          name={session.profile.name}
          completedAt={session.profile.onboarding_completed_at}
        />
      </ChatUnreadProvider>
    </div>
  );
}
