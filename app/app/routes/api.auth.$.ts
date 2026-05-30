import type { Route } from "./+types/api.auth.$";
import { auth, ensureAuthDatabase } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await ensureAuthDatabase();
  return auth.handler(request);
}

export async function action({ request }: Route.ActionArgs) {
  await ensureAuthDatabase();
  return auth.handler(request);
}
