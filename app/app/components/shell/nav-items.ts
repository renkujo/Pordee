import {
  CircleGauge,
  CalendarSync,
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
    to: "/recurring",
    labelId: "nav.recurring.label",
    descriptionId: "nav.recurring.description",
    icon: CalendarSync,
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

const MOBILE_PRIMARY_PATHS = ["/", "/wallet", "/add", "/history"] as const;
const MOBILE_PRIMARY_PATH_SET = new Set<string>(MOBILE_PRIMARY_PATHS);

export const MOBILE_PRIMARY_NAV_ITEMS = MOBILE_PRIMARY_PATHS.map((path) =>
  NAV_ITEMS.find(({ to }) => to === path)
).filter((item): item is NavItem => Boolean(item));

export const MOBILE_MORE_NAV_ITEMS = NAV_ITEMS.filter(
  ({ to }) => !MOBILE_PRIMARY_PATH_SET.has(to)
);
