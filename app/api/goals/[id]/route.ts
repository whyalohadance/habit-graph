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

  const goal = await prisma.goal.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!goal) {
    return NextResponse.json({ error: "Цель не найдена" }, { status: 404 });
  }

  await prisma.goal.delete({ where: { id } });

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
  const { title, description } = await request.json();

  const goal = await prisma.goal.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!goal) {
    return NextResponse.json({ error: "Цель не найдена" }, { status: 404 });
  }

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json(updated);
}
