"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = isSignup
      ? await signUp.email({ email, password, name })
      : await signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Try again.");
      setPending(false);
      return;
    }

    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="text-2xl font-semibold tracking-tight text-fg">Saldo</div>
        <p className="mt-1 text-sm text-muted">
          {isSignup ? "Create your account" : "Welcome back"}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-3xl border border-hairline bg-surface p-6 shadow-sm"
      >
        {isSignup && (
          <Field
            label="Name"
            type="text"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
        />

        {error && <p className="text-sm text-over">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSignup ? "Sign up" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-fg underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link
              href="/signup"
              className="font-medium text-fg underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-hairline bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition placeholder:text-muted focus:border-muted"
        {...props}
      />
    </label>
  );
}
