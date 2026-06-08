import { redirect } from "react-router";
import { betterAuth } from "better-auth";
import { APIError, isAPIError } from "better-auth/api";
import { getMigrations } from "better-auth/db/migration";
import { pool } from "~/lib/db/client";

const getGoogleSocialProvider = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
  };
};

const googleSocialProvider = getGoogleSocialProvider();

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "pordee-dev-auth-secret-change-before-production",
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      avatarPresetId: {
        type: "string",
        required: false,
      },
    },
  },
  account: {
    accountLinking: {
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  ...(googleSocialProvider
    ? {
        socialProviders: {
          google: googleSocialProvider,
        },
      }
    : {}),
  advanced: {
    cookiePrefix: "pordee",
  },
});

let migrationPromise: Promise<void> | null = null;

export const ensureAuthDatabase = () => {
  migrationPromise ??= getMigrations(auth.options).then(({ runMigrations }) =>
    runMigrations()
  );
  return migrationPromise;
};

export interface AuthUser {
  avatarPresetId?: string | null;
  id: string;
  name: string;
  email: string;
}

export const getAuthUser = async (
  request: Request
): Promise<AuthUser | null> => {
  await ensureAuthDatabase();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  return {
    avatarPresetId: session.user.avatarPresetId,
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
};

export const requireUser = async (request: Request) => {
  const user = await getAuthUser(request);
  if (user) return user;

  const url = new URL(request.url);
  const redirectTo = `${url.pathname}${url.search}`;
  throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
};

export const getSafeRedirectTo = (
  value: FormDataEntryValue | string | null
) => {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
};

export const redirectWithAuthCookies = (
  to: string,
  authHeaders: Headers
): Response => {
  const headers = new Headers();
  headers.set("Location", to);
  appendAuthCookies(headers, authHeaders);
  return new Response(null, { status: 302, headers });
};

export const appendAuthCookies = (target: Headers, source: Headers) => {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  const cookies = getSetCookie ? getSetCookie.call(source) : [];

  if (cookies.length > 0) {
    for (const cookie of cookies) {
      target.append("Set-Cookie", cookie);
    }
    return;
  }

  const cookie = source.get("set-cookie");
  if (cookie) target.append("Set-Cookie", cookie);
};

export const authErrorMessage = (error: unknown) => {
  if (isAPIError(error)) {
    return mapApiError(error);
  }

  return "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
};

export const isGoogleAuthEnabled = () => {
  return Boolean(googleSocialProvider);
};

const mapApiError = (error: APIError) => {
  if (error.status === "UNAUTHORIZED") {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }

  if (error.status === "BAD_REQUEST") {
    return "ข้อมูลบัญชีไม่ครบถ้วนหรือรูปแบบไม่ถูกต้อง";
  }

  if (error.status === "UNPROCESSABLE_ENTITY") {
    return "บัญชีนี้อาจมีอยู่แล้ว หรือรหัสผ่านยังไม่ผ่านเงื่อนไข";
  }

  return error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
};
