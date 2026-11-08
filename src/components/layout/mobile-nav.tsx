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
  const activeIndex = ITEMS.findIndex((item) => pathname === item.href);
  const indicatorIndex = activeIndex < 0 ? 0 : activeIndex;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="relative grid grid-cols-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-0 w-1/4 rounded-xl bg-brand-50 transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(${indicatorIndex * 100}%)` }}
        />
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (active || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                window.dispatchEvent(new CustomEvent("uniformity:route-transition"));
              }}
              className={cn(
                "relative z-10 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200",
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
