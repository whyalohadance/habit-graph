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
    <div className="rounded-xl border border-[#D2D2D7]/60 bg-white/95 px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <p className="text-xs text-[#86868B]">День {label}</p>
      <p className="text-sm font-medium text-[#1D1D1F]">
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
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [streaks, setStreaks] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadData = async () => {
    const [goalsRes, tasksRes, scoresRes, streaksRes] = await Promise.all([
      fetch("/api/goals"),
      fetch("/api/tasks"),
      fetch(`/api/scores?year=${viewYear}&month=${viewMonth}`),
      fetch("/api/streaks"),
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
    setStreaks(await streaksRes.json());
  };

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status, viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    const isCurrentMonth =
      viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;
    if (isCurrentMonth) return;
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const monthLabel = new Date(viewYear, viewMonth - 1).toLocaleDateString(
    "ru-RU",
    { month: "long", year: "numeric" }
  );

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

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

  const deleteTask = async (taskId: string) => {
    if (!confirm("Удалить эту задачу?")) return;
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    loadData();
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditValue(task.title);
  };

  const saveTaskTitle = async (taskId: string) => {
    if (!editValue.trim()) {
      setEditingTaskId(null);
      return;
    }
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editValue.trim() }),
    });
    setEditingTaskId(null);
    loadData();
  };

  const startEditingGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditValue(goal.title);
  };

  const saveGoalTitle = async (goalId: string) => {
    if (!editValue.trim()) {
      setEditingGoalId(null);
      return;
    }
    await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editValue.trim() }),
    });
    setEditingGoalId(null);
    loadData();
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] text-[#86868B]">
        Загрузка...
      </div>
    );
  }

  const isNewUser = goals.length === 0 && tasks.length === 0;

  const recurringTasks = tasks.filter((t) => t.isRecurring);
  const todayOnlyTasks = tasks.filter(
    (t) => !t.isRecurring && t.date && toLocalDateString(new Date(t.date)) === todayStr
  );

  const groupByGoal = (list: Task[]) => {
    const groups: { goalId: string | null; goalTitle: string; tasks: Task[] }[] = [];
    for (const g of goals) {
      const matched = list.filter((t) => t.goalId === g.id);
      if (matched.length > 0) {
        groups.push({ goalId: g.id, goalTitle: g.title, tasks: matched });
      }
    }
    const noGoalTasks = list.filter(
      (t) => !t.goalId || !goals.some((g) => g.id === t.goalId)
    );
    if (noGoalTasks.length > 0) {
      groups.push({ goalId: null, goalTitle: "Без цели", tasks: noGoalTasks });
    }
    return groups;
  };

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className="group flex items-center gap-3 rounded-xl border border-[#D2D2D7]/60 bg-white px-4 py-3 transition-all duration-200 hover:border-[#D2D2D7] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
    >
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={completedToday.has(task.id)}
          onChange={() => toggleTask(task.id)}
          className="h-4 w-4 accent-[#0071E3] transition-transform duration-150 active:scale-90"
        />
        {task.isRecurring && streaks[task.id] > 0 && (
          <span className="whitespace-nowrap rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
            🔥 {streaks[task.id]}
          </span>
        )}
        {editingTaskId === task.id ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveTaskTitle(task.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTaskTitle(task.id);
              if (e.key === "Escape") setEditingTaskId(null);
            }}
            onClick={(e) => e.preventDefault()}
            className="flex-1 rounded-lg border border-[#0071E3] bg-white px-2 py-1 text-sm text-[#1D1D1F] outline-none"
          />
        ) : (
          <span
            onClick={(e) => {
              e.preventDefault();
              startEditingTask(task);
            }}
            className={
              completedToday.has(task.id)
                ? "text-[#86868B] line-through"
                : "cursor-text text-[#1D1D1F] transition-colors hover:text-[#0071E3]"
            }
          >
            {task.title}
          </span>
        )}
      </label>
      <button
        onClick={() => deleteTask(task.id)}
        className="text-[#D2D2D7] opacity-0 transition-all duration-150 hover:text-red-500 group-hover:opacity-100"
        title="Удалить задачу"
      >
        ✕
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <nav className="sticky top-0 z-10 border-b border-[#D2D2D7]/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-[15px] font-semibold text-[#1D1D1F]">
            Habit Graph
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full border border-[#D2D2D7] px-4 py-1.5 text-sm text-[#1D1D1F] transition-all duration-150 hover:bg-[#F5F5F7] active:scale-[0.97]"
          >
            Выйти
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:space-y-8 sm:px-4 sm:py-8">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Привет, {session?.user?.name || session?.user?.email}
          </h1>
          <p className="mt-1 text-[#6E6E73]">
            {today.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <section className="delay-100 animate-fade-in-up rounded-3xl border border-[#D2D2D7]/60 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium capitalize sm:text-lg">
              Прогресс за {monthLabel}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevMonth}
                className="rounded-full border border-[#D2D2D7] px-3 py-1.5 text-sm text-[#1D1D1F] transition-all duration-150 hover:bg-[#F5F5F7] active:scale-[0.95]"
              >
                ←
              </button>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className="rounded-full border border-[#D2D2D7] px-3 py-1.5 text-sm text-[#1D1D1F] transition-all duration-150 hover:bg-[#F5F5F7] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100"
              >
                →
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={scores}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34C759" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="date" stroke="#86868B" fontSize={12} />
              <YAxis stroke="#86868B" fontSize={12} />
              <ReferenceLine y={0} stroke="#D2D2D7" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="smoothedScore"
                stroke="#34C759"
                strokeWidth={2.5}
                fill="url(#scoreGradient)"
                dot={false}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        {isNewUser && (
          <section className="delay-200 animate-fade-in-up rounded-3xl border border-[#0071E3]/20 bg-[#0071E3]/5 p-6 text-center">
            <p className="text-2xl">👋</p>
            <h2 className="mt-2 text-lg font-medium text-[#1D1D1F]">
              Добро пожаловать в Habit Graph!
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#6E6E73]">
              Здесь всё просто: добавь <span className="text-[#0071E3]">цель</span> (например
              «Учить математику» или «Тренировка»), затем добавь к ней задачи.
              Отмечай их выполненными каждый день — график выше будет расти.
              Пропустишь день — график плавно пойдёт вниз.
            </p>
            <p className="mt-3 text-sm text-[#86868B]">
              Начни с формы «Твои цели» внизу страницы ↓
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="delay-200 animate-fade-in-up rounded-3xl border border-[#D2D2D7]/60 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <h2 className="mb-4 text-lg font-medium">Глобальные цели</h2>
            {recurringTasks.length === 0 ? (
              <p className="text-sm text-[#86868B]">
                {isNewUser
                  ? "Сюда попадут задачи, которые нужно делать каждый день."
                  : "Нет повторяющихся задач."}
              </p>
            ) : (
              <div className="space-y-4">
                {groupByGoal(recurringTasks).map((group) => (
                  <div key={group.goalId ?? "none"}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#86868B]">
                      {group.goalTitle}
                    </p>
                    <div className="space-y-2">{group.tasks.map(renderTask)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="delay-200 animate-fade-in-up rounded-3xl border border-[#D2D2D7]/60 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <h2 className="mb-4 text-lg font-medium">На сегодня</h2>
            {todayOnlyTasks.length === 0 ? (
              <p className="text-sm text-[#86868B]">
                {isNewUser
                  ? "А сюда — разовые задачи только на сегодняшний день."
                  : "Нет разовых задач на сегодня."}
              </p>
            ) : (
              <div className="space-y-4">
                {groupByGoal(todayOnlyTasks).map((group) => (
                  <div key={group.goalId ?? "none"}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#86868B]">
                      {group.goalTitle}
                    </p>
                    <div className="space-y-2">{group.tasks.map(renderTask)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-[#D2D2D7]/60 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 text-lg font-medium">Добавить задачу</h2>
          <form onSubmit={handleAddTask} className="space-y-3">
            <input
              type="text"
              placeholder="Название задачи..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full rounded-xl border border-[#D2D2D7] bg-white px-3.5 py-2.5 text-sm outline-none transition-all duration-200 focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select
                value={taskType}
                onChange={(e) =>
                  setTaskType(e.target.value as "recurring" | "today")
                }
                className="rounded-xl border border-[#D2D2D7] bg-white px-3.5 py-2.5 text-sm text-[#1D1D1F]"
              >
                <option value="recurring">Глобальная (каждый день)</option>
                <option value="today">Только на сегодня</option>
              </select>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="rounded-xl border border-[#D2D2D7] bg-white px-3.5 py-2.5 text-sm text-[#1D1D1F]"
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
                className="rounded-full bg-[#0071E3] px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-[#0077ED] active:scale-[0.97]"
              >
                Добавить
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-[#D2D2D7]/60 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 text-lg font-medium">Твои цели</h2>
          <div className="space-y-2">
            {goals.length === 0 && (
              <p className="text-sm text-[#86868B]">
                {isNewUser
                  ? "Пока пусто. Впиши первую цель в поле ниже и нажми «Добавить» 👇"
                  : "Пока нет целей — добавь первую ниже."}
              </p>
            )}
            {goals.map((g) => (
              <div
                key={g.id}
                className="group flex items-center justify-between rounded-xl border border-[#D2D2D7]/60 bg-white px-4 py-3 transition-all duration-200 hover:border-[#D2D2D7] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                {editingGoalId === g.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveGoalTitle(g.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveGoalTitle(g.id);
                      if (e.key === "Escape") setEditingGoalId(null);
                    }}
                    className="flex-1 rounded-lg border border-[#0071E3] bg-white px-2 py-1 text-sm text-[#1D1D1F] outline-none"
                  />
                ) : (
                  <span
                    onClick={() => startEditingGoal(g)}
                    className="cursor-text text-[#1D1D1F] transition-colors hover:text-[#0071E3]"
                  >
                    {g.title}
                  </span>
                )}
                <button
                  onClick={async () => {
                    if (!confirm("Удалить эту цель?")) return;
                    await fetch(`/api/goals/${g.id}`, { method: "DELETE" });
                    loadData();
                  }}
                  className="text-[#D2D2D7] opacity-0 transition-all duration-150 hover:text-red-500 group-hover:opacity-100"
                  title="Удалить цель"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddGoal} className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Новая цель (например: Учить математику)..."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              className="flex-1 rounded-xl border border-[#D2D2D7] bg-white px-3.5 py-2.5 text-sm outline-none transition-all duration-200 focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]"
            />
            <button
              type="submit"
              className="rounded-full bg-[#0071E3] px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-[#0077ED] active:scale-[0.97]"
            >
              Добавить
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
