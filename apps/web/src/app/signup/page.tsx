import type { Metadata } from "next";
import { firstParam, safeNext } from "@/lib/api";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <SignupForm next={safeNext(firstParam((await searchParams).next))} />;
}
