import { z } from "zod";

export const passwordRules = [
  {
    id: "minLength",
    label: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "lowercase",
    label: "มีตัวพิมพ์เล็กอย่างน้อย 1 ตัว (a-z)",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    label: "มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "มีตัวเลขอย่างน้อย 1 ตัว (0-9)",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "special",
    label: "มีอักขระพิเศษ (@#$%)",
    test: (value: string) => /[@#$%]/.test(value),
  },
] as const;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรอกรหัสผ่านปัจจุบัน"),
    newPassword: z.string().min(1, "กรอกรหัสผ่านใหม่"),
    confirmPassword: z.string().min(1, "ยืนยันรหัสผ่านใหม่"),
  })
  .superRefine((value, ctx) => {
    if (!passwordRules.every((rule) => rule.test(value.newPassword))) {
      ctx.addIssue({
        code: "custom",
        message: "รหัสผ่านใหม่ยังไม่ผ่านเงื่อนไขทั้งหมด",
        path: ["newPassword"],
      });
    }

    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: "custom",
        message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน",
        path: ["newPassword"],
      });
    }

    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "รหัสผ่านใหม่และช่องยืนยันไม่ตรงกัน",
        path: ["confirmPassword"],
      });
    }
  });
