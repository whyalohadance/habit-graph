import { prisma } from "@/lib/prisma";

// Насколько сильно вчерашнее значение графика влияет на сегодняшнее (0-1).
// Ниже значение = быстрее реагирует график на изменения (но всё ещё плавно).
const SMOOTHING = 0.7;

async function computeAndSaveDay(userId: string, dayStart: Date) {
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

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

  const rawScore = totalWeight > 0 ? completedWeight / totalWeight : 0;

  // Если в этот день вообще не было задач - день нейтральный, не наказываем и не поощряем.
  // Иначе превращаем долю выполненного в очки: 100% = +10, 0% = -10, 50% = 0.
  let dailyPoints = totalWeight > 0 ? (rawScore - 0.5) * 20 : 0;

  // Смягчаем падение при пропусках: рост за выполнение идёт в полную силу,
  // а спад за невыполнение - вполовину мягче, чтобы несколько дней молчания
  // не обнуляли прогресс за месяц слишком резко, но честно продолжали тянуть вниз.
  if (dailyPoints < 0) {
    dailyPoints *= 0.5;
  }

  const prevDay = new Date(dayStart);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevScore = await prisma.dailyScore.findUnique({
    where: { userId_date: { userId, date: prevDay } },
  });
  const prevSmoothed = prevScore?.smoothedScore ?? 0;

  const smoothedScore =
    prevSmoothed * SMOOTHING + dailyPoints * (1 - SMOOTHING) * 10;

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

// Если между последним посчитанным днём и текущим есть "дыра" (пользователь
// не заходил в приложение несколько дней подряд), досчитываем пропущенные дни
// по порядку, чтобы график не терял накопленный прогресс и корректно
// показывал спад за реально пропущенные дни.
async function backfillGapIfNeeded(userId: string, dayStart: Date) {
  const prevDay = new Date(dayStart);
  prevDay.setDate(prevDay.getDate() - 1);

  const immediatePrev = await prisma.dailyScore.findUnique({
    where: { userId_date: { userId, date: prevDay } },
  });
  if (immediatePrev) return; // разрыва нет, всё как обычно

  const lastKnown = await prisma.dailyScore.findFirst({
    where: { userId, date: { lt: dayStart } },
    orderBy: { date: "desc" },
  });
  if (!lastKnown) return; // истории вообще ещё нет, это первый день

  const cursor = new Date(lastKnown.date);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor < dayStart) {
    await computeAndSaveDay(userId, new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
}

export async function recalculateDailyScore(userId: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  await backfillGapIfNeeded(userId, dayStart);
  return computeAndSaveDay(userId, dayStart);
}
