"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, type Expense } from "@/lib/types";

const CATS = ["Rent", "Gas", "Salary", "Electricity", "Supplies", "Maintenance", "Other"];
function today() { const d = new Date(); return d.toISOString().slice(0, 10); }
const EMPTY = { category: "Rent", amount: "", note: "", spent_on: today() };

export default function ExpensesPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);

  async function load() {
    const { data } = await supabase.from("expenses").select("*").order("spent_on", { ascending: false }).limit(200);
    setItems((data as Expense[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("expenses").insert({
      category: form.category,
      amount: Number(form.amount) || 0,
      note: form.note.trim() || null,
      spent_on: form.spent_on,
    });
    setOpen(false); setForm(EMPTY); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  const total = items.reduce((s, e) => s + Number(e.amount), 0);
  const fmt = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="shell flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Link href="/reports" className="text-muted"><ArrowLeft size={20} /></Link>
            <div>
              <h1 className="text-lg font-bold leading-tight">Expenses</h1>
              <p className="text-xs text-muted">{items.length} entries · {money(total)} total</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 py-4 space-y-3">
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted">
            No expenses yet. Log rent, gas, salary…
          </div>
        )}
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
            <div className="flex-1">
              <p className="font-semibold">{e.category}{e.note ? <span className="font-normal text-muted"> · {e.note}</span> : null}</p>
              <p className="text-xs text-muted">{fmt(e.spent_on)}</p>
            </div>
            <span className="font-semibold text-red-600">−{money(e.amount)}</span>
            <button onClick={() => del(e.id)} className="text-muted"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>

      <button onClick={() => { setForm(EMPTY); setOpen(true); }}
        className="fixed bottom-28 left-1/2 z-20 -translate-x-1/2 rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-orange-300 active:scale-95">
        + Add expense
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="shell w-full space-y-3 rounded-t-3xl bg-card p-5 pb-8">
            <div className="mx-auto h-1 w-10 rounded-full bg-line" />
            <h2 className="text-lg font-bold">New expense</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-muted">Category</span>
                <input list="exp-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Rent / type your own" className="inp mt-1" />
                <datalist id="exp-cats">
                  {CATS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Amount (₹)</span>
                <input autoFocus type="number" inputMode="decimal" required value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000" className="inp mt-1" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted">Date</span>
              <input type="date" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} className="inp mt-1" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Note (optional)</span>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="June rent" className="inp mt-1" />
            </label>
            <button className="w-full rounded-xl bg-brand py-3 font-semibold text-white active:scale-[.99]">Add expense</button>
          </form>
        </div>
      )}
      <style>{`.inp{width:100%;border-radius:0.75rem;border:1px solid var(--line);background:var(--bg);padding:0.75rem 1rem;outline:none}.inp:focus{border-color:var(--brand)}`}</style>
    </>
  );
}
