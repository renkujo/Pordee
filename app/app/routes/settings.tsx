import type { Route } from "./+types/settings";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { MascotTip } from "~/components/brand/mascot-state";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — ตั้งค่า" }];
}

export default function Settings() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-ink text-2xl font-semibold">ตั้งค่า</h1>
      <MascotTip mood="normal" title="พอดียังเก็บทุกอย่างไว้ในเครื่องนี้">
        ตอนนี้เป็นโหมดผู้ใช้คนเดียว ข้อมูลทดลองจะอยู่ใน session ของแอป
        ยังไม่มีการซิงก์บัญชีหรือเชื่อมธนาคาร
      </MascotTip>
      <Card>
        <CardHeader>
          <CardTitle>บัญชี</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm">โหมดผู้ใช้คนเดียว (Phase 0)</p>
        </CardContent>
      </Card>
    </div>
  );
}
