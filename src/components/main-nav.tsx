"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/indonesia", label: "Indonesia" },
  { href: "/global", label: "Global" },
  { href: "/blog", label: "Blog" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/logs", label: "Logs" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 mt-3 border border-slate-300/70 bg-white/85 px-3 py-3 backdrop-blur md:mt-5 md:rounded-2xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="heading-display text-xl font-semibold text-slate-900">
          ReviewPurge
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 transition ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-300 bg-white text-slate-700 hover:border-primary/60 hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

