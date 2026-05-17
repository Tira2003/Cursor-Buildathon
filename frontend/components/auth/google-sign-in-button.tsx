"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

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

export function googleAuthErrorMessage(err: unknown): string {
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

type GoogleSignInButtonProps = {
  redirectTo?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  onError?: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
};

export function GoogleSignInButton({
  redirectTo = "/timelines",
  disabled = false,
  className,
  label = "Continue with Google",
  onError,
  onLoadingChange,
}: GoogleSignInButtonProps) {
  const { signIn } = useAuthActions();
  const googleConfigured = useQuery(api.authStatus.googleOAuthConfigured);

  if (googleConfigured === false) {
    return null;
  }

  async function handleClick() {
    onError?.("");
    onLoadingChange?.(true);
    try {
      await signIn("google", { redirectTo });
    } catch (err) {
      onError?.(googleAuthErrorMessage(err));
      onLoadingChange?.(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || googleConfigured === undefined}
      onClick={() => void handleClick()}
      className={cn(
        "w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-border bg-background/60 text-foreground font-medium text-sm hover:bg-background hover:border-white/20 active:scale-[0.98] transition-all disabled:opacity-60",
        className,
      )}
    >
      <GoogleIcon className="w-5 h-5 shrink-0" />
      {label}
    </button>
  );
}

export function GoogleSignInDivider() {
  const googleConfigured = useQuery(api.authStatus.googleOAuthConfigured);
  if (googleConfigured === false) {
    return null;
  }
  return (
    <div className="relative flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        or email
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function GoogleSignInUnavailableNote() {
  const setup = useQuery(api.authStatus.googleOAuthSetup);
  if (setup?.configured !== false) {
    return null;
  }
  return (
    <p className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
      Google sign-in is not set up on this deployment. Use email below, or set{" "}
      <code className="text-foreground/80">AUTH_GOOGLE_ID</code> and{" "}
      <code className="text-foreground/80">AUTH_GOOGLE_SECRET</code> in Convex.
      {setup?.redirectUri ? (
        <>
          {" "}
          Redirect URI:{" "}
          <code className="block mt-2 break-all text-foreground/70">
            {setup.redirectUri}
          </code>
        </>
      ) : null}
    </p>
  );
}
