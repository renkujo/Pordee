import type { Route } from "./+types/goals";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { MascotState } from "~/components/brand/mascot-state";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — เป้าหมาย" }];
}

export default function Goals() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-ink text-2xl font-semibold">เป้าหมาย</h1>
      <Card>
        <CardHeader>
          <CardTitle>ยังไม่มีเป้าหมาย</CardTitle>
        </CardHeader>
        <CardContent>
          <MascotState
            mood="saving"
            title="เริ่มจากเป้าหมายเล็ก ๆ ก่อนก็พอดี"
            description="เลือกเรื่องที่อยากกันเงินไว้ แล้วค่อยเติมทีละนิดตามจังหวะของคุณ"
          />
        </CardContent>
      </Card>
    </div>
  );
}
