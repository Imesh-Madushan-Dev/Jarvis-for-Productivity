"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithPassword, signUpWithPassword } from "@/lib/auth-actions";

type Mode = "signin" | "signup";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setError(null);
    setMessage(null);

    startTransition(async () => {
      if (mode === "signin") {
        const result = await signInWithPassword(email, password);
        if (!result.ok) return setError(result.error);
        router.replace("/");
        return;
      }

      const result = await signUpWithPassword(email, password);
      if (!result.ok) return setError(result.error);
      if (result.data.needsConfirmation) {
        setMessage("Check your inbox to confirm the address, then sign in.");
        setMode("signin");
        return;
      }
      router.replace("/");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        Email
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Password
        <Input
          name="password"
          type="password"
          autoComplete={
            mode === "signin" ? "current-password" : "new-password"
          }
          required
          minLength={6}
placeholder="••••••••"
        />
      </label>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="t-press mt-1">
        {pending
          ? "Working…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setMessage(null);
        }}
        className="t-press text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "signin"
          ? "No account yet? Create one"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
