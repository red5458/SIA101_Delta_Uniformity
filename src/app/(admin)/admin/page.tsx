import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MessageSquare,
  PackageCheck,
  Store,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/data/admin";

export const metadata = { title: "Admin overview | Uniformity" };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const stats = await getAdminStats();

  const cards = [
    {
      label: "Total registered users",
      value: stats.total_users,
      hint: `${stats.verified_users} verified`,
      icon: Users,
      tone: "bg-brand-50 text-brand-700",
    },
    {
      label: "Active listings",
      value: stats.active_listings,
      hint: "Visible in the feed",
      icon: Store,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Sold items",
      value: stats.sold_items,
      hint: "Completed handovers",
      icon: PackageCheck,
      tone: "bg-gold-50 text-gold-700",
    },
    {
      label: "Q&A comments",
      value: stats.total_comments,
      hint: "Across all listings",
      icon: MessageSquare,
      tone: "bg-brand-100 text-brand-800",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Admin overview</h1>
      <p className="mt-1 text-sm text-muted">
        Lightweight moderation for the Uniformity campus marketplace.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-4">
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${card.tone}`}>
              <card.icon className="h-4.5 w-4.5" />
            </span>
            <p className="mt-3 text-2xl font-bold text-ink">{card.value}</p>
            <p className="text-xs font-medium text-ink">{card.label}</p>
            <p className="mt-0.5 text-[11px] text-muted">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link href="/admin/listings" className="card flex items-center justify-between p-4 hover:border-brand-200">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-brand-600" />
            <div>
              <p className="font-semibold text-ink">Moderate listings</p>
              <p className="text-xs text-muted">Remove policy violations</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </Link>
        <Link href="/admin/users" className="card flex items-center justify-between p-4 hover:border-brand-200">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-brand-600" />
            <div>
              <p className="font-semibold text-ink">Manage users</p>
              <p className="text-xs text-muted">Suspend or reinstate accounts</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </Link>
        <Link href="/admin/comments" className="card flex items-center justify-between p-4 hover:border-brand-200">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-brand-600" />
            <div>
              <p className="font-semibold text-ink">Clean up comments</p>
              <p className="text-xs text-muted">Remove inappropriate Q&amp;A</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </Link>
      </div>

      <div className="card mt-5 p-4">
        <h2 className="font-semibold text-ink">Moderation notes</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>• Deleting a listing also removes its photos from cloud storage.</li>
          <li>• Suspended users stay on record but cannot post, save, or comment.</li>
          <li>• Verified numbers count accounts with confirmed BU email addresses.</li>
        </ul>
      </div>
    </div>
  );
}
