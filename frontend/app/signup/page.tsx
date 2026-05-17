"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { AuthScreen, authInputClassName } from "@/components/auth/auth-screen";
import {
  GoogleSignInButton,
  GoogleSignInDivider,
  GoogleSignInUnavailableNote,
} from "@/components/auth/google-sign-in-button";
import { cn } from "@/lib/utils";
import { normalizeEmail } from "@/lib/normalize-email";

function authErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Invalid password")) {
    return "Password must be at least 8 characters.";
  }
  if (msg.includes("already exists")) {
    return "An account with this email already exists. Sign in instead.";
  }
  return "Sign up failed. Try again or sign in.";
}

export default function SignupPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }
    setError("");
    setLoading(true);
    const trimmedEmail = normalizeEmail(email);
    try {
      await signIn("password", {
        email: trimmedEmail,
        password,
        flow: "signUp",
        name: trimmedName,
      });
      router.push("/timelines");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Start rewriting history today"
    >
      <div className="space-y-6">
        <GoogleSignInButton
          disabled={loading}
          onError={setError}
          onLoadingChange={setLoading}
        />
        <GoogleSignInUnavailableNote />
        <GoogleSignInDivider />

        <form onSubmit={handleSubmit} className="space-y-5">
          <SignupFields
            name={name}
            email={email}
            password={password}
            confirm={confirm}
            showPassword={showPassword}
            showConfirm={showConfirm}
            loading={loading}
            onNameChange={setName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            onShowPasswordToggle={() => setShowPassword((p) => !p)}
            onShowConfirmToggle={() => setShowConfirm((p) => !p)}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/85 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create account
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}

function SignupFields(props: {
  name: string;
  email: string;
  password: string;
  confirm: string;
  showPassword: boolean;
  showConfirm: boolean;
  loading: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  onShowPasswordToggle: () => void;
  onShowConfirmToggle: () => void;
}) {
  return (
  <>
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Display name
      </label>
      <input
        type="text"
        autoComplete="name"
        required
        value={props.name}
        onChange={(e) => props.onNameChange(e.target.value)}
        placeholder="HistoryBuff_42"
        className={authInputClassName}
        disabled={props.loading}
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Email address
      </label>
      <input
        type="email"
        autoComplete="email"
        required
        value={props.email}
        onChange={(e) => props.onEmailChange(e.target.value)}
        placeholder="you@example.com"
        className={authInputClassName}
        disabled={props.loading}
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Password
      </label>
      <div className="relative">
        <input
          type={props.showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          value={props.password}
          onChange={(e) => props.onPasswordChange(e.target.value)}
          placeholder="Min. 8 characters"
          className={cn(authInputClassName, "pr-11")}
          disabled={props.loading}
        />
        <button
          type="button"
          onClick={props.onShowPasswordToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={props.showPassword ? "Hide password" : "Show password"}
        >
          {props.showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Confirm password
      </label>
      <div className="relative">
        <input
          type={props.showConfirm ? "text" : "password"}
          autoComplete="new-password"
          required
          value={props.confirm}
          onChange={(e) => props.onConfirmChange(e.target.value)}
          placeholder="Repeat password"
          className={cn(authInputClassName, "pr-11")}
          disabled={props.loading}
        />
        <button
          type="button"
          onClick={props.onShowConfirmToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={props.showConfirm ? "Hide password" : "Show password"}
        >
          {props.showConfirm ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  </>
  );
}
