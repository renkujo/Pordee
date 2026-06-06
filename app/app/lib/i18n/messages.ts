export const DEFAULT_LOCALE = "th";
export const LOCALE_STORAGE_KEY = "pordee-locale";

export type PordeeLocale = "th" | "en";

export const localeOptions: Array<{
  description: string;
  label: string;
  value: PordeeLocale;
}> = [
  {
    description: "ภาษาไทยเป็นภาษาหลักของพอดี",
    label: "ไทย",
    value: "th",
  },
  {
    description: "English labels for the app shell and settings foundation",
    label: "English",
    value: "en",
  },
];

export const messages: Record<PordeeLocale, Record<string, string>> = {
  th: {
    "app.tagline": "เงินพอดี ชีวิตเบาขึ้น",
    "language.description.en":
      "English labels for the app shell and settings foundation",
    "language.description.th": "ภาษาไทยเป็นภาษาหลักของพอดี",
    "language.helper":
      "ตอนนี้ Lingui ดูแล shell, navigation และส่วนตั้งค่าภาษา ก่อนขยายไปหน้าการเงินทีละส่วน",
    "language.label.en": "English",
    "language.label.th": "ไทย",
    "language.saveNote": "ค่าเลือกนี้จะจำไว้เฉพาะเครื่องนี้",
    "language.title": "ภาษา",
    "mobile.more": "เพิ่มเติม",
    "mobile.more.close": "ปิด",
    "mobile.more.closeLabel": "ปิดเมนูเพิ่มเติม",
    "mobile.more.navLabel": "เมนูเพิ่มเติม",
    "mobile.navLabel": "เมนูหลักบนมือถือ",
    "nav.add.description": "เพิ่มรายรับรายจ่าย",
    "nav.add.label": "บันทึก",
    "nav.categories.countSuffix": "หมวด",
    "nav.dashboard.description": "ดูภาพรวมเดือนนี้",
    "nav.dashboard.label": "หน้าหลัก",
    "nav.goals.description": "ตามเงินเก็บทีละก้าว",
    "nav.goals.label": "เป้าหมาย",
    "nav.history.description": "ค้นหาและแก้ไขรายการ",
    "nav.history.label": "ประวัติ",
    "nav.notifications.count": "เตือนความจำ",
    "nav.profile.countSuffix": "วิธีเข้าใช้",
    "nav.security.count": "รหัสผ่าน",
    "nav.settings.description": "บัญชีและหมวดหมู่",
    "nav.settings.label": "ตั้งค่า",
    "nav.wallet.description": "ดูเงินพร้อมใช้และเงินกันไว้",
    "nav.wallet.label": "กระเป๋า",
    "settings.description": "ปรับ Pordee ให้เข้ากับวิธีใช้ประจำวันของคุณ",
    "settings.navLabel": "ส่วนตั้งค่า",
    "settings.tab.account": "โปรไฟล์",
    "settings.tab.categories": "หมวดหมู่",
    "settings.tab.language": "ภาษา",
    "settings.tab.notifications": "การแจ้งเตือน",
    "settings.tab.security": "ความปลอดภัย",
    "settings.title": "ตั้งค่า",
    "shell.accountHint": "พอดีช่วยตั้งหลัก",
    "shell.addTransaction": "บันทึกรายการ",
    "shell.logout": "ออกจากระบบ",
    "shell.mainNav": "เมนูหลัก",
  },
  en: {
    "app.tagline": "Enough money, lighter life",
    "language.description.en":
      "English labels for the app shell and settings foundation",
    "language.description.th": "Thai remains Pordee's primary language",
    "language.helper":
      "Lingui currently powers the shell, navigation, and language settings before expanding into finance screens step by step.",
    "language.label.en": "English",
    "language.label.th": "Thai",
    "language.saveNote": "This preference is saved on this device",
    "language.title": "Language",
    "mobile.more": "More",
    "mobile.more.close": "Close",
    "mobile.more.closeLabel": "Close more menu",
    "mobile.more.navLabel": "More menu",
    "mobile.navLabel": "Main mobile navigation",
    "nav.add.description": "Add income and expenses",
    "nav.add.label": "Add",
    "nav.categories.countSuffix": "categories",
    "nav.dashboard.description": "See this month's overview",
    "nav.dashboard.label": "Home",
    "nav.goals.description": "Track savings step by step",
    "nav.goals.label": "Goals",
    "nav.history.description": "Search and edit transactions",
    "nav.history.label": "History",
    "nav.notifications.count": "Reminders",
    "nav.profile.countSuffix": "sign-in methods",
    "nav.security.count": "Password",
    "nav.settings.description": "Account and categories",
    "nav.settings.label": "Settings",
    "nav.wallet.description": "See available and reserved money",
    "nav.wallet.label": "Wallet",
    "settings.description": "Tune Pordee for your everyday workflow",
    "settings.navLabel": "Settings sections",
    "settings.tab.account": "Profile",
    "settings.tab.categories": "Categories",
    "settings.tab.language": "Language",
    "settings.tab.notifications": "Notifications",
    "settings.tab.security": "Security",
    "settings.title": "Settings",
    "shell.accountHint": "Pordee helps you stay grounded",
    "shell.addTransaction": "Add transaction",
    "shell.logout": "Log out",
    "shell.mainNav": "Main navigation",
  },
};

export function isPordeeLocale(value: string | null): value is PordeeLocale {
  return value === "th" || value === "en";
}
