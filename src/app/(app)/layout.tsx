import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { requireVerifiedUser } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireVerifiedUser();

  return (
    <div className="min-h-svh bg-cream">
      <Header profile={session.profile} />
      <main className="container-page relative pb-24 pt-5 md:pb-10">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
