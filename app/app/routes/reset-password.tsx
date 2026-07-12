import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { useState, type InputHTMLAttributes } from "react";
import { Check, Circle, Eye, EyeOff, KeyRound } from "lucide-react";
import type { Route } from "./+types/reset-password";
import { RecoveryPageShell } from "~/components/auth/recovery-page-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { auth, ensureAuthDatabase } from "~/lib/auth.server";
import { cn } from "~/lib/cn";
import { usePordeeTranslation } from "~/lib/i18n/provider";
import { passwordRules, resetPasswordSchema } from "~/lib/validators/auth";

interface ActionResult {
  ok: false;
  error: string;
  token: string;
}

export const meta = (_: Route.MetaArgs) => {
  return [{ title: "พอดี — ตั้งรหัสผ่านใหม่" }];
};

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  return {
    invalid:
      url.searchParams.get("error") === "INVALID_TOKEN" ||
      !url.searchParams.get("token"),
    token: url.searchParams.get("token") ?? "",
  };
};

export const action = async ({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> => {
  await ensureAuthDatabase();

  const form = await request.formData();
  const raw = {
    confirmPassword: form.get("confirmPassword"),
    newPassword: form.get("newPassword"),
    token: form.get("token"),
  };
  const parsed = resetPasswordSchema.safeParse(raw);
  const token = typeof raw.token === "string" ? raw.token : "";

  if (!parsed.success) {
    return {
      ok: false,
      error: getResetValidationError(parsed.error.issues[0]?.path[0]),
      token,
    };
  }

  try {
    await auth.api.resetPassword({
      body: {
        newPassword: parsed.data.newPassword,
        token: parsed.data.token,
      },
      headers: request.headers,
    });
  } catch {
    return {
      ok: false,
      error: "passwordRecovery.error.invalidToken",
      token,
    };
  }

  return redirect("/login?reset=success");
};

const getResetValidationError = (field: PropertyKey | undefined) => {
  if (field === "token") return "passwordRecovery.error.invalidToken";
  if (field === "confirmPassword") return "auth.error.passwordMismatch";
  return "auth.error.passwordRules";
};

const ResetPassword = () => {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const t = usePordeeTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const token = actionData?.token ?? loaderData.token;

  return (
    <RecoveryPageShell
      title={t("passwordRecovery.reset.title")}
      description={t("passwordRecovery.reset.description")}
    >
      {loaderData.invalid ? (
        <div
          className="border-coral/25 bg-coral/10 text-coral-strong rounded-sm border px-4 py-4 text-sm leading-6"
          role="alert"
        >
          {t("passwordRecovery.error.invalidToken")}
        </div>
      ) : (
        <Form method="post" className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />

          <PasswordInput
            autoComplete="new-password"
            id="new-password"
            label={t("passwordRecovery.reset.newPassword")}
            name="newPassword"
            value={newPassword}
            onChange={(event) => setNewPassword(event.currentTarget.value)}
          />

          <PasswordRequirementList password={newPassword} />

          <PasswordInput
            autoComplete="new-password"
            id="confirm-password"
            label={t("auth.password.confirmLabel")}
            name="confirmPassword"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.currentTarget.value)}
          />

          {actionData?.error ? (
            <p
              className="border-coral/25 bg-coral/10 text-coral-strong rounded-sm border px-3 py-2 text-sm"
              role="alert"
            >
              {t(actionData.error)}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="h-12 w-full">
            <KeyRound className="h-4 w-4" />
            {t("passwordRecovery.reset.submit")}
          </Button>
        </Form>
      )}
    </RecoveryPageShell>
  );
};

export default ResetPassword;

const PasswordInput = ({
  id,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  name: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const t = usePordeeTranslation();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          {...props}
          id={id}
          type={isVisible ? "text" : "password"}
          className="pr-10"
          required
        />
        <button
          type="button"
          aria-label={
            isVisible ? t("auth.password.hide") : t("auth.password.show")
          }
          className="text-muted hover:text-ink focus-visible:ring-coral/40 absolute top-1/2 right-3 inline-flex -translate-y-1/2 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => setIsVisible((value) => !value)}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};

const PasswordRequirementList = ({ password }: { password: string }) => {
  const t = usePordeeTranslation();

  return (
    <ul
      className="border-line bg-sky/45 grid gap-2 rounded-sm border px-3 py-3"
      aria-label={t("auth.password.rulesAriaLabel")}
    >
      {passwordRules.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 text-xs leading-5",
              passed ? "text-teal" : "text-muted"
            )}
          >
            {passed ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{t(`auth.password.rule.${rule.id}`)}</span>
          </li>
        );
      })}
    </ul>
  );
};
