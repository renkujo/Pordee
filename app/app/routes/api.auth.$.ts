import type { Route } from "./+types/api.auth.$";
import { auth, ensureAuthDatabase } from "~/lib/auth.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await ensureAuthDatabase();
  return auth.handler(request);
};

export const action = async ({ request }: Route.ActionArgs) => {
  await ensureAuthDatabase();
  return auth.handler(request);
};
