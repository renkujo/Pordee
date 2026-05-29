import {
  CircleGauge,
  PlusCircle,
  ListChecks,
  Target,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "หน้าหลัก", icon: CircleGauge, end: true },
  { to: "/add", label: "บันทึก", icon: PlusCircle },
  { to: "/history", label: "ประวัติ", icon: ListChecks },
  { to: "/goals", label: "เป้าหมาย", icon: Target },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];
