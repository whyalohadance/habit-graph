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
