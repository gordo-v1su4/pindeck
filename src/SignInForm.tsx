"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { GitBranchIcon, GlobeIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [signInStarted, setSignInStarted] = useState(false);

  useEffect(() => {
    if (!signInStarted) return;
    if (!isAuthenticated) return;

    toast.success(
      flow === "signIn" ? "Signed in successfully." : "Account created successfully."
    );
    setSignInStarted(false);
    setSubmitting(false);
  }, [flow, isAuthenticated, signInStarted]);

  useEffect(() => {
    if (!signInStarted || isAuthenticated) return;

    const timeout = setTimeout(() => {
      toast.error("Sign-in timed out. Please check your connection and try again.");
      setSignInStarted(false);
      setSubmitting(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, signInStarted]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get("email") as string) || "";
    const password = (formData.get("password") as string) || "";

    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setSignInStarted(true);
    formData.set("flow", flow);

    try {
      const result = await signIn("password", formData);

      if (result && typeof result === "object" && "signingIn" in result && result.signingIn) {
        return;
      }

      toast.success(
        flow === "signIn" ? "Signed in successfully." : "Account created successfully."
      );
      form.reset();
      setSubmitting(false);
      setSignInStarted(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      if (message.includes("already exists")) {
        toast.error("An account with this email already exists. Please sign in instead.");
        setFlow("signIn");
      } else if (message.includes("InvalidSecret") || message.includes("Invalid password")) {
        toast.error("Invalid password. Please check your password and try again.");
      } else if (message.includes("User not found") || message.includes("not found")) {
        toast.error(
          flow === "signIn"
            ? "No account found with this email. Please sign up first."
            : "Could not create account. Please try again."
        );
      } else {
        toast.error(
          flow === "signIn"
            ? `Could not sign in: ${message}`
            : `Could not sign up: ${message}`
        );
      }

      setSignInStarted(false);
      setSubmitting(false);
    }
  };

  const handleProviderSignIn = (provider: "google" | "github", label: string) => {
    setSubmitting(true);
    void signIn(provider).catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`${label} sign-in failed: ${message}`);
      setSubmitting(false);
      setSignInStarted(false);
    });
  };

  const handleAnonymousSignIn = async () => {
    setSubmitting(true);
    setSignInStarted(true);

    try {
      await signIn("anonymous");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Guest sign-in failed: ${message}`);
      setSubmitting(false);
      setSignInStarted(false);
    }
  };

  const title = flow === "signIn" ? "Welcome back" : "Create an account";
  const submitLabel =
    flow === "signIn"
      ? submitting
        ? "Signing in..."
        : "Sign in"
      : submitting
        ? "Creating account..."
        : "Create account";

  return (
    <div className="mx-auto flex w-full max-w-[22.5rem] flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex scale-[1.42] flex-col items-center gap-0.5">
          <div className="site-brand-lockup">
            <div className="site-brand-mark">P/</div>
            <div className="site-brand-word">
              <span className="site-brand-word-light">PIN</span>
              <span className="site-brand-word-accent">DECK</span>
            </div>
          </div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-muted-foreground/85">
            Visual ref system
          </p>
        </div>
      </div>

      <div className="pd-glass-panel auth-panel pd-fade-in">
        <div className="auth-segment">
          {[
            { id: "signIn", label: "Sign in" },
            { id: "signUp", label: "Create account" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFlow(item.id as "signIn" | "signUp")}
              className={flow === item.id ? "auth-segment-button is-active" : "auth-segment-button"}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="auth-panel-title">
          <h1>{title}</h1>
        </div>

        <div className="auth-panel-body">
          <form onSubmit={handleSubmit} className="auth-form-stack">
            <div className="auth-field-stack">
              <div>
                <FieldLabel htmlFor="auth-email" className="auth-panel-label">
                  email
                </FieldLabel>
                <Input
                  id="auth-email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="auth-panel-input"
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="auth-password" className="auth-panel-label">
                  password
                </FieldLabel>
                <Input
                  id="auth-password"
                  type="password"
                  name="password"
                  placeholder="password"
                  autoComplete={flow === "signIn" ? "current-password" : "new-password"}
                  className="auth-panel-input"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="auth-panel-primary"
              disabled={submitting || isLoading}
            >
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitLabel}
            </Button>
          </form>

          <FieldSeparator className="auth-panel-separator">
            Or continue with
          </FieldSeparator>

          <div className="auth-provider-stack-panel">
            <Button
              type="button"
              size="lg"
              className="auth-panel-secondary"
              onClick={() => handleProviderSignIn("github", "GitHub")}
              disabled={submitting}
            >
              <GitBranchIcon data-icon="inline-start" />
              GitHub
            </Button>
            <Button
              type="button"
              size="lg"
              className="auth-panel-secondary"
              onClick={() => handleProviderSignIn("google", "Google")}
              disabled={submitting}
            >
              <GlobeIcon data-icon="inline-start" />
              Google
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="auth-panel-ghost"
            onClick={() => void handleAnonymousSignIn()}
            disabled={submitting}
          >
            <UserRoundIcon data-icon="inline-start" />
            Continue as guest
          </Button>
        </div>

        <div className="auth-panel-footer">
          Terms of Service and Privacy Policy
        </div>
      </div>
    </div>
  );
}
