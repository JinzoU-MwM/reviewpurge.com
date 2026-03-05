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
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-amber-800">
            Supabase environment variables belum diisi. Set <code className="rounded bg-amber-100 px-1 font-mono text-xs">.env.local</code> dulu.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="space-y-1.5 text-sm text-slate-700">
            <span className="font-medium">Email admin</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@email.com"
              className="input"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
      )}
      {message && (
        <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${message.includes("sent")
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
          }`}>
          <span>{message.includes("sent") ? "✓" : "⚠️"}</span>
          <p aria-live="polite">{message}</p>
        </div>
      )}
    </>
  );
}
