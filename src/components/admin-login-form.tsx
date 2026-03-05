"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nextPath: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-300/80 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20";

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
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase environment variables belum diisi. Set `.env.local` dulu.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Email admin</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@email.com"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
      )}
      {message && (
        <p aria-live="polite" className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      )}
    </>
  );
}

