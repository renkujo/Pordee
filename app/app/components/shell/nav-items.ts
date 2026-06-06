import {
  CircleGauge,
  Layers3,
  PlusCircle,
  ListChecks,
  Target,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  labelId: string;
  descriptionId: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    labelId: "nav.dashboard.label",
    descriptionId: "nav.dashboard.description",
    icon: CircleGauge,
    end: true,
  },
  {
    to: "/add",
    labelId: "nav.add.label",
    descriptionId: "nav.add.description",
    icon: PlusCircle,
  },
  {
    to: "/wallet",
    labelId: "nav.wallet.label",
    descriptionId: "nav.wallet.description",
    icon: Layers3,
  },
  {
    to: "/history",
    labelId: "nav.history.label",
    descriptionId: "nav.history.description",
    icon: ListChecks,
  },
  {
    to: "/goals",
    labelId: "nav.goals.label",
    descriptionId: "nav.goals.description",
    icon: Target,
  },
  {
    to: "/settings",
    labelId: "nav.settings.label",
    descriptionId: "nav.settings.description",
    icon: Settings,
  },
];

const MOBILE_PRIMARY_PATHS = new Set(["/", "/add", "/wallet", "/history"]);

export const MOBILE_PRIMARY_NAV_ITEMS = NAV_ITEMS.filter(({ to }) =>
  MOBILE_PRIMARY_PATHS.has(to)
);

export const MOBILE_MORE_NAV_ITEMS = NAV_ITEMS.filter(
  ({ to }) => !MOBILE_PRIMARY_PATHS.has(to)
);
