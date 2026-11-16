import { describe, expect, it } from "vitest";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  verifySchema,
} from "../src/modules/auth/auth.schema";
import { commentSchema } from "../src/modules/comments/comments.schema";
import {
  deleteAccountSchema,
  onboardingSchema,
} from "../src/modules/profile/profile.schema";
import {
  listingPhotoSchema,
  listingSchema,
} from "../src/modules/listings/listings.schema";
import { sellerIdSchema } from "../src/modules/sellers/sellers.schema";
import {
  conversationIdSchema,
  messageIdSchema,
  messageQuerySchema,
} from "../src/modules/chat/chat.schema";

const validRegistration = {
  name: "Juan Dela Cruz",
  email: "Juan.DelaCruz@bicol-u.edu.ph",
  password: "correct-horse",
  confirmPassword: "correct-horse",
  yearLevel: "3rd year",
  department: "CSD",
  program: "BSIT",
  contactMobile: "09171234567",
  contactMessenger: "",
};

const validListing = {
  title: "CSD department shirt",
  description: "Barely used, size M, washed once.",
  price: 350,
  itemType: "Uniform",
  categoryId: "b5d31ea5-0091-4c39-8a3d-affc8592d351",
  condition: "Good",
  size: "M",
  measurements: "",
  department: "CSD",
  photos: [
    {
      url: "https://res.cloudinary.com/demo/image/upload/v1/uniformity/u/l.jpg",
      key: "uniformity/u/l",
    },
  ],
};

describe("BU email validation", () => {
  it("accepts and normalizes a bicol-u address", () => {
    expect(emailSchema.parse("  Juan.DelaCruz@Bicol-U.edu.ph ")).toBe(
      "juan.delacruz@bicol-u.edu.ph",
    );
  });

  it("rejects other domains", () => {
    expect(emailSchema.safeParse("juan@gmail.com").success).toBe(false);
    expect(emailSchema.safeParse("juan@bicol-u.edu.ph.evil.com").success).toBe(
      false,
    );
  });
});

describe("registerSchema", () => {
  it("accepts a complete BU student registration", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, password: "short", confirmPassword: "short" })
        .success,
    ).toBe(false);
  });
});

describe("login and OTP", () => {
  it("requires a password", () => {
    expect(
      loginSchema.safeParse({ email: "a@bicol-u.edu.ph", password: "" }).success,
    ).toBe(false);
  });

  it("only accepts six digits for OTP", () => {
    expect(
      verifySchema.safeParse({ email: "a@bicol-u.edu.ph", otp: "123456" }).success,
    ).toBe(true);
    expect(
      verifySchema.safeParse({ email: "a@bicol-u.edu.ph", otp: "12345" }).success,
    ).toBe(false);
    expect(
      verifySchema.safeParse({ email: "a@bicol-u.edu.ph", otp: "abcdef" }).success,
    ).toBe(false);
  });
});

describe("listing photos", () => {
  it("accepts a Cloudinary URL", () => {
    expect(
      listingPhotoSchema.safeParse({
        url: "https://res.cloudinary.com/demo/image/upload/v1/uniformity/u/x.jpg",
        key: "uniformity/u/x",
      }).success,
    ).toBe(true);
  });

  it("rejects a non-Cloudinary remote URL", () => {
    expect(
      listingPhotoSchema.safeParse({
        url: "https://example.com/x.jpg",
        key: "uniformity/u/x",
      }).success,
    ).toBe(false);
  });

  it("accepts local development keys that point at /uploads", () => {
    expect(
      listingPhotoSchema.safeParse({
        url: "/uploads/u/x.jpg",
        key: "local:u/x.jpg",
      }).success,
    ).toBe(true);
  });

  it("rejects a local key with a remote URL", () => {
    expect(
      listingPhotoSchema.safeParse({
        url: "https://example.com/x.jpg",
        key: "local:u/x.jpg",
      }).success,
    ).toBe(false);
  });
});

describe("listingSchema", () => {
  it("accepts a valid listing", () => {
    expect(listingSchema.safeParse(validListing).success).toBe(true);
  });

  it("requires at least one photo", () => {
    expect(
      listingSchema.safeParse({ ...validListing, photos: [] }).success,
    ).toBe(false);
  });

  it("caps photos at six", () => {
    const photos = Array.from({ length: 7 }, (_, index) => ({
      url: `https://res.cloudinary.com/demo/image/upload/v1/uniformity/u/${index}.jpg`,
      key: `uniformity/u/${index}`,
    }));
    expect(listingSchema.safeParse({ ...validListing, photos }).success).toBe(
      false,
    );
  });

  it("rejects an unknown department", () => {
    expect(
      listingSchema.safeParse({ ...validListing, department: "LAW" }).success,
    ).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("accepts marking the tour completed or replaying it", () => {
    expect(onboardingSchema.safeParse({ completed: true }).success).toBe(true);
    expect(onboardingSchema.safeParse({ completed: false }).success).toBe(true);
  });

  it("rejects a missing or non-boolean flag", () => {
    expect(onboardingSchema.safeParse({}).success).toBe(false);
    expect(onboardingSchema.safeParse({ completed: "yes" }).success).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("requires the current password", () => {
    expect(deleteAccountSchema.safeParse({ password: "correct-horse" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ password: "" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
  });
});

describe("sellerIdSchema", () => {
  it("accepts a user uuid", () => {
    expect(
      sellerIdSchema.safeParse("b5d31ea5-0091-4c39-8a3d-affc8592d351").success,
    ).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    expect(sellerIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("commentSchema", () => {
  it("trims text", () => {
    const parsed = commentSchema.parse({
      listingId: "b5d31ea5-0091-4c39-8a3d-affc8592d351",
      text: "  Still available?  ",
    });
    expect(parsed.text).toBe("Still available?");
  });

  it("rejects empty text", () => {
    expect(
      commentSchema.safeParse({
        listingId: "b5d31ea5-0091-4c39-8a3d-affc8592d351",
        text: "   ",
      }).success,
    ).toBe(false);
  });
});

describe("chat ids", () => {
  it("accepts uuids for conversations and messages", () => {
    expect(
      conversationIdSchema.safeParse("b5d31ea5-0091-4c39-8a3d-affc8592d351").success,
    ).toBe(true);
    expect(
      messageIdSchema.safeParse("6d1c0f6e-2f4d-4e0b-9a51-5aa6f78b1c11").success,
    ).toBe(true);
  });

  it("rejects anything that is not a uuid", () => {
    expect(conversationIdSchema.safeParse("123").success).toBe(false);
    expect(messageIdSchema.safeParse("delete-everything").success).toBe(false);
  });
});

describe("messageQuerySchema", () => {
  it("accepts a single cursor", () => {
    const id = "b5d31ea5-0091-4c39-8a3d-affc8592d351";
    expect(messageQuerySchema.safeParse({ beforeId: id }).success).toBe(true);
    expect(messageQuerySchema.safeParse({ afterId: id }).success).toBe(true);
    expect(messageQuerySchema.safeParse({}).success).toBe(true);
  });

  it("rejects two cursors at once", () => {
    const id = "b5d31ea5-0091-4c39-8a3d-affc8592d351";
    expect(messageQuerySchema.safeParse({ beforeId: id, afterId: id }).success).toBe(false);
  });
});
