import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const { title, weight, goalId } = await request.json();

  const task = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(weight !== undefined && { weight }),
      ...(goalId !== undefined && { goalId: goalId || null }),
    },
  });

  return NextResponse.json(updated);
}
