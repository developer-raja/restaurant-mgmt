"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, Plus, Package, TrendingUp, type LucideIcon } from "lucide-react";

const tabs: { href: string; label: string; icon: LucideIcon; primary?: boolean }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/orders/new", label: "Sell", icon: Plus, primary: true },
  { href: "/inventory", label: "Stock", icon: Package },
  { href: "/reports", label: "Sales", icon: TrendingUp },
];

export default function BottomNav() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
      <div className="shell flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        {tabs.map((t) => {
          const active = isActive(t.href);
          const Icon = t.icon;
          if (t.primary) {
            return (
              <Link key={t.href} href={t.href} className="-mt-5 flex flex-col items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg shadow-orange-300 active:scale-95">
                  <Icon size={26} strokeWidth={2.5} />
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-muted">{t.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <Icon size={22} className={active ? "text-brand" : "text-muted"} />
              <span className={`text-[10px] font-medium ${active ? "text-brand" : "text-muted"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
