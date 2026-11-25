"use client";

// Website building blocks, styled like the app's "Courtside" theme (globals.css holds the colours).

import Link from "next/link";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { hueFor, initials } from "@/lib/format";
import type { ApiFailure } from "@/lib/api";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ── Buttons ─────────────────────────────────────────────────────────────────
type Kind = "primary" | "secondary" | "danger" | "ghost";
const kinds: Record<Kind, string> = {
  primary: "bg-accent text-white hover:brightness-95",
  secondary: "bg-fill text-ink hover:bg-line",
  danger: "bg-danger/10 text-danger hover:bg-danger/20",
  ghost: "text-accent-ink hover:bg-fill",
};
const btn = (kind: Kind, small?: boolean, block?: boolean) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
    small ? "h-9 px-3 text-sm" : "h-11 px-5",
    block && "w-full",
    kinds[kind],
  );

export function Button({ kind = "primary", small, block, loading, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: Kind; small?: boolean; block?: boolean; loading?: boolean }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || loading} className={cx(btn(kind, small, block), className)}>
      {loading ? "Please wait…" : children}
    </button>
  );
}

export function LinkButton({ href, kind = "primary", small, block, children }: { href: string; kind?: Kind; small?: boolean; block?: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={btn(kind, small, block)}>
      {children}
    </Link>
  );
}

// ── Form fields ─────────────────────────────────────────────────────────────
const inputClass = "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink placeholder:text-muted focus:outline-2 focus:outline-accent";

function Label({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-2">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[13px] text-danger">{error}</span> : hint ? <span className="mt-1 block text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function Field({ label, hint, error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string }) {
  return (
    <Label label={label} hint={hint} error={error}>
      <input {...rest} aria-invalid={!!error || undefined} className={inputClass} />
    </Label>
  );
}

export function TextArea({ label, hint, error, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode; error?: string }) {
  return (
    <Label label={label} hint={hint} error={error}>
      <textarea rows={4} {...rest} className={cx(inputClass, "resize-y")} />
    </Label>
  );
}

export function Select({ label, hint, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: ReactNode }) {
  return (
    <Label label={label} hint={hint}>
      <select {...rest} className={inputClass}>
        {children}
      </select>
    </Label>
  );
}

export function Toggle({ label, sub, checked, onChange, disabled }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-1 size-4 accent-accent" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="flex rounded-xl bg-fill p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx("h-9 flex-1 rounded-lg text-sm font-bold transition", o.value === value ? "bg-card text-ink shadow-sm" : "text-ink-2 hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx("h-8 rounded-full px-3.5 text-sm font-bold transition", o.value === value ? "bg-ink text-bg" : "bg-fill text-ink-2 hover:bg-line")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Layout pieces ───────────────────────────────────────────────────────────
export function PageTitle({ title, sub, action, back }: { title: string; sub?: ReactNode; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-5">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm font-bold text-accent-ink hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] leading-tight font-bold tracking-tight">{title}</h1>
          {sub && <div className="mt-1 text-ink-2">{sub}</div>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("overflow-hidden rounded-2xl border border-line bg-card", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-display text-[17px] font-bold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Row({ label, sub, href, onClick, right, danger }: { label: ReactNode; sub?: ReactNode; href?: string; onClick?: () => void; right?: ReactNode; danger?: boolean }) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className={cx("font-semibold", danger && "text-danger")}>{label}</div>
        {sub && <div className="text-[13px] text-muted">{sub}</div>}
      </div>
      {right}
      {(href || onClick) && !right && <span className="text-muted">›</span>}
    </>
  );
  const cls = "flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left first:border-t-0";
  if (href) return <Link href={href} className={cx(cls, "hover:bg-fill/60")}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cx(cls, "hover:bg-fill/60")}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

export function Tag({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "accent" | "official" | "danger" | "success" }) {
  const tones = {
    neutral: "bg-fill text-ink-2",
    accent: "bg-accent-soft text-accent-ink",
    official: "bg-official-soft text-official",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/15 text-success",
  };
  return <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold whitespace-nowrap", tones[tone])}>{label}</span>;
}

export function Avatar({ name, src, size = 40, square }: { name: string; src?: string | null; size?: number; square?: boolean }) {
  const radius = square ? size * 0.28 : size / 2;
  if (src) {
    // Plain <img>: photos come from any https host (uploads, CDN), not a fixed next/image list
    return <img src={src} alt="" width={size} height={size} className="shrink-0 object-cover" style={{ width: size, height: size, borderRadius: radius }} />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center font-display font-bold text-white"
      style={{ width: size, height: size, borderRadius: radius, background: hueFor(name), fontSize: size * 0.38 }}
    >
      {initials(name) || "?"}
    </span>
  );
}

// ── States ──────────────────────────────────────────────────────────────────
export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="font-display text-lg font-bold">{title}</div>
      {body && <div className="mx-auto mt-1 max-w-sm text-ink-2">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const tones = { error: "bg-danger/10 text-danger", success: "bg-success/15 text-success", info: "bg-official-soft text-official" };
  return <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-xl px-3.5 py-3 text-sm", tones[tone])}>{children}</div>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="py-10 text-center text-muted">{label}</div>;
}

/** Standard handling of a useApi() result: loading, error (with retry), or the content. */
export function Loaded<T>({ q, children, notFound }: { q: { data: T | undefined; error: ApiFailure | undefined; loading: boolean; reload: () => Promise<void> }; children: (data: T) => ReactNode; notFound?: ReactNode }) {
  if (q.data !== undefined) return <>{children(q.data)}</>;
  if (q.error) {
    if ((q.error.status === 404 || q.error.status === 400) && notFound) return <>{notFound}</>;
    if (q.error.status === 401) return <Empty title="Please log in" body="Log in to see this page." action={<LinkButton href="/login">Log in</LinkButton>} />;
    if (q.error.status === 403) return <Empty title="Not allowed" body={q.error.message} />;
    return <Empty title="Couldn't load this" body={q.error.message} action={<Button kind="secondary" onClick={() => q.reload()}>Try again</Button>} />;
  }
  return <Loading />;
}

// ── Toasts ──────────────────────────────────────────────────────────────────
type ToastMsg = { id: number; title: string; body?: string };
let toastId = 0;
const toastListeners = new Set<(t: ToastMsg) => void>();

/** Short message in the corner (the app's notify()). */
export function toast(title: string, body?: string) {
  const t = { id: ++toastId, title, body };
  toastListeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const add = (t: ToastMsg) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((y) => y.id !== t.id)), 5000);
    };
    toastListeners.add(add);
    return () => {
      toastListeners.delete(add);
    };
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm rounded-xl bg-ink px-4 py-3 text-bg shadow-lg">
          <div className="font-bold">{t.title}</div>
          {t.body && <div className="text-sm opacity-80">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Dialog ──────────────────────────────────────────────────────────────────
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 text-xl text-muted hover:bg-fill">
          ×
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-4">{open && children}</div>
    </dialog>
  );
}

/** Ask before something that can't be undone. */
export const confirmAction = (message: string) => typeof window !== "undefined" && window.confirm(message);

export { cx };
