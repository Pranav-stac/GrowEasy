"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserProfile } from "./UserProfile";
import { useTheme } from "./ThemeProvider";

const mainNav = [
  { label: "Dashboard", href: "/lead-sources" },
  { label: "Manage Leads", href: "/leads" },
  { label: "Lead Sources", href: "/lead-sources" },
];

function NavItem({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active
          ? "border-l-[3px] border-[var(--sidebar-active-border)] bg-[var(--sidebar-active)] font-medium text-[var(--accent)]"
          : "border-l-[3px] border-transparent text-[var(--muted)] hover:bg-gray-50 hover:text-[var(--foreground)] dark:hover:bg-gray-800/50"
      }`}
    >
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-bold text-white dark:bg-white dark:text-black">
          ↑
        </div>
        <div>
          <span className="text-lg font-semibold">GrowEasy</span>
          <p className="text-[10px] text-[var(--muted)]">by Pranav</p>
        </div>
      </div>

      <UserProfile />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-[var(--muted)]">MAIN</p>
        <div className="space-y-0.5">
          {mainNav.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} />
          ))}
        </div>
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <button
          onClick={toggleTheme}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
      </div>
    </aside>
  );
}
