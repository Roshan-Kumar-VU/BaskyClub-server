import type { ReactNode } from "react";

/** Frame for log in, sign up and password pages. */
export function AuthCard({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-6">
      <h1 className="font-display text-[26px] leading-tight font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-ink-2">{sub}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}
