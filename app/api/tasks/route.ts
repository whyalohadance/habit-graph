import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { title, isRecurring, date, weight, goalId } = await request.json();

  if (!title) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      isRecurring: isRecurring ?? true,
      date: date ? new Date(date) : null,
      weight: weight ?? 1,
      goalId: goalId || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(task);
}
