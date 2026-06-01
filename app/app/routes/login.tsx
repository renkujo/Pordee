import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import { CheckCircle2, LogIn, UserPlus } from "lucide-react";
import type { Route } from "./+types/login";
import { PordeeLogo } from "~/components/brand/logo";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  auth,
  authErrorMessage,
  ensureAuthDatabase,
  getAuthUser,
  getSafeRedirectTo,
  isGoogleAuthEnabled,
  redirectWithAuthCookies,
} from "~/lib/auth.server";
import { cn } from "~/lib/cn";

type AuthIntent = "signIn" | "signUp";
type ActionIntent = AuthIntent | "socialSignIn";

interface ActionResult {
  ok: false;
  error: string;
  intent: ActionIntent;
  values: {
    email: string;
    name: string;
    redirectTo: string;
  };
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — เข้าสู่ระบบ" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  if (user) return redirect("/");

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "signup" ? "signup" : "login";
  return {
    mode,
    redirectTo: getSafeRedirectTo(url.searchParams.get("redirectTo")),
    socialProviders: {
      google: isGoogleAuthEnabled(),
    },
  };
}

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> {
  await ensureAuthDatabase();

  const form = await request.formData();
  const intentValue = form.get("intent");
  const intent: ActionIntent =
    intentValue === "signUp"
      ? "signUp"
      : intentValue === "socialSignIn"
        ? "socialSignIn"
        : "signIn";
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const redirectTo = getSafeRedirectTo(form.get("redirectTo"));

  if (intent === "socialSignIn") {
    const provider = form.get("provider");
    if (provider !== "google") {
      return formError("socialSignIn", "ผู้ให้บริการเข้าสู่ระบบไม่ถูกต้อง", {
        email: "",
        name: "",
        redirectTo,
      });
    }

    if (!isGoogleAuthEnabled()) {
      return formError("socialSignIn", "ยังไม่ได้เปิดใช้งาน Google Login", {
        email: "",
        name: "",
        redirectTo,
      });
    }

    try {
      const { headers, response } = await auth.api.signInSocial({
        body: {
          provider: "google",
          callbackURL: redirectTo,
          errorCallbackURL: `/login?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
        headers: request.headers,
        returnHeaders: true,
      });

      if (!response.url) {
        return formError("socialSignIn", "เริ่มเข้าสู่ระบบด้วย Google ไม่ได้", {
          email: "",
          name: "",
          redirectTo,
        });
      }

      return redirectWithAuthCookies(response.url, headers);
    } catch (error) {
      return formError("socialSignIn", authErrorMessage(error), {
        email: "",
        name: "",
        redirectTo,
      });
    }
  }

  if (!email || !password || (intent === "signUp" && !name)) {
    return formError(intent, "กรอกข้อมูลบัญชีให้ครบก่อน", {
      email,
      name,
      redirectTo,
    });
  }

  if (password.length < 8) {
    return formError(intent, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", {
      email,
      name,
      redirectTo,
    });
  }

  try {
    const { headers } =
      intent === "signUp"
        ? await auth.api.signUpEmail({
            body: { email, password, name },
            headers: request.headers,
            returnHeaders: true,
          })
        : await auth.api.signInEmail({
            body: { email, password, rememberMe: true },
            headers: request.headers,
            returnHeaders: true,
          });

    return redirectWithAuthCookies(redirectTo, headers);
  } catch (error) {
    return formError(intent, authErrorMessage(error), {
      email,
      name,
      redirectTo,
    });
  }
}

export default function Login() {
  const { mode, redirectTo, socialProviders } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const activeIntent: AuthIntent =
    actionData?.intent === "signIn" || actionData?.intent === "signUp"
      ? actionData.intent
      : mode === "signup"
        ? "signUp"
        : "signIn";
  const isSignUp = activeIntent === "signUp";
  const values = actionData?.values;
  const heading = isSignUp ? "เริ่มใช้พอดี" : "เข้าสู่พอดี";
  const supportTitle = isSignUp
    ? "เริ่มจากบัญชีเดียวก่อน"
    : "กลับมาจัดการเงินต่อ";
  const supportCopy = isSignUp
    ? "พอดีใช้บัญชีเพื่อแยกพื้นที่ข้อมูลการเงินของคุณไว้ในฐานข้อมูลของแอป"
    : "เข้าสู่ระบบแล้วไปต่อที่ภาพรวมเดือนนี้ บันทึกรายการ หรือเป้าหมายที่ค้างไว้";

  return (
    <main className="min-h-dvh px-4 py-5 md:px-6 lg:px-8">
      <div className="border-line bg-surface mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-md border lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,520px)]">
        <aside className="bg-sky/55 border-line flex min-h-[18rem] flex-col justify-between p-5 md:p-7 lg:border-r lg:p-8">
          <Link
            to="/login"
            className="focus-visible:ring-coral/40 w-fit rounded-sm outline-none focus-visible:ring-2"
          >
            <PordeeLogo size={48} wordmarkClassName="text-2xl" />
          </Link>

          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_10rem] md:items-end lg:mt-0 lg:block">
            <div className="max-w-md">
              <h1 className="text-ink text-3xl leading-tight font-semibold text-pretty md:text-4xl">
                {heading}
              </h1>
              <p className="text-muted mt-3 max-w-sm text-sm leading-6">
                เก็บสมุดเงินส่วนตัวไว้หลังบัญชีของคุณ
              </p>
            </div>

            <div className="mt-0 flex justify-center md:justify-end lg:mt-10 lg:justify-start">
              <img
                alt="พอดีมาสคอต"
                className="h-36 w-36 object-contain md:h-40 md:w-40 lg:h-44 lg:w-44"
                src={
                  isSignUp
                    ? "/brand/mascots/happy.png"
                    : "/brand/mascots/normal.png"
                }
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:mt-8">
            <SupportNote title={supportTitle}>{supportCopy}</SupportNote>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <TrustRow>บันทึกรายการส่วนตัว</TrustRow>
              <TrustRow>ออกจากระบบได้ทุกเวลา</TrustRow>
              <TrustRow>ข้อมูลแยกตามบัญชี</TrustRow>
            </div>
          </div>
        </aside>

        <section className="flex items-center px-5 py-7 md:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-5">
              <AuthModeTabs isSignUp={isSignUp} redirectTo={redirectTo} />
              <h2 className="text-ink mt-6 text-xl font-semibold">
                {isSignUp ? "สร้างบัญชีใหม่" : "ใช้บัญชีเดิม"}
              </h2>
              <p className="text-muted mt-1 text-sm">
                {isSignUp
                  ? "ใช้ชื่อ อีเมล และรหัสผ่านเพื่อเริ่มพื้นที่ของคุณ"
                  : "กรอกอีเมลกับรหัสผ่านเพื่อกลับเข้าแอป"}
              </p>
            </div>

            <Form method="post" className="flex flex-col gap-4">
              <input type="hidden" name="intent" value={activeIntent} />
              <input
                type="hidden"
                name="redirectTo"
                value={values?.redirectTo ?? redirectTo}
              />

              {isSignUp && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">ชื่อที่ใช้ในแอป</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={values?.name ?? ""}
                    autoComplete="name"
                    placeholder="เช่น Pordee"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={values?.email ?? ""}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <span className="text-muted text-xs">
                    อย่างน้อย 8 ตัวอักษร
                  </span>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="ใส่รหัสผ่าน"
                />
              </div>

              {actionData?.error && (
                <p
                  className="border-coral/25 bg-coral/10 text-coral-strong rounded-sm border px-3 py-2 text-sm"
                  role="alert"
                >
                  {actionData.error}
                </p>
              )}

              <Button type="submit" size="lg" className="mt-1 h-12 w-full">
                {isSignUp ? (
                  <UserPlus className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isSignUp ? "สมัครและเข้าใช้งาน" : "เข้าสู่ระบบ"}
              </Button>
            </Form>

            {socialProviders.google && (
              <SocialSignIn redirectTo={redirectTo} isSignUp={isSignUp} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SocialSignIn({
  isSignUp,
  redirectTo,
}: {
  isSignUp: boolean;
  redirectTo: string;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <div className="bg-line h-px flex-1" />
        <span className="text-muted text-xs">หรือ</span>
        <div className="bg-line h-px flex-1" />
      </div>
      <Form method="post" className="mt-5">
        <input type="hidden" name="intent" value="socialSignIn" />
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          className="h-12 w-full"
        >
          <GoogleMark className="h-4 w-4" />
          {isSignUp ? "สมัครด้วย Google" : "เข้าสู่ระบบด้วย Google"}
        </Button>
      </Form>
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.6 12.23c0-.76-.07-1.49-.2-2.19H12v4.14h5.37a4.59 4.59 0 0 1-1.99 3.01v2.5h3.22c1.89-1.74 3-4.3 3-7.46Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.22-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.08v2.58A9.98 9.98 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.92A6.01 6.01 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.5H3.08A9.98 9.98 0 0 0 2 12c0 1.61.39 3.14 1.08 4.5l3.33-2.58Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.96c1.47 0 2.78.5 3.82 1.49l2.86-2.86C16.95 2.98 14.7 2 12 2a9.98 9.98 0 0 0-8.92 5.5l3.33 2.58C7.2 7.72 9.4 5.96 12 5.96Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AuthModeTabs({
  isSignUp,
  redirectTo,
}: {
  isSignUp: boolean;
  redirectTo: string;
}) {
  return (
    <nav
      aria-label="เลือกวิธีเข้าใช้งาน"
      className="border-line bg-sky/45 grid grid-cols-2 rounded-md border p-1"
    >
      <ModeLink active={!isSignUp} redirectTo={redirectTo} toMode="login">
        เข้าสู่ระบบ
      </ModeLink>
      <ModeLink active={isSignUp} redirectTo={redirectTo} toMode="signup">
        สมัครบัญชี
      </ModeLink>
    </nav>
  );
}

function SupportNote({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="border-line bg-surface/75 rounded-md border p-3">
      <p className="text-ink text-sm font-semibold">{title}</p>
      <p className="text-muted mt-1 text-sm leading-6">{children}</p>
    </div>
  );
}

function TrustRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted flex items-center gap-2 text-sm">
      <CheckCircle2 className="text-teal h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function ModeLink({
  active,
  children,
  redirectTo,
  toMode,
}: {
  active: boolean;
  children: React.ReactNode;
  redirectTo: string;
  toMode: "login" | "signup";
}) {
  const search = new URLSearchParams();
  if (toMode === "signup") search.set("mode", "signup");
  if (redirectTo !== "/") search.set("redirectTo", redirectTo);
  const to = `/login${search.size > 0 ? `?${search.toString()}` : ""}`;

  return (
    <Link
      to={to}
      className={cn(
        "rounded-sm px-3 py-2 text-center text-sm font-medium transition-colors",
        active
          ? "bg-coral text-white"
          : "text-muted hover:bg-sky hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}

function formError(
  intent: ActionIntent,
  error: string,
  values: ActionResult["values"]
): ActionResult {
  return {
    ok: false,
    error,
    intent,
    values,
  };
}
