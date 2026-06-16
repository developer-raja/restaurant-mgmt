"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, Smartphone, CreditCard, Wallet, Download, type LucideIcon } from "lucide-react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { money, type Order, type OrderItem, type Expense } from "@/lib/types";

type Row = Order & { order_items: OrderItem[] };
type Preset = "today" | "7d" | "30d" | "month" | "custom";

function startOf(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export default function ReportsPage() {
  const supabase = createClient();
  const [preset, setPreset] = useState<Preset>("7d");
  const [cFrom, setCFrom] = useState(ymd(new Date()));
  const [cTo, setCTo] = useState(ymd(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // resolve the active [from, to] window
  const range = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    if (preset === "today") return { from: startOf(now), to: end };
    if (preset === "7d") { const f = startOf(now); f.setDate(f.getDate() - 6); return { from: f, to: end }; }
    if (preset === "30d") { const f = startOf(now); f.setDate(f.getDate() - 29); return { from: f, to: end }; }
    if (preset === "month") { const f = new Date(now.getFullYear(), now.getMonth(), 1); return { from: f, to: end }; }
    const f = new Date(cFrom + "T00:00:00");
    const t = new Date(cTo + "T23:59:59");
    return { from: f, to: t };
  }, [preset, cFrom, cTo]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ordRes, expRes] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)")
          .gte("created_at", range.from.toISOString()).lte("created_at", range.to.toISOString())
          .order("created_at", { ascending: false }),
        supabase.from("expenses").select("*")
          .gte("spent_on", ymd(range.from)).lte("spent_on", ymd(range.to)),
      ]);
      setRows((ordRes.data as Row[]) ?? []);
      setExpenses((expRes.data as Expense[]) ?? []);
      setLoading(false);
    })();
  }, [supabase, range]);

  const stats = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + Number(r.total), 0);
    const cogs = rows.reduce((s, r) => s + (r.order_items?.reduce((a, li) => a + Number(li.cost) * li.qty, 0) ?? 0), 0);
    const expTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const gross = revenue - cogs;
    const net = gross - expTotal;
    const orders = rows.length;

    // daily buckets across range (cap 31 days)
    const days: { label: string; rev: number }[] = [];
    const dayMs = 86400000;
    const f = startOf(range.from).getTime();
    const t = startOf(range.to).getTime();
    const nDays = Math.floor((t - f) / dayMs) + 1;
    if (nDays >= 1 && nDays <= 31) {
      for (let i = 0; i < nDays; i++) {
        const d0 = f + i * dayMs;
        const d1 = d0 + dayMs;
        const rev = rows.filter((r) => { const x = new Date(r.created_at).getTime(); return x >= d0 && x < d1; })
          .reduce((s, r) => s + Number(r.total), 0);
        days.push({ label: new Date(d0).toLocaleDateString("en-IN", nDays > 9 ? { day: "numeric" } : { weekday: "short" }), rev });
      }
    }

    // top items by revenue
    const map = new Map<string, { qty: number; rev: number; cost: number }>();
    rows.forEach((r) => r.order_items?.forEach((li) => {
      const e = map.get(li.name) || { qty: 0, rev: 0, cost: 0 };
      e.qty += li.qty; e.rev += Number(li.price) * li.qty; e.cost += Number(li.cost) * li.qty;
      map.set(li.name, e);
    }));
    const top = [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.rev - a.rev).slice(0, 6);

    const pay = { cash: 0, upi: 0, card: 0 } as Record<string, number>;
    rows.forEach((r) => { pay[r.payment_method] = (pay[r.payment_method] || 0) + Number(r.total); });

    return { revenue, cogs, expTotal, gross, net, orders, days, top, pay };
  }, [rows, expenses, range]);

  function exportCsv() {
    const head = ["Date", "Items", "Payment", "Status", "Tax", "Total"];
    const lines = rows.map((r) => [
      new Date(r.created_at).toLocaleString("en-IN"),
      (r.order_items ?? []).map((li) => `${li.qty}x ${li.name}`).join("; "),
      r.payment_method, r.status, String(r.tax ?? 0), String(r.total),
    ]);
    const csv = [head, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sales_${ymd(range.from)}_${ymd(range.to)}.csv`;
    a.click();
  }

  const max = Math.max(1, ...stats.days.map((d) => d.rev));

  return (
    <>
      <Header title="Sales & Profit" subtitle="Money in, money out" />

      {/* date range */}
      <div className="px-5 pt-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-card p-1 text-sm">
          {([["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["month", "This month"], ["custom", "Custom"]] as [Preset, string][])
            .map(([k, lbl]) => (
              <button key={k} onClick={() => setPreset(k)}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium ${preset === k ? "bg-brand text-white" : "text-muted"}`}>
                {lbl}
              </button>
            ))}
        </div>
        {preset === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <input type="date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} className="inp flex-1" />
            <span className="text-muted">→</span>
            <input type="date" value={cTo} onChange={(e) => setCTo(e.target.value)} className="inp flex-1" />
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {loading && <p className="text-sm text-muted">Loading…</p>}

        {/* P/L summary */}
        <div className="rounded-2xl border border-line bg-card p-5">
          <PLrow label="Revenue (sales)" value={money(stats.revenue)} />
          <PLrow label="− Food cost" value={"−" + money(stats.cogs)} muted />
          <div className="my-2 border-t border-line" />
          <PLrow label="Gross profit" value={money(stats.gross)} bold />
          <PLrow label="− Expenses" value={"−" + money(stats.expTotal)} muted />
          <div className="my-2 border-t border-line" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Net {stats.net >= 0 ? "profit" : "loss"}</span>
            <span className={`text-2xl font-bold ${stats.net >= 0 ? "text-green-600" : "text-red-600"}`}>{money(stats.net)}</span>
          </div>
          <p className="mt-1 text-xs text-muted">{stats.orders} orders in range</p>
        </div>

        {/* payment split */}
        <div className="grid grid-cols-3 gap-3">
          <PayStat icon={Banknote} label="Cash" value={money(stats.pay.cash)} />
          <PayStat icon={Smartphone} label="UPI" value={money(stats.pay.upi)} />
          <PayStat icon={CreditCard} label="Card" value={money(stats.pay.card)} />
        </div>

        <div className="flex gap-3">
          <Link href="/expenses" className="flex flex-1 items-center justify-between rounded-2xl border border-line bg-card px-5 py-4 active:scale-[.99]">
            <span className="flex items-center gap-2 font-medium"><Wallet size={18} className="text-muted" /> Expenses</span>
            <span className="text-muted">{money(stats.expTotal)} →</span>
          </Link>
          <button onClick={exportCsv} className="flex items-center gap-2 rounded-2xl border border-line bg-card px-5 py-4 font-medium active:scale-[.99]"><Download size={18} /> CSV</button>
        </div>

        {stats.days.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Daily sales</p>
            <div className="flex h-32 items-end justify-between gap-1">
              {stats.days.map((d, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t-md bg-brand" style={{ height: `${(d.rev / max) * 100}%`, minHeight: d.rev ? 4 : 0 }} />
                  </div>
                  <span className="text-[9px] text-muted">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Top items</p>
          {stats.top.length === 0 && <p className="text-sm text-muted">No sales in range.</p>}
          <div className="space-y-2">
            {stats.top.map((t, i) => (
              <div key={t.name} className="flex items-center justify-between">
                <span className="text-sm"><b className="mr-1 text-muted">{i + 1}.</b>{t.name} <span className="text-muted">×{t.qty}</span></span>
                <span className="text-sm"><span className="font-semibold">{money(t.rev)}</span> <span className="text-green-600">+{money(t.rev - t.cost)}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`.inp{width:100%;border-radius:0.75rem;border:1px solid var(--line);background:var(--card);padding:0.6rem 0.9rem;outline:none}.inp:focus{border-color:var(--brand)}`}</style>
    </>
  );
}

function PayStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3 text-center">
      <Icon size={16} className="mx-auto text-muted" />
      <p className="mt-0.5 text-xs text-muted">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function PLrow({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${muted ? "text-muted" : ""} ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${muted ? "text-muted" : ""}`}>{value}</span>
    </div>
  );
}
