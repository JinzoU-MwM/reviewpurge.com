"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";
import { MainNav } from "@/components/main-nav";

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 md:px-6">
        <main id="main-content" className="flex-1 py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 md:px-6">
        <MainNav />
        <main id="main-content" className="flex-1 py-8">
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
