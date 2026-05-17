"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AuthScreen, authInputClassName } from "@/components/auth/auth-screen";
import { cn } from "@/lib/utils";
import { normalizeEmail } from "@/lib/normalize-email";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function googleAuthErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("41") ||
    msg.includes("invalid_client") ||
    msg.includes("OAuth") ||
    msg.includes("client_id")
  ) {
    return "Google sign-in is not configured. Use email and password below.";
  }
  return msg || "Google sign-in failed.";
}

function authErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("InvalidAccountId")) {
    return "No account for this email. Create an account first.";
  }
  if (msg.includes("InvalidSecret") || msg.includes("Invalid credentials")) {
    return "Wrong password. Try again.";
  }
  return "Sign in failed. Try again or sign up.";
}

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const googleConfigured = useQuery(api.authStatus.googleOAuthConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const trimmedEmail = normalizeEmail(email);
    try {
      await signIn("password", {
        email: trimmedEmail,
        password,
        flow: "signIn",
      });
      router.push("/timelines");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    if (googleConfigured === false) {
      setError("Google sign-in is not set up on this deployment. Use email below.");
      return;
    }
    setLoading(true);
    try {
      await signIn("google", { redirectTo: "/timelines" });
    } catch (err) {
      setError(googleAuthErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to save simulations and join the community"
    >
      <div className="space-y-6">
        {googleConfigured !== false && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void signInWithGoogle()}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-border bg-background/60 text-foreground font-medium text-sm hover:bg-background hover:border-white/20 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <GoogleIcon className="w-5 h-5 shrink-0" />
            Continue with Google
          </button>
        )}

        {googleConfigured === false && (
          <p className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            Google sign-in is not set up on this deployment. Use email below.
          </p>
        )}

        {googleConfigured !== false && (
          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              or email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClassName}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(authInputClassName, "pr-11")}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/85 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
