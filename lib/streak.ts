import { prisma } from "@/lib/prisma";

// Считает текущий стрик (дней подряд без пропуска) для конкретной задачи.
export async function getTaskStreak(taskId: string, userId: string): Promise<number> {
  const completions = await prisma.dailyCompletion.findMany({
    where: { taskId, userId, completed: true },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (completions.length === 0) return 0;

  const completedDates = new Set(
    completions.map((c) => c.date.toISOString().split("T")[0])
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Если сегодня ещё не выполнено - начинаем проверку со вчера
  // (чтобы не обнулять стрик раньше времени в течение дня)
  const todayStr = cursor.toISOString().split("T")[0];
  if (!completedDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (completedDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Считает стрики для всех переданных задач разом (эффективнее, чем по одной)
export async function getStreaksForTasks(
  taskIds: string[],
  userId: string
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const taskId of taskIds) {
    result[taskId] = await getTaskStreak(taskId, userId);
  }
  return result;
}
