import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/_shell.tsx", [
    index("routes/dashboard.tsx"),
    route("add", "routes/add.tsx"),
    route("history", "routes/history.tsx"),
    route("history/:id", "routes/history.$id.tsx"),
    route("goals", "routes/goals.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
