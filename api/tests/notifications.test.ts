import { describe, expect, it } from "vitest";
import {
  notificationIdSchema,
  notificationListQuerySchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "../src/modules/notifications/notifications.schema";

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: {
    p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

describe("notificationListQuerySchema", () => {
  it("applies defaults for an empty query", () => {
    const parsed = notificationListQuerySchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.unread).toBe(false);
    expect(parsed.before).toBeUndefined();
  });

  it("coerces a string limit and accepts a cursor", () => {
    const parsed = notificationListQuerySchema.parse({
      limit: "50",
      before: "2026-11-08T10:00:00.000Z",
    });
    expect(parsed.limit).toBe(50);
    expect(parsed.before).toBe("2026-11-08T10:00:00.000Z");
  });

  it("rejects an out-of-range limit and a bogus cursor", () => {
    expect(notificationListQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(notificationListQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
    expect(notificationListQuerySchema.safeParse({ before: "yesterday" }).success).toBe(
      false,
    );
  });

  it("maps the unread flag from both string spellings", () => {
    expect(notificationListQuerySchema.parse({ unread: "1" }).unread).toBe(true);
    expect(notificationListQuerySchema.parse({ unread: "true" }).unread).toBe(true);
    expect(notificationListQuerySchema.parse({ unread: "0" }).unread).toBe(false);
    expect(notificationListQuerySchema.safeParse({ unread: "maybe" }).success).toBe(
      false,
    );
  });
});

describe("notificationIdSchema", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(
      notificationIdSchema.parse("b5d31ea5-0091-4c39-8a3d-affc8592d351"),
    ).toBe("b5d31ea5-0091-4c39-8a3d-affc8592d351");
    expect(notificationIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("pushSubscriptionSchema", () => {
  it("accepts a browser subscription", () => {
    const parsed = pushSubscriptionSchema.parse(validSubscription);
    expect(parsed.endpoint).toBe(validSubscription.endpoint);
    expect(parsed.keys.p256dh).toBe(validSubscription.keys.p256dh);
  });

  it("accepts an optional user agent", () => {
    const parsed = pushSubscriptionSchema.parse({
      ...validSubscription,
      userAgent: "Mozilla/5.0",
    });
    expect(parsed.userAgent).toBe("Mozilla/5.0");
  });

  it("rejects a non-URL endpoint and missing keys", () => {
    expect(
      pushSubscriptionSchema.safeParse({ ...validSubscription, endpoint: "not-a-url" })
        .success,
    ).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: validSubscription.endpoint,
        keys: { p256dh: "" },
      }).success,
    ).toBe(false);
  });
});

describe("pushUnsubscribeSchema", () => {
  it("requires a valid endpoint URL", () => {
    expect(
      pushUnsubscribeSchema.parse({ endpoint: validSubscription.endpoint }).endpoint,
    ).toBe(validSubscription.endpoint);
    expect(pushUnsubscribeSchema.safeParse({ endpoint: "" }).success).toBe(false);
  });
});
