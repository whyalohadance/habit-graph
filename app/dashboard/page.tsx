"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type Goal = { id: string; title: string; description: string | null };
type Task = {
  id: string;
  title: string;
  isRecurring: boolean;
  date: string | null;
  goalId: string | null;
  weight: number;
};
type ScorePoint = {
  date: string;
  smoothedScore: number;
  rawScore: number;
  completedCount: number;
  totalCount: number;
};

const today = new Date();

function toLocalDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const todayStr = toLocalDateString(today);

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload as ScorePoint;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-sm text-slate-400">День {label}</p>
      <p className="text-sm font-medium text-indigo-300">
        Выполнено {point.completedCount} из {point.totalCount} задач
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scores, setScores] = useState<ScorePoint[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [taskType, setTaskType] = useState<"recurring" | "today">("recurring");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadData = async () => {
    const [goalsRes, tasksRes, scoresRes] = await Promise.all([
      fetch("/api/goals"),
      fetch("/api/tasks"),
      fetch(
        `/api/scores?year=${today.getFullYear()}&month=${today.getMonth() + 1}`
      ),
    ]);
    setGoals(await goalsRes.json());
    setTasks(await tasksRes.json());
    const scoresData: ScorePoint[] = await scoresRes.json();
    setScores(
      scoresData.map((s) => ({
        ...s,
        date: new Date(s.date).getDate().toString(),
      }))
    );
  };

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newGoalTitle }),
    });
    setNewGoalTitle("");
    loadData();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const isRecurring = taskType === "recurring";

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskTitle,
        isRecurring,
        date: isRecurring ? null : todayStr,
        goalId: selectedGoalId || null,
      }),
    });
    setNewTaskTitle("");
    loadData();
  };

  const toggleTask = async (taskId: string) => {
    const isCompleted = completedToday.has(taskId);
    await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayStr, completed: !isCompleted }),
    });

    const updated = new Set(completedToday);
    if (isCompleted) {
      updated.delete(taskId);
    } else {
      updated.add(taskId);
    }
    setCompletedToday(updated);
    loadData();
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Загрузка...
      </div>
    );
  }

  const recurringTasks = tasks.filter((t) => t.isRecurring);
  const todayOnlyTasks = tasks.filter(
    (t) => !t.isRecurring && t.date && toLocalDateString(new Date(t.date)) === todayStr
  );

  const renderTask = (task: Task) => (
    <label
      key={task.id}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/50 px-4 py-3 hover:bg-slate-800"
    >
      <input
        type="checkbox"
        checked={completedToday.has(task.id)}
        onChange={() => toggleTask(task.id)}
        className="h-4 w-4 accent-indigo-500"
      />
      <span
        className={
          completedToday.has(task.id)
            ? "text-slate-500 line-through"
            : "text-white"
        }
      >
        {task.title}
      </span>
    </label>
  );

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Привет, {session?.user?.name || session?.user?.email}
            </h1>
            <p className="text-sm text-slate-400">
              {today.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Выйти
          </button>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-medium">
            Прогресс за {today.toLocaleDateString("ru-RU", { month: "long" })}
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={scores}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <ReferenceLine y={0} stroke="#334155" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="smoothedScore"
                stroke="#818cf8"
                strokeWidth={2.5}
                fill="url(#scoreGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        {/* Два столбца: глобальные цели + на сегодня */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-medium">Глобальные цели</h2>
            <div className="space-y-2">
              {recurringTasks.length === 0 && (
                <p className="text-sm text-slate-500">
                  Нет повторяющихся задач.
                </p>
              )}
              {recurringTasks.map(renderTask)}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-medium">На сегодня</h2>
            <div className="space-y-2">
              {todayOnlyTasks.length === 0 && (
                <p className="text-sm text-slate-500">
                  Нет разовых задач на сегодня.
                </p>
              )}
              {todayOnlyTasks.map(renderTask)}
            </div>
          </section>
        </div>

        {/* Добавление новой задачи */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-medium">Добавить задачу</h2>
          <form onSubmit={handleAddTask} className="space-y-3">
            <input
              type="text"
              placeholder="Название задачи..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={taskType}
                onChange={(e) =>
                  setTaskType(e.target.value as "recurring" | "today")
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="recurring">Глобальная (каждый день)</option>
                <option value="today">Только на сегодня</option>
              </select>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">Без цели</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
              >
                Добавить
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-medium">Твои цели</h2>
          <div className="space-y-2">
            {goals.length === 0 && (
              <p className="text-sm text-slate-500">
                Пока нет целей — добавь первую ниже.
              </p>
            )}
            {goals.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-slate-800 bg-slate-800/50 px-4 py-3"
              >
                {g.title}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddGoal} className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Новая цель (например: Учить математику)..."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
            >
              Добавить
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
