"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, type Order, type OrderItem, type ShopProfile } from "@/lib/types";

type Row = Order & { order_items: OrderItem[] };

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [order, setOrder] = useState<Row | null>(null);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [o, s] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle(),
        supabase.from("shop_profile").select("*").maybeSingle(),
      ]);
      setOrder(o.data as Row);
      setShop(s.data as ShopProfile);
      setLoading(false);
    })();
  }, [supabase, id]);

  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (!order) return <p className="p-6 text-sm text-muted">Receipt not found.</p>;

  const tax = Number(order.tax || 0);
  const subtotal = Number(order.total) - tax;
  const half = Math.round((tax / 2) * 100) / 100;
  const name = shop?.shop_name || "Chicken Nova";
  const dt = new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  function whatsapp() {
    const L: string[] = [`*${name}* — Receipt`, dt, ""];
    order!.order_items?.forEach((li) => L.push(`${li.qty}× ${li.name}  ${money(Number(li.price) * li.qty)}`));
    L.push("");
    if (tax > 0) { L.push(`Subtotal ${money(subtotal)}`); L.push(`GST ${money(tax)}`); }
    L.push(`*Total ${money(order!.total)}*`);
    L.push(`Paid: ${order!.payment_method} (${order!.status})`);
    if (shop?.receipt_footer) L.push("", shop.receipt_footer);
    window.open("https://wa.me/?text=" + encodeURIComponent(L.join("\n")), "_blank");
  }

  return (
    <main className="mx-auto max-w-[380px] px-4 py-5">
      <div id="rcpt" className="rounded-xl border border-line bg-white p-5 font-mono text-sm text-black">
        <div className="text-center">
          <p className="text-base font-bold">{name}</p>
          {shop?.address && <p className="text-xs">{shop.address}</p>}
          {shop?.phone && <p className="text-xs">Ph: {shop.phone}</p>}
          {shop?.gstin && <p className="text-xs">GSTIN: {shop.gstin}</p>}
        </div>
        <div className="my-3 border-t border-dashed border-stone-400" />
        <p className="text-xs">{dt}</p>
        <p className="text-xs">Bill #{String(order.id).slice(0, 8)}</p>
        <div className="my-3 border-t border-dashed border-stone-400" />
        {order.order_items?.map((li) => (
          <div key={li.id} className="flex justify-between">
            <span>{li.qty}× {li.name}</span>
            <span>{money(Number(li.price) * li.qty)}</span>
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-stone-400" />
        {tax > 0 && (
          <>
            <Line l="Subtotal" r={money(subtotal)} />
            <Line l={`CGST`} r={money(half)} />
            <Line l={`SGST`} r={money(half)} />
          </>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL</span><span>{money(order.total)}</span>
        </div>
        {Number(order.tendered) > 0 && (
          <>
            <Line l="Cash" r={money(order.tendered)} />
            <Line l="Change" r={money(Number(order.tendered) - Number(order.total))} />
          </>
        )}
        <p className="mt-1 text-xs">Paid via {order.payment_method} · {order.status}</p>
        {shop?.receipt_footer && (
          <>
            <div className="my-3 border-t border-dashed border-stone-400" />
            <p className="text-center text-xs">{shop.receipt_footer}</p>
          </>
        )}
      </div>

      <div className="no-print mt-4 grid grid-cols-3 gap-2">
        <button onClick={() => router.back()} className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-card py-3 text-sm font-medium"><ArrowLeft size={16} /> Back</button>
        <button onClick={() => window.print()} className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-card py-3 text-sm font-medium"><Printer size={16} /> Print</button>
        <button onClick={whatsapp} className="flex items-center justify-center gap-1.5 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white"><MessageCircle size={16} /> Share</button>
      </div>

      <style>{`@media print { .no-print { display:none } body { background:#fff } #rcpt { border:none } }`}</style>
    </main>
  );
}

function Line({ l, r }: { l: string; r: string }) {
  return <div className="flex justify-between"><span>{l}</span><span>{r}</span></div>;
}
