"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. If email confirmation is on, check your inbox — otherwise sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell min-h-dvh flex flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-orange-200">
          <ChefHat size={34} strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-bold">Kitchen Nova</h1>
        <p className="text-sm text-muted">Run your kitchen from your phone.</p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-bg p-1 text-sm font-medium">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setMsg(null); }}
              className={`rounded-lg py-2 transition ${
                mode === m ? "bg-card shadow-sm text-ink" : "text-muted"
              }`}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-brand"
            placeholder="you@restaurant.com"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-brand"
            placeholder="••••••"
          />
        </label>

        {msg && <p className="text-sm text-brand-ink">{msg}</p>}

        <button
          disabled={busy}
          className="w-full rounded-xl bg-brand py-3 font-semibold text-white shadow-sm active:scale-[.99] disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        First time? Tap <b>Sign up</b> to create your owner account.
      </p>
    </main>
  );
}
