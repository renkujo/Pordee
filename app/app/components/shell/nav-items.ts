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
  label: string;
  description: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "หน้าหลัก",
    description: "ดูภาพรวมเดือนนี้",
    icon: CircleGauge,
    end: true,
  },
  {
    to: "/add",
    label: "บันทึก",
    description: "เพิ่มรายรับรายจ่าย",
    icon: PlusCircle,
  },
  {
    to: "/wallet",
    label: "กระเป๋า",
    description: "ดูเงินพร้อมใช้และเงินกันไว้",
    icon: Layers3,
  },
  {
    to: "/history",
    label: "ประวัติ",
    description: "ค้นหาและแก้ไขรายการ",
    icon: ListChecks,
  },
  {
    to: "/goals",
    label: "เป้าหมาย",
    description: "ตามเงินเก็บทีละก้าว",
    icon: Target,
  },
  {
    to: "/settings",
    label: "ตั้งค่า",
    description: "จัดการข้อมูลในเครื่อง",
    icon: Settings,
  },
];
