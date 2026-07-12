import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from "~/lib/email/password-reset.server";

const originalApiKey = process.env.RESEND_API_KEY;
const originalEmailFrom = process.env.AUTH_EMAIL_FROM;

afterEach(() => {
  vi.restoreAllMocks();
  restoreEnv("RESEND_API_KEY", originalApiKey);
  restoreEnv("AUTH_EMAIL_FROM", originalEmailFrom);
});

describe("sendPasswordResetEmail", () => {
  it("sends a reset message through Resend without exposing the API key", async () => {
    process.env.RESEND_API_KEY = "re_test_secret";
    process.env.AUTH_EMAIL_FROM = "Pordee <no-reply@pordee.test>";
    expect(isPasswordResetEmailConfigured()).toBe(true);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await sendPasswordResetEmail({
      email: "user@pordee.test",
      resetUrl:
        "https://pordee.test/api/auth/reset-password/token?callbackURL=%2Freset-password&source=email",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.headers).toEqual({
      Authorization: "Bearer re_test_secret",
      "Content-Type": "application/json",
    });

    const payload = JSON.parse(String(init?.body)) as {
      from: string;
      html: string;
      text: string;
      to: string[];
    };
    expect(payload.from).toBe("Pordee <no-reply@pordee.test>");
    expect(payload.to).toEqual(["user@pordee.test"]);
    expect(payload.text).toContain("https://pordee.test/api/auth");
    expect(payload.html).toContain("&amp;source=email");
    expect(String(init?.body)).not.toContain("re_test_secret");
  });

  it("fails closed when email delivery is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.AUTH_EMAIL_FROM;
    expect(isPasswordResetEmailConfigured()).toBe(false);

    await expect(
      sendPasswordResetEmail({
        email: "user@pordee.test",
        resetUrl: "https://pordee.test/reset-password?token=test",
      })
    ).rejects.toThrow("Password reset email is not configured.");
  });

  it("does not include the Resend response body in server logs", async () => {
    process.env.RESEND_API_KEY = "re_test_secret";
    process.env.AUTH_EMAIL_FROM = "Pordee <no-reply@pordee.test>";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"message":"sensitive provider detail"}', { status: 422 })
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendPasswordResetEmail({
        email: "user@pordee.test",
        resetUrl: "https://pordee.test/reset-password?token=test",
      })
    ).rejects.toThrow("Password reset email could not be sent.");

    expect(errorSpy).toHaveBeenCalledWith(
      "Resend password reset email failed.",
      { status: 422 }
    );
  });
});

const restoreEnv = (name: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
};
