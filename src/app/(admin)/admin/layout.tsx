import Link from "next/link";
import { ArrowLeft, MessageSquare, Shield, Store, Users } from "lucide-react";
import { Header } from "@/components/layout/header";
import { requireAdmin } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/data/notifications";

const TABS = [
  { href: "/admin", label: "Overview", icon: Shield },
  { href: "/admin/listings", label: "Listings", icon: Store },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, unreadCount] = await Promise.all([
    requireAdmin(),
    getUnreadCount(),
  ]);

  return (
    <div className="min-h-dvh bg-cream">
      <Header profile={session.profile} unreadCount={unreadCount} />
      <div className="border-b border-line bg-white">
        <div className="container-page flex items-center gap-1 overflow-x-auto py-2">
          <Link href="/browse" className="btn-ghost mr-1 shrink-0 text-xs">
            <ArrowLeft className="h-4 w-4" />
            Marketplace
          </Link>
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-brand-50 hover:text-brand-800"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <main className="container-page py-6">{children}</main>
    </div>
  );
}
