"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { PackagePlus, Pencil, Trash2 } from "lucide-react";
import { money, type InventoryItem } from "@/lib/types";

const EMPTY = { id: "", name: "", qty: "", unit: "pcs", low_threshold: "", unit_cost: "" };
function today() { return new Date().toISOString().slice(0, 10); }

export default function InventoryPage() {
  const supabase = createClient();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const editing = !!form.id;
  const [buy, setBuy] = useState<{ item: InventoryItem; qty: string; unit_price: string; bought_on: string } | null>(null);

  async function load() {
    const { data } = await supabase.from("inventory_items").select("*").order("name");
    setItems((data as InventoryItem[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function adjust(it: InventoryItem, delta: number) {
    const next = Math.max(0, Number(it.qty) + delta);
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, qty: next } : x)));
    await supabase.from("inventory_items").update({ qty: next }).eq("id", it.id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = {
      name: form.name.trim(),
      qty: Number(form.qty) || 0,
      unit: form.unit.trim() || "pcs",
      low_threshold: Number(form.low_threshold) || 0,
      unit_cost: Number(form.unit_cost) || 0,
    };
    if (editing) await supabase.from("inventory_items").update(row).eq("id", form.id);
    else await supabase.from("inventory_items").insert(row);
    setOpen(false); setForm(EMPTY); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this stock item?")) return;
    await supabase.from("inventory_items").delete().eq("id", id);
    load();
  }

  // stock-in: bump qty, update cost, log purchase + auto-expense
  async function savePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!buy) return;
    const q = Number(buy.qty) || 0;
    const up = Number(buy.unit_price) || 0;
    const amount = Math.round(q * up * 100) / 100;
    const newQty = Number(buy.item.qty) + q;
    await supabase.from("inventory_items").update({ qty: newQty, unit_cost: up || buy.item.unit_cost }).eq("id", buy.item.id);
    await supabase.from("stock_purchases").insert({ inventory_item_id: buy.item.id, qty: q, unit_price: up, amount, bought_on: buy.bought_on });
    await supabase.from("expenses").insert({ category: "Stock purchase", amount, note: `${buy.item.name} ×${q}${buy.item.unit}`, spent_on: buy.bought_on });
    setBuy(null); load();
  }

  return (
    <>
      <Header title="Stock" subtitle={`${items.length} items`} />
      <div className="px-5 py-4 space-y-3">
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted">
            No stock tracked yet.
          </div>
        )}
        {items.map((it) => {
          const low = Number(it.qty) <= Number(it.low_threshold);
          return (
            <div key={it.id} className={`rounded-2xl border bg-card p-4 ${low ? "border-red-300" : "border-line"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{it.name} {low && <span className="text-xs text-red-600">· low</span>}</p>
                  <p className="text-xs text-muted">alert ≤ {it.low_threshold} {it.unit} · {money(it.unit_cost)}/{it.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBuy({ item: it, qty: "", unit_price: String(it.unit_cost || ""), bought_on: today() })} className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700"><PackagePlus size={14} /> Buy</button>
                  <button onClick={() => { setForm({ id: it.id, name: it.name, qty: String(it.qty), unit: it.unit, low_threshold: String(it.low_threshold), unit_cost: String(it.unit_cost) }); setOpen(true); }} className="text-muted"><Pencil size={18} /></button>
                  <button onClick={() => del(it.id)} className="text-muted"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button onClick={() => adjust(it, -1)} className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-2xl font-bold">−</button>
                <span className={`text-2xl font-bold ${low ? "text-red-600" : ""}`}>{it.qty} <span className="text-sm font-normal text-muted">{it.unit}</span></span>
                <button onClick={() => adjust(it, 1)} className="grid h-10 w-10 place-items-center rounded-full bg-brand text-2xl font-bold text-white">+</button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => { setForm(EMPTY); setOpen(true); }}
        className="fixed bottom-28 left-1/2 z-20 -translate-x-1/2 rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-orange-300 active:scale-95">
        + Add stock
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="shell w-full space-y-3 rounded-t-3xl bg-card p-5 pb-8">
            <div className="mx-auto h-1 w-10 rounded-full bg-line" />
            <h2 className="text-lg font-bold">{editing ? "Edit stock" : "New stock item"}</h2>
            <label className="block">
              <span className="text-xs font-medium text-muted">Name</span>
              <input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Chicken (kg)" className="inp mt-1" />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-muted">Qty</span>
                <input type="number" inputMode="decimal" required value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="10" className="inp mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Unit</span>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg" className="inp mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Low at</span>
                <input type="number" inputMode="decimal" value={form.low_threshold} onChange={(e) => setForm({ ...form, low_threshold: e.target.value })} placeholder="2" className="inp mt-1" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted">Cost price — ₹ per {form.unit || "unit"} (what you pay)</span>
              <input type="number" inputMode="decimal" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} placeholder="200" className="inp mt-1" />
            </label>
            <button className="w-full rounded-xl bg-brand py-3 font-semibold text-white active:scale-[.99]">
              {editing ? "Save" : "Add stock"}
            </button>
          </form>
        </div>
      )}
      {buy && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={() => setBuy(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={savePurchase} className="shell w-full space-y-3 rounded-t-3xl bg-card p-5 pb-8">
            <div className="mx-auto h-1 w-10 rounded-full bg-line" />
            <h2 className="text-lg font-bold">Buy stock — {buy.item.name}</h2>
            <p className="text-xs text-muted">Adds to stock + logs a “Stock purchase” expense.</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-muted">Qty bought ({buy.item.unit})</span>
                <input autoFocus type="number" inputMode="decimal" step="0.01" required value={buy.qty} onChange={(e) => setBuy({ ...buy, qty: e.target.value })} placeholder="5" className="inp mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Price per {buy.item.unit} (₹)</span>
                <input type="number" inputMode="decimal" step="0.01" required value={buy.unit_price} onChange={(e) => setBuy({ ...buy, unit_price: e.target.value })} placeholder="220" className="inp mt-1" />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted">Date</span>
              <input type="date" value={buy.bought_on} onChange={(e) => setBuy({ ...buy, bought_on: e.target.value })} className="inp mt-1" />
            </label>
            <div className="flex items-center justify-between rounded-xl bg-bg px-4 py-2 text-sm">
              <span className="text-muted">Total cost</span>
              <span className="font-semibold">{money((Number(buy.qty) || 0) * (Number(buy.unit_price) || 0))}</span>
            </div>
            <button className="w-full rounded-xl bg-brand py-3 font-semibold text-white active:scale-[.99]">Add to stock</button>
          </form>
        </div>
      )}

      <style>{`.inp{width:100%;border-radius:0.75rem;border:1px solid var(--line);background:var(--bg);padding:0.75rem 1rem;outline:none}.inp:focus{border-color:var(--brand)}`}</style>
    </>
  );
}
