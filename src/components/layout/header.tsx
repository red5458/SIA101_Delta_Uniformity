"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Bookmark,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Shield,
  Store,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";
import type { Profile } from "@/types/db";
import { BrandLogo } from "@/components/layout/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { departmentAccent } from "@/lib/constants";

const NAV = [
  { href: "/browse", label: "Browse", icon: Store },
  { href: "/wishlist", label: "Wishlist", icon: Bookmark },
  { href: "/sell/new", label: "Sell", icon: PlusCircle },
  { href: "/dashboard", label: "My Listings", icon: LayoutDashboard },
];

export function Header({
  profile,
  unreadCount = 0,
}: {
  profile: Profile;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const profileAccent = departmentAccent(profile.department);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear the client-side session state even if the request fails.
    }
    setOpen(false);
    toast.success("Signed out");
    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <header
      className={cn(
        "sticky top-0 border-b border-line bg-cream/90 backdrop-blur",
        open ? "z-50" : "z-40",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/browse" className="flex items-center gap-2.5">
          <BrandLogo className="h-9 w-9" />
          <span className="font-display text-xl font-bold tracking-tight text-brand-900">
            Uniformity
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "btn-ghost px-3",
                pathname === item.href && "bg-brand-50 text-brand-800",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {profile.is_admin && (
            <Link
              href="/admin"
              className={cn(
                "btn-ghost px-3",
                pathname.startsWith("/admin") && "bg-brand-50 text-brand-800",
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell initialCount={unreadCount} />
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full border border-line bg-white px-2 py-1.5 transition hover:border-brand-200"
          >
            <span className={`relative grid h-7 w-7 place-items-center overflow-hidden rounded-full border-2 bg-brand-700 text-xs font-bold text-white ${profileAccent.avatar}`}>
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="" fill sizes="28px" className="object-cover" />
              ) : (
                initials(profile.name)
              )}
            </span>
            <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
              {profile.name.split(" ")[0]}
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            title="Sign out"
            aria-label="Sign out"
            className="btn-ghost hidden h-9 px-2 text-muted hover:text-red-600 md:inline-flex"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="btn-secondary h-9 w-9 !px-0 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-ink/30 backdrop-blur-[1px] animate-fade-in md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-0 rounded-b-2xl border-t border-line bg-white px-4 py-3 shadow-xl animate-menu-drop"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-[transform,background-color] duration-100 hover:bg-brand-50 active:scale-[0.98] active:bg-brand-100"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-[transform,background-color] duration-100 hover:bg-brand-50 active:scale-[0.98] active:bg-brand-100"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            {profile.is_admin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-[transform,background-color] duration-100 hover:bg-brand-50 active:scale-[0.98] active:bg-brand-100"
              >
                <Shield className="h-4 w-4" />
                Admin panel
              </Link>
            )}
            <button
              type="button"
              onClick={signOut}
              disabled={pending}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-[transform,background-color] duration-100 hover:bg-red-50 active:scale-[0.98] active:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
          </div>
        </div>
      )}
    </header>
  );
}
