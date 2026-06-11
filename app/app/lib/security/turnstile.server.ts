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
  const config = getTurnstileConfig();
  if (!config.enabled) return { enabled: false, siteKey: null };

  return { enabled: true, siteKey: config.siteKey };
};

export const verifyTurnstileToken = async ({
  form,
  request,
}: {
  form: FormData;
  request: Request;
}): Promise<TurnstileVerificationResult> => {
  const config = getTurnstileConfig();
  if (!config.enabled) {
    return { ok: true };
  }

  const token = form.get(TURNSTILE_RESPONSE_FIELD);
  if (typeof token !== "string" || token.trim() === "") {
    return { ok: false, error: "auth.error.turnstileRequired" };
  }

  const body = new FormData();
  body.set("secret", config.secretKey);
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

const getTurnstileConfig = ():
  | { enabled: true; siteKey: string; secretKey: string }
  | { enabled: false } => {
  const siteKey = readEnv([
    "CLOUDFLARE_TURNSTILE_SITE_KEY",
    "TURNSTILE_SITE_KEY",
    "CLOUDFLARE_TURNSTILE_SITEKEY",
    "TURNSTILE_SITEKEY",
  ]);
  const secretKey = readEnv([
    "CLOUDFLARE_TURNSTILE_SECRET_KEY",
    "TURNSTILE_SECRET_KEY",
    "CLOUDFLARE_TURNSTILE_SECRET",
    "TURNSTILE_SECRET",
  ]);
  const enabledValue = readEnv([
    "CLOUDFLARE_TURNSTILE_ENABLED",
    "TURNSTILE_ENABLED",
  ]);

  if (enabledValue === "false") return { enabled: false };

  if (enabledValue === "true" || process.env.NODE_ENV === "production") {
    if (siteKey && secretKey) {
      return { enabled: true, siteKey, secretKey };
    }

    warnIncompleteTurnstileConfig();
    return { enabled: false };
  }

  return { enabled: false };
};

let hasWarnedIncompleteTurnstileConfig = false;

const warnIncompleteTurnstileConfig = () => {
  if (hasWarnedIncompleteTurnstileConfig) return;
  hasWarnedIncompleteTurnstileConfig = true;
  console.warn(
    "Cloudflare Turnstile is disabled because site key or secret key is missing."
  );
};

const readEnv = (names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
};

const getClientIp = (headers: Headers) => {
  const cloudflareIp = headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp;

  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  return forwardedFor.split(",")[0]?.trim() || null;
};
