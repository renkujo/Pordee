import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPublicTurnstileConfig,
  verifyTurnstileToken,
} from "~/lib/security/turnstile.server";

const originalEnv = { ...process.env };

describe("turnstile verification", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetEnv();
  });

  it("is disabled by default outside production", async () => {
    expect(getPublicTurnstileConfig()).toEqual({
      enabled: false,
      siteKey: null,
    });

    const form = new FormData();
    const result = await verifyTurnstileToken({
      form,
      request: new Request("http://localhost/login"),
    });

    expect(result).toEqual({ ok: true });
  });

  it("requires a token when enabled", async () => {
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true";
    process.env.CLOUDFLARE_TURNSTILE_SITE_KEY = "site-key";
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = "secret-key";

    expect(getPublicTurnstileConfig()).toEqual({
      enabled: true,
      siteKey: "site-key",
    });

    const result = await verifyTurnstileToken({
      form: new FormData(),
      request: new Request("http://localhost/login"),
    });

    expect(result).toEqual({
      error: "auth.error.turnstileRequired",
      ok: false,
    });
  });

  it("passes the Turnstile token and client IP to Siteverify", async () => {
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true";
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = "secret-key";
    const fetchMock = vi.fn(async (_url: string | URL | Request, init) => {
      const body = init?.body as FormData;

      expect(body.get("secret")).toBe("secret-key");
      expect(body.get("response")).toBe("token-123");
      expect(body.get("remoteip")).toBe("203.0.113.9");

      return Response.json({ success: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const form = new FormData();
    form.set("cf-turnstile-response", "token-123");
    const result = await verifyTurnstileToken({
      form,
      request: new Request("http://localhost/login", {
        headers: { "cf-connecting-ip": "203.0.113.9" },
      }),
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("fails when Siteverify rejects the token", async () => {
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true";
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = "secret-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          success: false,
          "error-codes": ["invalid-input-response"],
        })
      )
    );

    const form = new FormData();
    form.set("cf-turnstile-response", "bad-token");
    const result = await verifyTurnstileToken({
      form,
      request: new Request("http://localhost/login"),
    });

    expect(result).toEqual({
      error: "auth.error.turnstileFailed",
      ok: false,
    });
  });
});

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, originalEnv, { NODE_ENV: "test" });
  delete process.env.CLOUDFLARE_TURNSTILE_ENABLED;
  delete process.env.CLOUDFLARE_TURNSTILE_SITE_KEY;
  delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
};
