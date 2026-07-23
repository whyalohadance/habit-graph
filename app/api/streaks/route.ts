import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStreaksForTasks } from "@/lib/streak";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id, isRecurring: true },
    select: { id: true },
  });

  const streaks = await getStreaksForTasks(
    tasks.map((t) => t.id),
    session.user.id
  );

  return NextResponse.json(streaks);
}
