"use client";

import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export function NavigationTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const hasMobileAppNav = ["/browse", "/wishlist", "/sell", "/dashboard", "/profile", "/listings", "/messages"]
    .some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const hasStickyHeader = hasMobileAppNav || pathname === "/";
  const blurBounds = hasMobileAppNav
    ? "top-16 bottom-[calc(3.8125rem+env(safe-area-inset-bottom))] md:bottom-0"
    : hasStickyHeader
      ? "top-16 bottom-0"
      : "top-0 bottom-0";
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [routeKey]);

  useEffect(() => {
    const handleRouteTransition = () => setPending(true);
    window.addEventListener("uniformity:route-transition", handleRouteTransition);
    return () => window.removeEventListener("uniformity:route-transition", handleRouteTransition);
  }, []);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (`${destination.pathname}?${destination.searchParams.toString()}` === routeKey) return;

    setPending(true);
  }

  function handleSubmit(event: FormEvent<HTMLDivElement>) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const destination = new URL(form.action, window.location.href);
    if (destination.pathname === "/browse" && form.method.toLowerCase() === "get") {
      setPending(true);
    }
  }

  return (
    <>
      <div
        key={pathname}
        onClickCapture={handleClick}
        onSubmitCapture={handleSubmit}
        className="animate-fade-in-slow"
      >
        {children}
      </div>
      {pending && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none fixed inset-x-0 z-30 bg-cream/65 backdrop-blur-[3px] animate-fade-in-slow ${blurBounds}`}
          />
          <div
            role="status"
            aria-label="Loading"
            className="pointer-events-none fixed inset-0 z-[60] grid place-items-center animate-fade-in-slow"
          >
          <LoaderCircle className="h-10 w-10 animate-spin text-brand-700" />
          </div>
        </>
      )}
    </>
  );
}
