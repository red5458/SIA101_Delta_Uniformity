import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gmail API delivery is the production OTP path, so the OAuth exchange and the
 * MIME construction are tested here with a stubbed fetch. No network calls and
 * no real credentials are used.
 */
const baseEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/test",
  JWT_ACCESS_SECRET: "a".repeat(40),
  JWT_REFRESH_SECRET: "b".repeat(40),
  EMAIL_MODE: "gmail",
  MAIL_FROM: "Uniformity <sender@gmail.com>",
  GMAIL_USER: "sender@gmail.com",
  GMAIL_CLIENT_ID: "client-id",
  GMAIL_CLIENT_SECRET: "client-secret",
  GMAIL_REFRESH_TOKEN: "refresh-token",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
};

interface Call {
  url: string;
  init: RequestInit;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(
  handler: (url: string, init: RequestInit, attempt: number) => Response,
) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return handler(url, init, calls.length);
  });
  return calls;
}

function decodeRaw(init: RequestInit) {
  const body = JSON.parse(String(init.body)) as { raw: string };
  return Buffer.from(body.raw, "base64url").toString("utf8");
}

beforeEach(() => {
  vi.resetModules();
  Object.assign(process.env, baseEnv);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Gmail API OTP delivery", () => {
  it("exchanges the refresh token and posts a multipart OTP message", async () => {
    const calls = stubFetch((url) => {
      if (url.includes("oauth2.googleapis.com")) {
        return json({ access_token: "access-1", expires_in: 3600 });
      }
      return json({ id: "message-1" });
    });

    const { sendVerificationEmail } = await import("../src/config/mailer");
    await sendVerificationEmail("student@bicol-u.edu.ph", "654321");

    expect(calls).toHaveLength(2);

    const [tokenCall, sendCall] = calls as [Call, Call];
    expect(tokenCall.url).toContain("oauth2.googleapis.com/token");
    const tokenBody = String(tokenCall.init.body);
    expect(tokenBody).toContain("grant_type=refresh_token");
    expect(tokenBody).toContain("client_id=client-id");

    expect(sendCall.url).toContain("/gmail/v1/users/me/messages/send");
    const headers = sendCall.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-1");
    expect(headers["Content-Type"]).toBe("application/json");

    const mime = decodeRaw(sendCall.init);
    expect(mime).toContain("To: student@bicol-u.edu.ph");
    expect(mime).toContain("From: Uniformity <sender@gmail.com>");
    expect(mime).toContain("Subject: Your Uniformity verification code");
    expect(mime).toContain("multipart/alternative");
    expect(mime).toContain('charset="UTF-8"');
  });

  it("reuses the cached access token for consecutive sends", async () => {
    const calls = stubFetch((url) =>
      url.includes("oauth2.googleapis.com")
        ? json({ access_token: "access-1", expires_in: 3600 })
        : json({ id: "message" }),
    );

    const { sendVerificationEmail } = await import("../src/config/mailer");
    await sendVerificationEmail("one@bicol-u.edu.ph", "111111");
    await sendVerificationEmail("two@bicol-u.edu.ph", "222222");

    const tokenCalls = calls.filter((call) =>
      call.url.includes("oauth2.googleapis.com"),
    );
    expect(tokenCalls).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });

  it("refreshes the token and retries once after a 401", async () => {
    let sends = 0;
    const calls = stubFetch((url) => {
      if (url.includes("oauth2.googleapis.com")) {
        const access = calls.filter((call) =>
          call.url.includes("oauth2.googleapis.com"),
        ).length;
        return json({ access_token: `access-${access}`, expires_in: 3600 });
      }
      sends += 1;
      return sends === 1 ? json({ error: { message: "Expired" } }, 401) : json({ id: "ok" });
    });

    const { sendVerificationEmail } = await import("../src/config/mailer");
    await sendVerificationEmail("student@bicol-u.edu.ph", "333333");

    const tokenCalls = calls.filter((call) =>
      call.url.includes("oauth2.googleapis.com"),
    );
    expect(tokenCalls).toHaveLength(2);
    const retryHeaders = calls.at(-1)!.init.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer access-2");
  });

  it("surfaces a revoked refresh token with an actionable message", async () => {
    stubFetch(() => json({ error: "invalid_grant" }, 400));

    const { sendVerificationEmail } = await import("../src/config/mailer");
    await expect(
      sendVerificationEmail("student@bicol-u.edu.ph", "444444"),
    ).rejects.toThrow(/invalid_grant[\s\S]*refresh token/i);
  });
});

describe("console mode", () => {
  it("does not call fetch", async () => {
    process.env.EMAIL_MODE = "console";
    const calls = stubFetch(() => json({}));

    const { sendVerificationEmail } = await import("../src/config/mailer");
    await sendVerificationEmail("student@bicol-u.edu.ph", "555555");

    expect(calls).toHaveLength(0);
  });
});
