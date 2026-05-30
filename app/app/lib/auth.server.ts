import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { redirect } from "react-router";
import { betterAuth } from "better-auth";
import { APIError, isAPIError } from "better-auth/api";
import { getMigrations } from "better-auth/db/migration";

const authDbPath =
  process.env.PORDEE_AUTH_DB_PATH ??
  resolve(process.cwd(), ".data/auth.sqlite");

mkdirSync(dirname(authDbPath), { recursive: true });

const database = new DatabaseSync(authDbPath);

export const auth = betterAuth({
  database,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "pordee-dev-auth-secret-change-before-production",
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    cookiePrefix: "pordee",
  },
});

let migrationPromise: Promise<void> | null = null;

export function ensureAuthDatabase() {
  migrationPromise ??= getMigrations(auth.options).then(({ runMigrations }) =>
    runMigrations()
  );
  return migrationPromise;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  await ensureAuthDatabase();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}

export async function requireUser(request: Request) {
  const user = await getAuthUser(request);
  if (user) return user;

  const url = new URL(request.url);
  const redirectTo = `${url.pathname}${url.search}`;
  throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}

export function getSafeRedirectTo(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

export function redirectWithAuthCookies(
  to: string,
  authHeaders: Headers
): Response {
  const headers = new Headers();
  headers.set("Location", to);
  appendAuthCookies(headers, authHeaders);
  return new Response(null, { status: 302, headers });
}

export function appendAuthCookies(target: Headers, source: Headers) {
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
}

export function authErrorMessage(error: unknown) {
  if (isAPIError(error)) {
    return mapApiError(error);
  }

  return "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
}

function mapApiError(error: APIError) {
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
}
