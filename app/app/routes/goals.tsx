import { Form, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/goals";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { MascotState, MascotTip } from "~/components/brand/mascot-state";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { repo } from "~/lib/db";
import { fmtBaht } from "~/lib/format/baht";
import { createGoalSchema } from "~/lib/validators/goal";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — เป้าหมาย" }];
}

export async function loader() {
  const goals = await repo.listGoals();
  return { goals };
}

interface ActionFieldErrors {
  name?: string;
  target?: string;
}

type ActionResult =
  | { ok: false; errors: ActionFieldErrors; values: Record<string, string> }
  | undefined;

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> {
  const form = await request.formData();
  const raw = {
    name: form.get("name"),
    target: form.get("target"),
  };

  const parsed = createGoalSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ActionFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "target") {
        errors[key] = issue.message;
      }
    }
    return {
      ok: false,
      errors,
      values: {
        name: String(raw.name ?? ""),
        target: String(raw.target ?? ""),
      },
    };
  }

  await repo.createGoal(parsed.data);
  return undefined;
}

export default function Goals() {
  const { goals } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-2xl font-semibold">เป้าหมาย</h1>
        <p className="text-muted text-sm">
          กันเงินไว้ให้เรื่องสำคัญแบบไม่ต้องกดดันตัวเอง
        </p>
      </div>

      <MascotTip
        mood={goals.length > 0 ? "saving" : "normal"}
        title={goals.length > 0 ? "พอดีเห็นเป้าหมายแล้ว" : "พอดีช่วยตั้งหลัก"}
      >
        {goals.length > 0
          ? `ตอนนี้กันเงินไว้แล้ว ${fmtBaht(totalSaved)} จากเป้าหมายรวม ${fmtBaht(totalTarget)} เติมทีละนิดก็ยังนับว่าเดินหน้า`
          : "เลือกเรื่องเดียวที่อยากกันเงินไว้ก่อน จำนวนไม่ต้องใหญ่ แค่ทำให้เริ่มเก็บง่ายขึ้น"}
      </MascotTip>

      {goals.length === 0 ? (
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>เป้าหมายที่กำลังเก็บ</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4" data-testid="goals-list">
              {goals.map((goal) => {
                const pct =
                  goal.target > 0
                    ? Math.min(
                        100,
                        Math.round((goal.saved / goal.target) * 100)
                      )
                    : 0;
                return (
                  <li key={goal.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-ink min-w-0 truncate text-sm font-medium">
                        {goal.name}
                      </p>
                      <p className="text-muted shrink-0 text-xs">
                        {fmtBaht(goal.saved)} / {fmtBaht(goal.target)}
                      </p>
                    </div>
                    <div
                      className="bg-line h-2 w-full overflow-hidden rounded-full"
                      aria-label={`คืบหน้า ${pct}%`}
                    >
                      <div
                        className="bg-teal h-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>เพิ่มเป้าหมาย</CardTitle>
          <CardDescription>
            ตั้งชื่อสั้น ๆ และจำนวนเงินที่อยากกันไว้
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="flex flex-col gap-4">
            <MascotTip mood="thinking" title="พอดีแนะนำ">
              ชื่อเป้าหมายควรเป็นสิ่งที่คุณจำได้ทันที เช่น กองทุนฉุกเฉิน
              หรือค่าทริป ไม่ต้องใส่รายละเอียดเยอะในรอบแรก
            </MascotTip>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-name">ชื่อเป้าหมาย</Label>
              <Input
                id="goal-name"
                name="name"
                defaultValue={actionData?.values?.name ?? ""}
                placeholder="กองทุนฉุกเฉิน"
                required
              />
              {actionData && !actionData.ok && actionData.errors.name && (
                <p className="text-coral-strong text-sm">
                  {actionData.errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">จำนวนเงินเป้าหมาย (บาท)</Label>
              <Input
                id="goal-target"
                name="target"
                type="number"
                inputMode="decimal"
                step="0.01"
                defaultValue={actionData?.values?.target ?? ""}
                placeholder="5000"
                required
              />
              {actionData && !actionData.ok && actionData.errors.target && (
                <p className="text-coral-strong text-sm">
                  {actionData.errors.target}
                </p>
              )}
            </div>

            <Button type="submit">เพิ่มเป้าหมาย</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
