import "dotenv/config";
import { prisma } from "../lib/prisma";
import { recalculateDailyScore } from "../lib/score";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Использование: npx tsx scripts/seed-history.ts твой@email.com");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("Пользователь не найден");
    process.exit(1);
  }

  const tasks = await prisma.task.findMany({ where: { userId: user.id } });
  if (tasks.length === 0) {
    console.error("У пользователя нет задач - сначала добавь хотя бы одну в приложении");
    process.exit(1);
  }

  for (let i = 20; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    for (const task of tasks) {
      const completed = Math.random() > 0.25;
      await prisma.dailyCompletion.upsert({
        where: { taskId_date: { taskId: task.id, date } },
        update: { completed },
        create: { taskId: task.id, userId: user.id, date, completed },
      });
    }

    await recalculateDailyScore(user.id, date);
    console.log(`День ${date.toISOString().split("T")[0]} обработан`);
  }

  console.log("Готово! Обнови страницу /dashboard");
  process.exit(0);
}

main();
