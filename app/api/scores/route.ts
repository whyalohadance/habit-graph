import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`);
  const month = parseInt(searchParams.get("month") || `${new Date().getMonth() + 1}`);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const scores = await prisma.dailyScore.findMany({
    where: {
      userId: session.user.id,
      date: { gte: start, lt: end },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(scores);
}
