export function UserProfile() {
  return (
    <div className="mx-4 mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--accent-light)]/20 p-3.5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-teal-600 text-base font-bold text-white shadow-md">
            P
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--card)] bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight">Pranav</p>
          <span className="mt-0.5 inline-flex items-center rounded-md bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-[var(--accent)]">
            OWNER
          </span>
        </div>
      </div>
    </div>
  );
}
