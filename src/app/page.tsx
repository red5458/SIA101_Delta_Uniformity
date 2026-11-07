import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  Camera,
  HandCoins,
  MessagesSquare,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { BrandLogo } from "@/components/layout/brand-logo";

const FEATURES = [
  {
    icon: BadgeCheck,
    title: "Institutional verification",
    body: "Sign-up is limited to @bicol-u.edu.ph emails with a 6-digit inbox code. Every seller card carries a Verified BU Student badge.",
  },
  {
    icon: Search,
    title: "Filter by what fits",
    body: "Browse only Active listings by department, category, size, condition, and price sort. Built mobile-first for hallway scrolling.",
  },
  {
    icon: Bookmark,
    title: "Wishlist, not a cart",
    body: "Save items you want to revisit. There is no checkout, no shipping status, and no payment middleman.",
  },
  {
    icon: MessagesSquare,
    title: "Public Q&A",
    body: "Ask about sizing or condition on the listing. Seller replies are highlighted with a Seller badge.",
  },
  {
    icon: Camera,
    title: "Cloud photo galleries",
    body: "Every listing supports up to six compressed photos stored on cloud media with CDN delivery.",
  },
  {
    icon: HandCoins,
    title: "Cash on campus",
    body: "Arrange a meetup inside BU Polangui and pay in cash. Simple, peer-to-peer, and transparent.",
  },
];

export default async function LandingPage() {
  const session = await getSession();
  const signedIn = Boolean(session.authUser && session.profile?.is_verified);

  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5 max-[380px]:gap-1.5">
            <BrandLogo className="h-9 w-9 max-[380px]:h-8 max-[380px]:w-8" />
            <span className="font-display text-xl font-bold text-brand-900 max-[380px]:text-lg">
              Uniformity
            </span>
          </div>
          <nav className="flex shrink-0 items-center gap-2 max-[380px]:gap-1">
            {signedIn ? (
              <Link href="/browse" className="btn-primary">
                Open marketplace
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost whitespace-nowrap max-[380px]:px-2 max-[380px]:py-2 max-[380px]:text-xs">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary whitespace-nowrap max-[380px]:px-2 max-[380px]:py-2 max-[380px]:text-xs">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-300/30 blur-3xl" />
        <div className="absolute -left-24 top-40 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />

        <div className="container-page relative grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="animate-fade-up">
            <span className="badge border-brand-200 bg-brand-50 text-brand-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Exclusive to BU Polangui students
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] text-ink sm:text-5xl lg:text-6xl">
              Pass it forward.
              <br />
              <span className="text-brand-700">Uniforms, shirts, and gear</span>
              <br />
              for the next batch.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
              Uniformity is a campus-only marketplace where upper-year students sell
              pre-loved uniforms, department shirts, and course equipment to lower-year
              students. Meet on campus. Pay in cash. No cart, no checkout.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={signedIn ? "/browse" : "/register"} className="btn-primary">
                {signedIn ? "Browse listings" : "Create student account"}
              </Link>
              <Link href={signedIn ? "/sell/new" : "/login"} className="btn-secondary">
                <Store className="h-4 w-4" />
                {signedIn ? "Sell an item" : "I already have an account"}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-brand-600" /> Verified student sellers
              </span>
              <span className="inline-flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-brand-600" /> Cash on meetup
              </span>
              <span className="inline-flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-brand-600" /> Wishlist saved to your profile
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm animate-fade-up">
            <div className="card overflow-hidden">
              <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500">
                <div className="absolute inset-0 grid place-items-center">
                  <div className="rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gold-200">
                      Sample listing
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold text-white">
                      CSD Department Shirt
                    </p>
                    <p className="mt-1 text-sm text-white/80">Size M · Like New</p>
                  </div>
                </div>
                <span className="badge absolute left-3 top-3 border-white/40 bg-white/90 text-ink">
                  Size M
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink">CSD Department Shirt</p>
                  <p className="font-bold text-brand-800">₱250</p>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                  <BadgeCheck className="h-4 w-4 text-brand-600" />
                  Verified seller · BSIT · 4th year
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium shadow-card sm:block">
              Meet at the library steps 🏫
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white py-14">
        <div className="container-page">
          <h2 className="font-display text-3xl font-bold text-ink">
            Everything a campus handover needs
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            Designed around the way BU Polangui students actually trade — not around a
            shopping cart.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-semibold text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page">
          <div className="card grid gap-6 p-6 sm:p-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">
                How a handover works
              </h2>
              <ol className="mt-4 space-y-3 text-sm text-muted">
                <li>
                  <strong className="text-ink">1. Browse or post.</strong> Sellers list
                  an item with photos, size, measurements, and condition.
                </li>
                <li>
                  <strong className="text-ink">2. Ask questions.</strong> Buyers use the
                  public Q&amp;A board. Seller replies are marked.
                </li>
                <li>
                  <strong className="text-ink">3. Save it.</strong> Wishlist items you
                  want to think about — no cart or checkout.
                </li>
                <li>
                  <strong className="text-ink">4. Meet on campus.</strong> Contact the
                  seller through the verified seller card and pay cash on meetup.
                </li>
              </ol>
            </div>
            <div className="rounded-2xl bg-brand-800 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-300">
                Reminder
              </p>
              <p className="mt-2 font-display text-2xl font-bold">
                There is no shipping and no online payment.
              </p>
              <p className="mt-3 text-sm text-brand-100">
                Uniformity does not process payments, track shipments, or hold funds.
                Always meet in a public campus spot and inspect the item before paying.
              </p>
              <Link
                href={signedIn ? "/browse" : "/register"}
                className="btn mt-5 bg-gold-300 text-brand-900 hover:bg-gold-200"
              >
                {signedIn ? "Find your next uniform" : "Join with your BU email"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-6">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-muted sm:flex-row">
          <p>Uniformity · Bicol University Polangui campus marketplace</p>
          <p>Built for students, by students. No cart. No checkout.</p>
        </div>
      </footer>
    </div>
  );
}
