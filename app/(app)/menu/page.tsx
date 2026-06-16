"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, type MenuItem, type InventoryItem, type RecipeItem } from "@/lib/types";

const EMPTY = { id: "", name: "", category: "General", price: "", available: true };
type Row = { inventory_item_id: string; qty_per_plate: string };

export default function MenuPage() {
  const supabase = createClient();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Record<string, RecipeItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const editing = !!form.id;

  async function load() {
    const [m, s, r] = await Promise.all([
      supabase.from("menu_items").select("*").order("created_at", { ascending: true }),
      supabase.from("inventory_items").select("*").order("name"),
      supabase.from("recipe_items").select("*"),
    ]);
    setItems((m.data as MenuItem[]) ?? []);
    setStock((s.data as InventoryItem[]) ?? []);
    const byItem: Record<string, RecipeItem[]> = {};
    ((r.data as RecipeItem[]) ?? []).forEach((ri) => {
      (byItem[ri.menu_item_id] ??= []).push(ri);
    });
    setRecipes(byItem);
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  // food cost per plate for a given menu id (or live rows in the sheet)
  const costOfRows = (rs: { inventory_item_id: string; qty_per_plate: string | number }[]) =>
    rs.reduce((sum, r) => {
      const inv = stock.find((s) => s.id === r.inventory_item_id);
      return sum + (inv ? Number(inv.unit_cost) * Number(r.qty_per_plate || 0) : 0);
    }, 0);
  const costOf = (menuId: string) => costOfRows(recipes[menuId] ?? []);

  function openEdit(it: MenuItem) {
    setForm({ id: it.id, name: it.name, category: it.category, price: String(it.price), available: it.available });
    setRows((recipes[it.id] ?? []).map((r) => ({ inventory_item_id: r.inventory_item_id, qty_per_plate: String(r.qty_per_plate) })));
    setOpen(true);
  }
  function openNew() { setForm(EMPTY); setRows([]); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = {
      name: form.name.trim(),
      category: form.category.trim() || "General",
      price: Number(form.price) || 0,
      available: form.available,
    };
    let menuId = form.id;
    if (editing) {
      await supabase.from("menu_items").update(row).eq("id", form.id);
    } else {
      const { data } = await supabase.from("menu_items").insert(row).select("id").single();
      menuId = data?.id ?? "";
    }
    if (menuId) {
      await supabase.from("recipe_items").delete().eq("menu_item_id", menuId);
      const clean = rows
        .filter((r) => r.inventory_item_id && Number(r.qty_per_plate) > 0)
        .map((r) => ({ menu_item_id: menuId, inventory_item_id: r.inventory_item_id, qty_per_plate: Number(r.qty_per_plate) }));
      if (clean.length) await supabase.from("recipe_items").insert(clean);
    }
    setOpen(false); setForm(EMPTY); setRows([]); load();
  }

  async function toggle(it: MenuItem) {
    await supabase.from("menu_items").update({ available: !it.available }).eq("id", it.id);
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    load();
  }

  const liveCost = costOfRows(rows);
  const unitOf = (id: string) => stock.find((s) => s.id === id)?.unit ?? "";

  return (
    <>
      <Header title="Menu" subtitle={`${items.length} items`} />
      <div className="px-5 py-4 space-y-3">
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted">
            No items yet. Tap “Add item” to start.
          </div>
        )}
        {items.map((it) => {
          const cost = costOf(it.id);
          const profit = Number(it.price) - cost;
          const hasRecipe = (recipes[it.id]?.length ?? 0) > 0;
          return (
            <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
              <div className="flex-1">
                <p className="font-semibold">{it.name}</p>
                <p className="text-xs text-muted">{it.category} · {money(it.price)}</p>
                {hasRecipe ? (
                  <p className="text-xs text-muted">cost {money(cost)} · <span className="font-medium text-green-600">profit {money(profit)}</span></p>
                ) : (
                  <p className="text-xs text-orange-500">no recipe — tap edit to set</p>
                )}
              </div>
              <button
                onClick={() => toggle(it)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${it.available ? "bg-green-100 text-green-700" : "bg-stone-100 text-muted"}`}
              >
                {it.available ? "Available" : "Off"}
              </button>
              <button onClick={() => openEdit(it)} className="text-muted"><Pencil size={18} /></button>
              <button onClick={() => del(it.id)} className="text-muted"><Trash2 size={18} /></button>
            </div>
          );
        })}
      </div>

      <button onClick={openNew}
        className="fixed bottom-28 left-1/2 z-20 -translate-x-1/2 rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-orange-300 active:scale-95">
        + Add item
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save}
            className="shell max-h-[90dvh] w-full space-y-3 overflow-y-auto rounded-t-3xl bg-card p-5 pb-8">
            <div className="mx-auto h-1 w-10 rounded-full bg-line" />
            <h2 className="text-lg font-bold">{editing ? "Edit item" : "New item"}</h2>
            <Field label="Name">
              <input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Chicken Rice" className="inp" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Rice" className="inp" />
              </Field>
              <Field label="Price (₹)">
                <input type="number" inputMode="decimal" step="1" min="0" required value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="120" className="inp" />
              </Field>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-line bg-bg px-4 py-3">
              <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="h-5 w-5 accent-orange-600" />
              <span className="text-sm font-medium">Available to sell</span>
            </label>

            {/* Recipe builder */}
            <div className="rounded-xl border border-line bg-bg p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Recipe — stock used per plate</span>
              </div>
              {stock.length === 0 && <p className="text-xs text-muted">Add stock items first (Stock tab) to build a recipe.</p>}
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select value={r.inventory_item_id}
                      onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, inventory_item_id: e.target.value } : x))}
                      className="inp flex-1 bg-card">
                      <option value="">Pick stock…</option>
                      {stock.map((s) => <option key={s.id} value={s.id}>{s.name} ({money(s.unit_cost)}/{s.unit})</option>)}
                    </select>
                    <input type="number" inputMode="decimal" step="0.01" value={r.qty_per_plate}
                      onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, qty_per_plate: e.target.value } : x))}
                      placeholder="0.2" className="inp w-20 bg-card" />
                    <span className="w-8 text-xs text-muted">{unitOf(r.inventory_item_id)}</span>
                    <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-muted"><X size={18} /></button>
                  </div>
                ))}
              </div>
              {stock.length > 0 && (
                <button type="button" onClick={() => setRows([...rows, { inventory_item_id: "", qty_per_plate: "" }])}
                  className="mt-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-medium active:scale-95">
                  + Add ingredient
                </button>
              )}
              {rows.length > 0 && (
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-sm">
                  <span className="text-muted">Food cost / plate</span>
                  <span className="font-semibold">{money(liveCost)}{form.price && <span className="ml-2 text-green-600">profit {money(Number(form.price) - liveCost)}</span>}</span>
                </div>
              )}
            </div>

            <button className="w-full rounded-xl bg-brand py-3 font-semibold text-white active:scale-[.99]">
              {editing ? "Save changes" : "Add to menu"}
            </button>
          </form>
        </div>
      )}

      <style>{`.inp{width:100%;border-radius:0.75rem;border:1px solid var(--line);background:var(--bg);padding:0.75rem 1rem;outline:none}.inp:focus{border-color:var(--brand)}`}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
