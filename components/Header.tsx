"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="shell flex items-center justify-between px-5 py-3">
        <div>
          <h1 className="text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-medium text-muted active:scale-95"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
