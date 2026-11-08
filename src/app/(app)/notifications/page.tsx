import { NotificationList } from "@/components/notifications/notification-list";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getNotifications } from "@/lib/data/notifications";

export const metadata = { title: "Notifications | Uniformity" };

export default async function NotificationsPage() {
  await requireVerifiedUser();
  const page = await getNotifications();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-ink">Notifications</h1>
      <p className="mt-1 text-sm text-muted">
        Questions on your listings, private messages, and moderation updates.
      </p>

      <NotificationList
        initialItems={page.items}
        initialCursor={page.nextCursor}
        initialUnread={page.unreadCount}
      />
    </div>
  );
}
