"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nextPath: string;
};

export function AdminLoginForm({ nextPath }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canUseSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUseSupabase) return;

    setIsLoading(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setIsSuccess(true);
      setMessage("Login berhasil. Mengarahkan ke dashboard...");
      window.location.assign(nextPath);
    } finally {
      setIsLoading(false);
    }
  }

  if (!canUseSupabase) {
    return (
      <div className="admin-banner admin-banner-warning">
        <span className="admin-banner-icon">WARN</span>
        <div>
          <p className="font-semibold">Configuration Required</p>
          <p className="text-sm mt-1">
            Supabase environment variables are not set. Please configure{" "}
            <code className="admin-code">.env.local</code> with your Supabase credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-group">
          <label>Admin Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            className="admin-input"
            disabled={isLoading}
          />
        </div>
        <div className="admin-form-group">
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            className="admin-input"
            disabled={isLoading}
            minLength={8}
          />
          <p className="text-xs text-[var(--admin-text-dim)] mt-1.5">
            Gunakan kredensial email + password Supabase Auth.
          </p>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="admin-btn admin-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span>WAIT</span>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>GO</span>
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {message && (
        <div
          className={`admin-banner mt-4 ${isSuccess ? "admin-banner-success" : "admin-banner-danger"}`}
        >
          <span className="admin-banner-icon">{isSuccess ? "OK" : "WARN"}</span>
          <p aria-live="polite">{message}</p>
        </div>
      )}
    </>
  );
}
