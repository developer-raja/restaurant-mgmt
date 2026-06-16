"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, Plus, AlertTriangle, UtensilsCrossed, ReceiptText, Package, TrendingUp, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/types";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Dashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [orders, setOrders] = useState(0);
  const [menuCount, setMenuCount] = useState(0);
  const [name, setName] = useState("");
  const [lowStock, setLowStock] = useState<{ id: string; name: string; qty: number; unit: string }[]>([]);

  useEffect(() => {
    (async () => {
      const since = startOfToday();
      const [ordRes, menuRes, invRes, userRes] = await Promise.all([
        supabase.from("orders").select("total").gte("created_at", since),
        supabase.from("menu_items").select("id", { count: "exact", head: true }),
        supabase.from("inventory_items").select("id,name,qty,unit,low_threshold"),
        supabase.auth.getUser(),
      ]);
      setName((userRes.data.user?.user_metadata?.name as string) || "");
      const ords = ordRes.data ?? [];
      setRevenue(ords.reduce((s, o) => s + Number(o.total), 0));
      setOrders(ords.length);
      setMenuCount(menuRes.count ?? 0);
      setLowStock(
        (invRes.data ?? [])
          .filter((i) => Number(i.qty) <= Number(i.low_threshold))
          .map((i) => ({ id: i.id, name: i.name, qty: Number(i.qty), unit: i.unit }))
      );
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <>
      <header className="flex items-start justify-between px-5 pt-6">
        <div>
          <p className="text-sm text-muted">Today</p>
          <h1 className="text-2xl font-bold">Good day, {name || "chef"}</h1>
        </div>
        <Link href="/settings" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-muted active:scale-95"><Settings size={20} /></Link>
      </header>

      <section className="grid grid-cols-2 gap-3 px-5 pt-4">
        <Stat label="Today's sales" value={loading ? "…" : money(revenue)} tone="brand" />
        <Stat label="Orders today" value={loading ? "…" : String(orders)} />
        <Stat label="Menu items" value={loading ? "…" : String(menuCount)} />
        <Stat label="Low stock" value={loading ? "…" : String(lowStock.length)} tone={lowStock.length ? "red" : "green"} />
      </section>

      <section className="px-5 pt-5">
        <Link
          href="/orders/new"
          className="flex items-center justify-between rounded-2xl bg-brand px-5 py-4 text-white shadow-lg shadow-orange-200 active:scale-[.99]"
        >
          <span className="font-semibold">New order</span>
          <Plus size={24} />
        </Link>
      </section>

      {lowStock.length > 0 && (
        <section className="px-5 pt-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted"><AlertTriangle size={15} className="text-red-500" /> Running low</h2>
          <div className="space-y-2">
            {lowStock.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3">
                <span className="font-medium">{i.name}</span>
                <span className="text-sm font-semibold text-red-600">
                  {i.qty} {i.unit}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 px-5 pt-5">
        <Tile href="/menu" icon={UtensilsCrossed} label="Manage menu" />
        <Tile href="/orders" icon={ReceiptText} label="View orders" />
        <Tile href="/inventory" icon={Package} label="Stock" />
        <Tile href="/reports" icon={TrendingUp} label="Sales report" />
      </section>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "brand" | "red" | "green" }) {
  const color =
    tone === "brand" ? "text-brand" : tone === "red" ? "text-red-600" : tone === "green" ? "text-green-600" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Tile({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-card p-4 active:scale-[.99]">
      <Icon size={24} className="text-brand" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
