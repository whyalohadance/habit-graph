"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Неверный email или пароль");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F7]">
      <nav className="sticky top-0 z-10 animate-fade-in-up border-b border-[#D2D2D7]/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <span className="text-[15px] font-semibold text-[#1D1D1F]">
            Habit Graph
          </span>
        </div>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="animate-fade-in-up mb-10 max-w-lg text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[#1D1D1F] sm:text-5xl">
            Welcome back.
          </h1>
          <p className="mt-3 text-lg text-[#6E6E73]">
            Your graph&apos;s been waiting.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="delay-100 animate-fade-in-up w-full max-w-sm space-y-5 rounded-3xl border border-[#D2D2D7]/60 bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_4px_32px_rgba(0,0,0,0.08)]"
        >
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-[#1D1D1F]">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#D2D2D7] bg-white px-3.5 py-2.5 text-[#1D1D1F] placeholder-[#86868B] outline-none transition-all duration-200 focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[#1D1D1F]">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#D2D2D7] bg-white px-3.5 py-2.5 pr-10 text-[#1D1D1F] placeholder-[#86868B] outline-none transition-all duration-200 focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#0071E3] py-3 font-medium text-white transition-all duration-150 hover:bg-[#0077ED] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? "Входим..." : "Войти"}
          </button>

          <p className="text-center text-sm text-[#6E6E73]">
            Нет аккаунта?{" "}
            <Link href="/register" className="text-[#0071E3] hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
