"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReceiptText, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { money, type Order, type OrderItem } from "@/lib/types";

type OrderRow = Order & { order_items: OrderItem[] };

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data as OrderRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function setPaid(o: OrderRow, paid: boolean) {
    await supabase.from("orders").update({ status: paid ? "paid" : "unpaid" }).eq("id", o.id);
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete this order?")) return;
    await supabase.from("orders").delete().eq("id", id);
    load();
  }

  const fmt = (s: string) =>
    new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <>
      <Header title="Orders" subtitle={`${orders.length} recent`} />
      <div className="px-5 py-4 space-y-3">
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {!loading && orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted">
            No orders yet.
          </div>
        )}
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted">{fmt(o.created_at)} · {o.payment_method}</p>
                <p className="mt-0.5 font-semibold">{money(o.total)}</p>
                {Number(o.tendered) > 0 && (
                  <p className="text-xs text-muted">given {money(o.tendered)} · change {money(Number(o.tendered) - Number(o.total))}</p>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${o.status === "paid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {o.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {o.order_items?.map((li) => (
                <span key={li.id} className="rounded-md bg-bg px-2 py-1 text-xs text-muted">
                  {li.qty}× {li.name}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {o.status === "unpaid" ? (
                <button onClick={() => setPaid(o, true)} className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white active:scale-95">
                  Mark paid
                </button>
              ) : (
                <button onClick={() => setPaid(o, false)} className="flex-1 rounded-lg border border-line py-2 text-sm font-medium text-muted active:scale-95">
                  Mark unpaid
                </button>
              )}
              <Link href={`/receipt/${o.id}`} className="grid place-items-center rounded-lg border border-line px-3 py-2 text-muted"><ReceiptText size={18} /></Link>
              <button onClick={() => del(o.id)} className="grid place-items-center rounded-lg border border-line px-3 py-2 text-muted"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
