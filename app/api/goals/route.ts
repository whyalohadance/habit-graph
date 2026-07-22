import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    include: { tasks: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { title, description } = await request.json();

  if (!title) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: { title, description, userId: session.user.id },
  });

  return NextResponse.json(goal);
}
