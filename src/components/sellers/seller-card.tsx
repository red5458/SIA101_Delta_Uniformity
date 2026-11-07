import { BadgeCheck, GraduationCap, Mail, MessageCircle, Phone } from "lucide-react";
import { initials } from "@/lib/utils";
import { DEPARTMENT_LABELS } from "@/lib/constants";
import type { SellerSummary } from "@/types/db";

function messengerHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "").trim();
  return `https://m.me/${handle}`;
}

export function SellerCard({ seller }: { seller: SellerSummary | null }) {
  if (!seller) {
    return (
      <section className="card p-4 text-sm text-muted">
        Seller profile unavailable.
      </section>
    );
  }

  return (
    <section className="card overflow-hidden" aria-label="Verified seller profile">
      <div className="h-16 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600" />
      <div className="-mt-8 px-4 pb-4">
        <div className="flex items-end justify-between gap-3">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border-4 border-white bg-gold-300 text-xl font-black text-brand-900 shadow-sm">
            {initials(seller.name)}
          </span>
          <span className="badge mb-1 border-emerald-200 bg-emerald-50 text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified BU Student
          </span>
        </div>

        <h2 className="mt-2.5 font-display text-xl font-bold text-ink">{seller.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            {seller.program ?? "Program not set"}
          </span>
          <span aria-hidden>·</span>
          <span>{seller.year_level ?? "Year level not set"}</span>
          {seller.department && (
            <>
              <span aria-hidden>·</span>
              <span>{DEPARTMENT_LABELS[seller.department]}</span>
            </>
          )}
        </div>

        <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">
          Transactions happen through an on-campus meetup and cash payment. Message
          the seller to agree on a safe public spot inside BU Polangui.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <a
            href={`mailto:${seller.contact_email ?? ""}`}
            className={seller.contact_email ? "btn-secondary text-xs" : "btn-secondary text-xs pointer-events-none opacity-40"}
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
          <a
            href={`tel:${seller.contact_mobile ?? ""}`}
            className={seller.contact_mobile ? "btn-secondary text-xs" : "btn-secondary text-xs pointer-events-none opacity-40"}
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
          <a
            href={
              seller.contact_messenger
                ? messengerHref(seller.contact_messenger)
                : "https://m.me/"
            }
            target="_blank"
            rel="noreferrer noopener"
            className={seller.contact_messenger ? "btn-primary text-xs" : "btn-primary text-xs pointer-events-none opacity-40"}
          >
            <MessageCircle className="h-4 w-4" />
            Messenger
          </a>
        </div>
      </div>
    </section>
  );
}
