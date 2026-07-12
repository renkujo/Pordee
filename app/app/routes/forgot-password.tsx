import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { Mail } from "lucide-react";
import type { Route } from "./+types/forgot-password";
import { RecoveryPageShell } from "~/components/auth/recovery-page-shell";
import { TurnstileWidget } from "~/components/auth/turnstile-widget";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { auth, ensureAuthDatabase, getAuthUser } from "~/lib/auth.server";
import { isPasswordResetEmailConfigured } from "~/lib/email/password-reset.server";
import { usePordeeTranslation } from "~/lib/i18n/provider";
import {
  getPublicTurnstileConfig,
  verifyTurnstileToken,
} from "~/lib/security/turnstile.server";
import { forgotPasswordSchema } from "~/lib/validators/auth";

interface ActionResult {
  ok: boolean;
  email: string;
  error?: string;
}

export const meta = (_: Route.MetaArgs) => {
  return [{ title: "พอดี — ลืมรหัสผ่าน" }];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getAuthUser(request);
  if (user) return redirect("/");

  return { turnstile: getPublicTurnstileConfig() };
};

export const action = async ({
  request,
}: Route.ActionArgs): Promise<ActionResult> => {
  await ensureAuthDatabase();

  const form = await request.formData();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      ok: false,
      email,
      error: "passwordRecovery.error.emailInvalid",
    };
  }

  const turnstile = await verifyTurnstileToken({ form, request });
  if (!turnstile.ok) {
    return { ok: false, email, error: turnstile.error };
  }

  if (!isPasswordResetEmailConfigured()) {
    return {
      ok: false,
      email,
      error: "passwordRecovery.error.sendFailed",
    };
  }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: "/reset-password",
      },
      headers: request.headers,
    });
  } catch {
    // Keep the browser response identical for existing and missing accounts.
    // Delivery failures are recorded server-side by the email boundary.
  }

  return { ok: true, email };
};

const ForgotPassword = () => {
  const { turnstile } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const t = usePordeeTranslation();

  return (
    <RecoveryPageShell
      title={t("passwordRecovery.forgot.title")}
      description={t("passwordRecovery.forgot.description")}
    >
      {actionData?.ok ? (
        <div
          className="border-teal/25 bg-teal/10 rounded-sm border px-4 py-4"
          role="status"
        >
          <p className="text-ink text-sm font-semibold">
            {t("passwordRecovery.forgot.sentTitle")}
          </p>
          <p className="text-muted mt-1 text-sm leading-6">
            {t("passwordRecovery.forgot.sentDescription")}
          </p>
        </div>
      ) : (
        <Form method="post" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("auth.email.label")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={actionData?.email ?? ""}
              placeholder="you@example.com"
              required
            />
          </div>

          {actionData?.error ? (
            <p
              className="border-coral/25 bg-coral/10 text-coral-strong rounded-sm border px-3 py-2 text-sm"
              role="alert"
            >
              {t(actionData.error)}
            </p>
          ) : null}

          {turnstile.enabled && turnstile.siteKey ? (
            <TurnstileWidget
              action="forgot-password"
              siteKey={turnstile.siteKey}
            />
          ) : null}

          <Button type="submit" size="lg" className="h-12 w-full">
            <Mail className="h-4 w-4" />
            {t("passwordRecovery.forgot.submit")}
          </Button>
        </Form>
      )}
    </RecoveryPageShell>
  );
};

export default ForgotPassword;
