import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalculateDailyScore } from "@/lib/score";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const { date, completed } = await request.json();

  // date приходит как "YYYY-MM-DD" - парсим вручную как локальную дату,
  // а не через new Date(string), который трактует такие строки как UTC
  const [year, month, day] = date.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  const task = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  await prisma.dailyCompletion.upsert({
    where: { taskId_date: { taskId: id, date: targetDate } },
    update: { completed },
    create: {
      taskId: id,
      userId: session.user.id,
      date: targetDate,
      completed,
    },
  });

  const score = await recalculateDailyScore(session.user.id, targetDate);

  return NextResponse.json({ success: true, score });
}
