"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type ShopProfile } from "@/lib/types";

const BLANK = {
  owner_name: "", shop_name: "Chicken Nova", address: "", phone: "", gstin: "",
  gst_enabled: false, gst_rate: "5", receipt_footer: "Thank you! Visit again.",
};

export default function SettingsPage() {
  const supabase = createClient();
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: u }] = await Promise.all([
        supabase.from("shop_profile").select("*").maybeSingle(),
        supabase.auth.getUser(),
      ]);
      const p = data as ShopProfile | null;
      setForm({
        owner_name: (u.user?.user_metadata?.name as string) ?? "",
        shop_name: p?.shop_name ?? "Chicken Nova", address: p?.address ?? "", phone: p?.phone ?? "",
        gstin: p?.gstin ?? "", gst_enabled: p?.gst_enabled ?? false, gst_rate: String(p?.gst_rate ?? 5),
        receipt_footer: p?.receipt_footer ?? "Thank you! Visit again.",
      });
      setLoading(false);
    })();
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    await supabase.auth.updateUser({ data: { name: form.owner_name.trim() } });
    await supabase.from("shop_profile").upsert({
      owner_id: u.user?.id,
      shop_name: form.shop_name.trim() || "Chicken Nova",
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      gstin: form.gstin.trim() || null,
      gst_enabled: form.gst_enabled,
      gst_rate: Number(form.gst_rate) || 0,
      receipt_footer: form.receipt_footer.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="shell flex items-center gap-2 px-5 py-3">
          <Link href="/" className="text-muted"><ArrowLeft size={20} /></Link>
          <h1 className="text-lg font-bold">Shop settings</h1>
        </div>
      </header>

      {loading ? (
        <p className="px-5 py-4 text-sm text-muted">Loading…</p>
      ) : (
        <form onSubmit={save} className="px-5 py-4 space-y-4">
          <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
            <p className="text-sm font-semibold">You</p>
            <Field label="Your name (shown on dashboard greeting)"><input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} placeholder="Dina" className="inp" /></Field>
          </div>

          <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
            <p className="text-sm font-semibold">Shop details (shown on receipts)</p>
            <Field label="Shop name"><input required value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} placeholder="Chicken Nova" className="inp" /></Field>
            <Field label="Address (optional)"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12 Main St, Chennai" className="inp" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98xxxxxxx" className="inp" /></Field>
              <Field label="GSTIN (optional)"><input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="33ABC…" className="inp" /></Field>
            </div>
            <Field label="Receipt footer"><input value={form.receipt_footer} onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })} placeholder="Thank you! Visit again." className="inp" /></Field>
          </div>

          <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold">Charge GST on bills</span>
              <input type="checkbox" checked={form.gst_enabled} onChange={(e) => setForm({ ...form, gst_enabled: e.target.checked })} className="h-5 w-5 accent-orange-600" />
            </label>
            {form.gst_enabled && (
              <Field label="GST rate (%) — split equally as CGST + SGST">
                <input type="number" inputMode="decimal" step="0.5" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} placeholder="5" className="inp" />
              </Field>
            )}
            <p className="text-xs text-muted">When on, GST is added on top of the item total at checkout and shown on the receipt.</p>
          </div>

          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white active:scale-[.99]">
            {saved && <Check size={18} />}{saved ? "Saved" : "Save settings"}
          </button>
        </form>
      )}
      <style>{`.inp{width:100%;border-radius:0.75rem;border:1px solid var(--line);background:var(--bg);padding:0.7rem 0.9rem;outline:none}.inp:focus{border-color:var(--brand)}`}</style>
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
