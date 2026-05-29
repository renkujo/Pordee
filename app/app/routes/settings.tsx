import type { Route } from "./+types/settings";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — ตั้งค่า" }];
}

export default function Settings() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-ink text-2xl font-semibold">ตั้งค่า</h1>
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
