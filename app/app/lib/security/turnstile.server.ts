const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";

interface TurnstileSiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export interface PublicTurnstileConfig {
  enabled: boolean;
  siteKey: string | null;
}

export type TurnstileVerificationResult =
  | { ok: true }
  | { ok: false; error: string };

export const getPublicTurnstileConfig = (): PublicTurnstileConfig => {
  if (!isTurnstileEnabled()) {
    return { enabled: false, siteKey: null };
  }

  const siteKey = process.env.CLOUDFLARE_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    throw new Error(
      "CLOUDFLARE_TURNSTILE_SITE_KEY is required when Turnstile is enabled."
    );
  }

  return { enabled: true, siteKey };
};

export const verifyTurnstileToken = async ({
  form,
  request,
}: {
  form: FormData;
  request: Request;
}): Promise<TurnstileVerificationResult> => {
  if (!isTurnstileEnabled()) {
    return { ok: true };
  }

  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "CLOUDFLARE_TURNSTILE_SECRET_KEY is required when Turnstile is enabled."
    );
  }

  const token = form.get(TURNSTILE_RESPONSE_FIELD);
  if (typeof token !== "string" || token.trim() === "") {
    return { ok: false, error: "auth.error.turnstileRequired" };
  }

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);

  const remoteIp = getClientIp(request.headers);
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(SITEVERIFY_URL, {
    body,
    method: "POST",
  });

  if (!response.ok) {
    return { ok: false, error: "auth.error.turnstileFailed" };
  }

  const result = (await response.json()) as TurnstileSiteverifyResponse;
  if (!result.success) {
    return { ok: false, error: "auth.error.turnstileFailed" };
  }

  return { ok: true };
};

const isTurnstileEnabled = () => {
  const configuredValue = process.env.CLOUDFLARE_TURNSTILE_ENABLED;
  if (configuredValue === "false") return false;
  if (configuredValue === "true") return true;
  return process.env.NODE_ENV === "production";
};

const getClientIp = (headers: Headers) => {
  const cloudflareIp = headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp;

  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  return forwardedFor.split(",")[0]?.trim() || null;
};
