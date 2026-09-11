"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, LayoutDashboard } from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Gastos", icon: ArrowDownCircle },
  { href: "/income", label: "Receitas", icon: ArrowUpCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                active ? "text-accent-line" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
