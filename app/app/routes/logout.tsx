import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { appendAuthCookies, auth, ensureAuthDatabase } from "~/lib/auth.server";

export const loader = async () => {
  return redirect("/login");
};

export const action = async ({ request }: Route.ActionArgs) => {
  await ensureAuthDatabase();

  const { headers: authHeaders } = await auth.api.signOut({
    headers: request.headers,
    returnHeaders: true,
  });

  const headers = new Headers({ Location: "/login" });
  appendAuthCookies(headers, authHeaders);
  return new Response(null, { status: 302, headers });
};
