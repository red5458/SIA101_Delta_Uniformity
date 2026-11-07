"use client";

import Link from "next/link";
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

const NAV = [
  { href: "/browse", label: "Browse", icon: Store },
  { href: "/wishlist", label: "Wishlist", icon: Bookmark },
  { href: "/sell/new", label: "Sell", icon: PlusCircle },
  { href: "/dashboard", label: "My Listings", icon: LayoutDashboard },
];

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
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
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full border border-line bg-white px-2 py-1.5 transition hover:border-brand-200"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {initials(profile.name)}
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
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-4 py-3 md:hidden">
          <div className="grid gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            {profile.is_admin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-brand-50"
              >
                <Shield className="h-4 w-4" />
                Admin panel
              </Link>
            )}
            <button
              type="button"
              onClick={signOut}
              disabled={pending}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
