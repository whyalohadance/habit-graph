import { prisma } from "@/lib/prisma";

// Насколько сильно вчерашнее значение графика влияет на сегодняшнее (0-1).
// Чем выше — тем плавнее график, тем дольше "выветривается" провал/подъём.
const SMOOTHING = 0.85;

// Считает и сохраняет балл за конкретный день для пользователя.
export async function recalculateDailyScore(userId: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Все задачи, которые "применимы" к этому дню:
  // повторяющиеся - всегда, разовые - только если date совпадает
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      OR: [
        { isRecurring: true },
        { isRecurring: false, date: { gte: dayStart, lt: dayEnd } },
      ],
    },
  });

  const completions = await prisma.dailyCompletion.findMany({
    where: {
      userId,
      date: { gte: dayStart, lt: dayEnd },
      completed: true,
    },
  });
  const completedTaskIds = new Set(completions.map((c) => c.taskId));

  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
  const completedWeight = tasks
    .filter((t) => completedTaskIds.has(t.id))
    .reduce((sum, t) => sum + t.weight, 0);

  // Доля выполненного за день, от 0 до 1. Если задач вообще не было - считаем как 0 (нейтральный день).
  const rawScore = totalWeight > 0 ? completedWeight / totalWeight : 0;

  // Превращаем долю в "очки дня": 100% выполнения = +10, 0% = -10, 50% = 0
  const dailyPoints = (rawScore - 0.5) * 20;

  // Берём вчерашнее сглаженное значение как базу
  const prevDay = new Date(dayStart);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevScore = await prisma.dailyScore.findUnique({
    where: { userId_date: { userId, date: prevDay } },
  });
  const prevSmoothed = prevScore?.smoothedScore ?? 0;

  // Экспоненциальное сглаживание: плавно двигаем график в сторону новых очков
  const smoothedScore = prevSmoothed * SMOOTHING + dailyPoints * (1 - SMOOTHING) * 10;

  await prisma.dailyScore.upsert({
    where: { userId_date: { userId, date: dayStart } },
    update: {
      rawScore,
      smoothedScore,
      completedCount: completedTaskIds.size,
      totalCount: tasks.length,
    },
    create: {
      userId,
      date: dayStart,
      rawScore,
      smoothedScore,
      completedCount: completedTaskIds.size,
      totalCount: tasks.length,
    },
  });

  return { rawScore, smoothedScore };
}
