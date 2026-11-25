import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <h1 className="font-display text-2xl font-bold">Not found</h1>
      <p className="mx-auto mt-1 max-w-sm text-ink-2">This page doesn&apos;t exist, was removed, or is only visible to club members.</p>
      <Link href="/" className="mt-4 inline-block font-bold text-accent-ink hover:underline">
        Go to the home page
      </Link>
    </div>
  );
}
