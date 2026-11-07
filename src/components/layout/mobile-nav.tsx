"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, LayoutDashboard, PlusCircle, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/browse", label: "Browse", icon: Store },
  { href: "/wishlist", label: "Saved", icon: Bookmark },
  { href: "/sell/new", label: "Sell", icon: PlusCircle },
  { href: "/dashboard", label: "Mine", icon: LayoutDashboard },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-brand-700" : "text-muted",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
