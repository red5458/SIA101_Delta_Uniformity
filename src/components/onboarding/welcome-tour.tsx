"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Check,
  MessageCircle,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

interface TourStep {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  tip?: string;
}

const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    eyebrow: "Quick tour",
    title: "Welcome to Uniformity",
    body: "This is the BU Polangui marketplace for pre-loved uniforms, department shirts, and course equipment. Here is a 30-second walkthrough of how it works.",
    tip: "Everything is arranged face to face on campus. No cart, no checkout, no shipping.",
  },
  {
    icon: Store,
    eyebrow: "Step 1 of 5",
    title: "Browse the marketplace",
    body: "Filter listings by department, category, size, condition, and price. Every seller is a verified BU student, so you know who you are meeting.",
  },
  {
    icon: Bookmark,
    eyebrow: "Step 2 of 5",
    title: "Save what interests you",
    body: "Tap the bookmark on any listing to keep it in your Wishlist. Sellers can see how many students saved an item, which helps them gauge interest.",
    tip: "Your saved items stay private to you — only the count is shown to the seller.",
  },
  {
    icon: MessageCircle,
    eyebrow: "Step 3 of 5",
    title: "Ask before you meet",
    body: "Leave a public question on the listing so other buyers benefit too, or send the seller a private message to agree on a time and place.",
  },
  {
    icon: PlusCircle,
    eyebrow: "Step 4 of 5",
    title: "Sell what you no longer need",
    body: "Post a listing from the Sell tab in under a minute. Add clear photos, set a fair price, then mark it Sold once the meetup is done.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Step 5 of 5",
    title: "Meet safely on campus",
    body: "Meet in a busy campus spot during daytime, inspect the item before paying, and settle up in cash. If something feels off, report it to an admin.",
    tip: "Keep conversations inside Uniformity so both sides have a record.",
  },
];

const DISMISS_CONFIRM = "You can replay this tour anytime from Settings.";

/**
 * First-run walkthrough. Visible while the signed-in student has no
 * `onboarding_completed_at`, so it follows them across devices instead of
 * living in localStorage. Finishing or skipping stamps the timestamp through
 * the BFF; a failed write never traps them behind the overlay.
 */
export function WelcomeTour({
  name,
  completedAt,
}: {
  name: string;
  completedAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const firstName = name.trim().split(/\s+/)[0] || name;

  useEffect(() => {
    if (completedAt) {
      setOpen(false);
      return;
    }
    // Let the feed paint first so the tour does not flash on top of a skeleton.
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [completedAt]);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const finish = useCallback(
    async (reason: "done" | "skip") => {
      setPending(true);
      setOpen(false);
      try {
        const response = await fetch("/api/profile/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error?.message ?? "Could not save your progress.",
          );
        }
        router.refresh();
        toast.success(
          reason === "done"
            ? `You're all set, ${firstName}. Happy swapping!`
            : DISMISS_CONFIRM,
        );
      } catch {
        // The tour is non-blocking: never keep a student behind a failed write.
        toast.error(
          "We could not save your progress. You can keep exploring normally.",
        );
      } finally {
        setPending(false);
      }
    },
    [firstName, router],
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        void finish("skip");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, finish]);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;
  const body = step === 0 ? `Hi ${firstName}! ${current.body}` : current.body;

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm animate-fade-in">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-title"
        aria-describedby="welcome-tour-body"
        className="relative my-auto max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-white p-5 shadow-2xl animate-fade-up sm:p-6"
      >
        <button
          type="button"
          onClick={() => void finish("skip")}
          disabled={pending}
          aria-label="Skip the tour"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-50 hover:text-ink disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="h-6 w-6" aria-hidden />
        </span>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          {current.eyebrow}
        </p>
        <h2
          id="welcome-tour-title"
          className="mt-1 font-display text-xl font-bold text-ink"
        >
          {current.title}
        </h2>
        <p
          id="welcome-tour-body"
          className="mt-2 text-sm leading-relaxed text-muted"
        >
          {body}
        </p>

        {current.tip && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-gold-100/70 px-3 py-2 text-xs leading-relaxed text-gold-800">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {current.tip}
          </p>
        )}

        <div
          className="mt-5 flex items-center gap-1.5"
          role="group"
          aria-label={`Step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((tourStep, index) => (
            <span
              key={tourStep.title}
              aria-hidden
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index <= step ? "bg-brand-600" : "bg-line"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void finish("skip")}
            disabled={pending}
            className="text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={pending}
                className="btn-secondary text-sm"
              >
                Back
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={() => {
                if (last) void finish("done");
                else setStep((value) => value + 1);
              }}
              disabled={pending}
              className="btn-primary text-sm"
            >
              {last ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Start browsing
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
