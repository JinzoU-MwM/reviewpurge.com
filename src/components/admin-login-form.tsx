"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nextPath: string;
};

export function AdminLoginForm({ nextPath }: Props) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canUseSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUseSupabase) return;

    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}${nextPath}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      setMessage(error ? error.message : "Magic link sent. Check your email inbox.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {!canUseSupabase ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase environment variables belum diisi. Set `.env.local` dulu.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@email.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
      )}
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </>
  );
}
