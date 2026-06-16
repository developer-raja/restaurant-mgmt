"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { money, type MenuItem, type ShopProfile } from "@/lib/types";

type Cart = Record<string, number>; // menu_item_id -> qty

export default function NewOrderPage() {
  const supabase = createClient();
  const router = useRouter();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [pay, setPay] = useState<"cash" | "upi" | "card">("cash");
  const [status, setStatus] = useState<"paid" | "unpaid">("paid");
  const [given, setGiven] = useState("");
  const [saving, setSaving] = useState(false);
  const [gst, setGst] = useState({ enabled: false, rate: 0 });

  useEffect(() => {
    (async () => {
      const [m, p] = await Promise.all([
        supabase.from("menu_items").select("*").eq("available", true).order("name"),
        supabase.from("shop_profile").select("gst_enabled,gst_rate").maybeSingle(),
      ]);
      setMenu((m.data as MenuItem[]) ?? []);
      const prof = p.data as Pick<ShopProfile, "gst_enabled" | "gst_rate"> | null;
      if (prof) setGst({ enabled: prof.gst_enabled, rate: Number(prof.gst_rate) });
    })();
  }, [supabase]);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const q = (c[id] || 0) - 1;
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = q;
      return n;
    });

  const lines = menu.filter((m) => cart[m.id]);
  const subtotal = lines.reduce((s, m) => s + m.price * cart[m.id], 0);
  const tax = gst.enabled ? Math.round(subtotal * gst.rate) / 100 : 0;
  const total = subtotal + tax;
  const count = lines.reduce((s, m) => s + cart[m.id], 0);

  async function checkout() {
    if (!lines.length) return;
    setSaving(true);
    const tendered = pay === "cash" && Number(given) > 0 ? Number(given) : 0;
    const { data: order, error } = await supabase
      .from("orders")
      .insert({ total, tax, status, payment_method: pay, tendered })
      .select("id")
      .single();
    if (error || !order) { setSaving(false); alert(error?.message || "Failed"); return; }
    const rows = lines.map((m) => ({
      order_id: order.id,
      menu_item_id: m.id,
      name: m.name,
      price: m.price,
      qty: cart[m.id],
    }));
    await supabase.from("order_items").insert(rows);
    router.replace("/orders");
    router.refresh();
  }

  return (
    <>
      <Header title="New order" subtitle="Tap items to add" />
      <div className="px-5 py-4 space-y-2">
        {menu.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted">
            No available items. Add some in <b>Menu</b> first.
          </div>
        )}
        {menu.map((m) => {
          const q = cart[m.id] || 0;
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
              <div className="flex-1">
                <p className="font-semibold">{m.name}</p>
                <p className="text-xs text-muted">{money(m.price)}</p>
              </div>
              {q > 0 ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => sub(m.id)} className="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-xl font-bold">−</button>
                  <span className="w-5 text-center font-semibold">{q}</span>
                  <button onClick={() => add(m.id)} className="grid h-9 w-9 place-items-center rounded-full bg-brand text-xl font-bold text-white">+</button>
                </div>
              ) : (
                <button onClick={() => add(m.id)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:scale-95">
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-20">
          <div className="shell px-5">
            <div className="rounded-2xl border border-line bg-card p-4 shadow-xl">
              <div className="mb-3 flex gap-2">
                {(["cash", "upi", "card"] as const).map((p) => (
                  <button key={p} onClick={() => setPay(p)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize ${pay === p ? "bg-brand text-white" : "bg-bg text-muted"}`}>
                    {p}
                  </button>
                ))}
              </div>
              {pay === "cash" && status === "paid" && (
                <div className="mb-3 rounded-lg bg-bg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">Cash given ₹</span>
                    <input type="number" inputMode="decimal" value={given} onChange={(e) => setGiven(e.target.value)}
                      placeholder={String(total)} className="w-full rounded-lg border border-line bg-card px-3 py-1.5 outline-none focus:border-brand" />
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {[total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map((v) => (
                        <button key={v} type="button" onClick={() => setGiven(String(v))}
                          className="flex-1 rounded-md bg-card py-1 text-xs font-medium text-muted active:scale-95">₹{v}</button>
                      ))}
                  </div>
                  {Number(given) > 0 && (
                    Number(given) >= total ? (
                      <p className="mt-2 text-center text-sm font-semibold text-green-600">Return ₹{(Number(given) - total).toLocaleString("en-IN")}</p>
                    ) : (
                      <p className="mt-2 text-center text-sm font-semibold text-red-600">Short ₹{(total - Number(given)).toLocaleString("en-IN")}</p>
                    )
                  )}
                </div>
              )}
              <label className="mb-3 flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm">
                <span className="font-medium">Mark unpaid (credit)</span>
                <input type="checkbox" checked={status === "unpaid"} onChange={(e) => setStatus(e.target.checked ? "unpaid" : "paid")} className="h-5 w-5 accent-orange-600" />
              </label>
              {gst.enabled && tax > 0 && (
                <div className="mb-2 space-y-0.5 text-sm">
                  <div className="flex justify-between text-muted"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                  <div className="flex justify-between text-muted"><span>GST {gst.rate}%</span><span>{money(tax)}</span></div>
                </div>
              )}
              <button onClick={checkout} disabled={saving}
                className="flex w-full items-center justify-between rounded-xl bg-brand px-5 py-3 font-semibold text-white active:scale-[.99] disabled:opacity-60">
                <span>{saving ? "Saving…" : `Charge · ${count} item${count > 1 ? "s" : ""}`}</span>
                <span className="text-lg">{money(total)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
