"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { GitBranchIcon, GlobeIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const description =
    flow === "signIn"
      ? "Enter your email and password below to continue into Pindeck."
      : "Enter your email below to create your account and start building decks.";
  const submitLabel =
    flow === "signIn"
      ? submitting
        ? "Signing in..."
        : "Sign In with Email"
      : submitting
        ? "Creating account..."
        : "Create account";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex scale-[1.65] flex-col items-center gap-0.5">
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

      <Card className="border border-white/8 bg-[#17191d]/95 shadow-2xl shadow-black/35 ring-0 backdrop-blur">
        <CardHeader className="gap-4">
          <Tabs value={flow} onValueChange={(value) => setFlow(value as "signIn" | "signUp")}>
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-white/5 p-1">
              <TabsTrigger
                value="signIn"
                className="rounded-lg text-white/60 data-[state=active]:bg-[var(--pd-accent)] data-[state=active]:text-white"
              >
                Sign in
              </TabsTrigger>
              <TabsTrigger
                value="signUp"
                className="rounded-lg text-white/60 data-[state=active]:bg-[var(--pd-accent)] data-[state=active]:text-white"
              >
                Create account
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="auth-email" className="sr-only">
                  Email
                </FieldLabel>
                <Input
                  id="auth-email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="h-11 rounded-xl border-white/10 bg-white/5 px-4 text-white placeholder:text-white/35 focus-visible:border-[var(--pd-accent)] focus-visible:ring-[var(--pd-accent-soft)] dark:bg-white/5"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="auth-password" className="sr-only">
                  Password
                </FieldLabel>
                <Input
                  id="auth-password"
                  type="password"
                  name="password"
                  placeholder="Password"
                  autoComplete={flow === "signIn" ? "current-password" : "new-password"}
                  className="h-11 rounded-xl border-white/10 bg-white/5 px-4 text-white placeholder:text-white/35 focus-visible:border-[var(--pd-accent)] focus-visible:ring-[var(--pd-accent-soft)] dark:bg-white/5"
                  required
                />
                {flow === "signUp" && (
                  <FieldDescription>
                    Use at least 8 characters so your account is ready for future sign-ins.
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full rounded-xl bg-[var(--pd-accent)] text-base font-semibold text-[var(--pd-accent-contrast-text)] hover:bg-[var(--pd-accent-hover)] hover:text-[var(--pd-accent-contrast-text)]"
              disabled={submitting || isLoading}
            >
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitLabel}
            </Button>
          </form>

          <FieldSeparator className="text-sm [&_[data-slot=field-separator-content]]:bg-transparent [&_[data-slot=field-separator-content]]:px-0 [&_[data-slot=field-separator-content]]:text-muted-foreground">
            Or continue with
          </FieldSeparator>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => handleProviderSignIn("github", "GitHub")}
              disabled={submitting}
            >
              <GitBranchIcon data-icon="inline-start" />
              GitHub
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => handleProviderSignIn("google", "Google")}
              disabled={submitting}
            >
              <GlobeIcon data-icon="inline-start" />
              Google
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-full rounded-xl text-white/80 hover:bg-white/5 hover:text-white"
              onClick={() => void handleAnonymousSignIn()}
              disabled={submitting}
            >
              <UserRoundIcon data-icon="inline-start" />
              Continue as guest (no saved decks)
            </Button>
          </div>
        </CardContent>

        <CardFooter className="justify-center px-6 py-5 text-center text-sm leading-relaxed text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </CardFooter>
      </Card>
    </div>
  );
}
