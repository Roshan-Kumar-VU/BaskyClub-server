import type { Metadata } from "next";
import { firstParam, safeNext } from "@/lib/api";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LoginForm next={safeNext(firstParam((await searchParams).next))} />;
}
