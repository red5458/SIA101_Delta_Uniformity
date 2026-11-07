import Link from "next/link";
import { BadgeCheck, Bookmark, HandCoins, ShieldCheck, Store } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-400/20 blur-2xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-300 text-sm font-black text-brand-900">
            BU
          </span>
          <span className="font-display text-2xl font-bold">Uniformity</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Your campus marketplace, built for BU Polangui.
          </h1>
          <p className="mt-4 text-brand-100">
            Pass down uniforms, department shirts, and course equipment to the next
            batch. Meet on campus, pay in cash, no cart required.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <BadgeCheck className="h-5 w-5 text-gold-300" />
              Verified <strong>@bicol-u.edu.ph</strong> students only
            </li>
            <li className="flex items-center gap-3">
              <Store className="h-5 w-5 text-gold-300" />
              Every listing shows a verified seller card
            </li>
            <li className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-gold-300" />
              Save items to your wishlist instead of a cart
            </li>
            <li className="flex items-center gap-3">
              <HandCoins className="h-5 w-5 text-gold-300" />
              On-campus meetup + cash, always
            </li>
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-brand-200">
          <ShieldCheck className="h-4 w-4" />
          Institutional email verification keeps the community trusted.
        </p>
      </aside>

      <main className="flex items-center justify-center bg-cream px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-xs font-black text-gold-200">
              BU
            </span>
            <span className="font-display text-xl font-bold text-brand-900">
              Uniformity
            </span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
