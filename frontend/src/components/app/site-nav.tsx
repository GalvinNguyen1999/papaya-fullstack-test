"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

const MEMBER_LINKS: NavLink[] = [
  { href: "/plans", label: "Plans" },
  { href: "/claims", label: "My claims" },
  { href: "/claims/new", label: "Submit claim" },
];

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/claims", label: "Claims queue" },
];

export function MemberNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <nav className="container flex h-14 items-center gap-6">
        <Link href="/plans" className="flex items-center gap-2 font-extrabold">
          <span className="text-xl">🥭</span> Papaya
          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">Member</span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <NavLinks links={MEMBER_LINKS} />
          <Link href="/admin/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            Switch to Admin →
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function AdminNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-slate-900 text-white">
      <nav className="container flex h-14 items-center gap-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-extrabold">
          <span className="text-xl">🥭</span> Papaya
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase">Admin</span>
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-sm font-medium text-slate-200 hover:text-white">Dashboard</Link>
          <Link href="/admin/claims" className="text-sm font-medium text-slate-200 hover:text-white">Claims queue</Link>
          <Link href="/plans" className="text-xs text-slate-400 hover:text-white">← Member site</Link>
        </div>
      </nav>
    </header>
  );
}
