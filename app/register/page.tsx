"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const emailInvalid =
    email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const canSubmit =
    email.length > 0 &&
    password.length >= 8 &&
    !emailInvalid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!canSubmit) {
      setError("Проверь email и пароль (минимум 8 символов)");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Ошибка регистрации");
      return;
    }

    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-white">Создать аккаунт</h1>
          <p className="text-sm text-slate-400">
            Начни отслеживать свои цели уже сегодня
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Имя</label>
          <input
            type="text"
            placeholder="Как тебя зовут"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-lg border bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-1 ${
              emailInvalid
                ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          {emailInvalid && (
            <p className="text-xs text-red-400">Похоже, email введён неверно</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Пароль</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Минимум 8 символов"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-lg border bg-slate-800 px-3 py-2 pr-10 text-white placeholder-slate-500 outline-none focus:ring-1 ${
                passwordTooShort
                  ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              tabIndex={-1}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
          {passwordTooShort && (
            <p className="text-xs text-red-400">
              Ещё {8 - password.length} символ(ов) до минимума
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
        </button>

        <p className="text-center text-sm text-slate-400">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}
