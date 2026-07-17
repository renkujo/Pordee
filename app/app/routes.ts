import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/push-subscriptions", "routes/api.push-subscriptions.ts"),
  route("api/cron/daily-reminders", "routes/api.cron.daily-reminders.ts"),
  route("login", "routes/login.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("logout", "routes/logout.tsx"),
  layout("routes/_shell.tsx", [
    index("routes/dashboard.tsx"),
    route("wallet", "routes/wallet.tsx"),
    route("add", "routes/add.tsx"),
    route("recurring", "routes/recurring.tsx"),
    route("history", "routes/history.tsx"),
    route("history/:id", "routes/history.$id.tsx"),
    route("goals", "routes/goals.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
