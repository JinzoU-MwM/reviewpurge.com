import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/indonesia", label: "Indonesia" },
  { href: "/global", label: "Global" },
  { href: "/blog", label: "Blog" },
  { href: "/admin", label: "Admin" },
];

export function MainNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          ReviewPurge
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-700">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-sky-600">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
