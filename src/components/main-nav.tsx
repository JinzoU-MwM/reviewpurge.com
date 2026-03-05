"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/indonesia", label: "Indonesia" },
  { href: "/global", label: "Global" },
  { href: "/blog", label: "Blog" },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/logs", label: "Logs" },
];

export function MainNav() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isAdmin ? adminLinks : publicLinks;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 mt-3 md:mt-5">
      <div className="rounded-2xl border border-white/40 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={isAdmin ? "/admin" : "/"} className="heading-display text-xl font-bold text-slate-900">
            Review<span className="text-primary">Purge</span>
            {isAdmin && (
              <span className="badge badge-neutral ml-2 align-middle text-[9px]">Admin</span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden items-center gap-1.5 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${isActive(item.href)
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                {item.label}
              </Link>
            ))}
            {!isAdmin && (
              <Link
                href="/indonesia"
                className="btn btn-primary btn-sm ml-2"
              >
                Explore Tools
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/"
                className="ml-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                ← Public Site
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 md:hidden"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="5" x2="17" y2="5" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <nav className="mt-3 flex flex-col gap-1 border-t border-slate-200/60 pt-3 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2 text-sm text-slate-500"
              >
                ← Public Site
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
