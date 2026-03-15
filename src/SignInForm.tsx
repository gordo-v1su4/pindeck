"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ChromeIcon, GithubIcon, UserRoundIcon } from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4">
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

      <Card className="border-border/70 bg-card/90 shadow-2xl shadow-black/35 backdrop-blur">
        <CardHeader className="gap-4">
          <Tabs value={flow} onValueChange={(value) => setFlow(value as "signIn" | "signUp")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signIn">Sign in</TabsTrigger>
              <TabsTrigger value="signUp">Create account</TabsTrigger>
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
                  required
                />
                {flow === "signUp" && (
                  <FieldDescription>
                    Use at least 8 characters so your account is ready for future sign-ins.
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>

            <Button type="submit" size="lg" className="w-full" disabled={submitting || isLoading}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitLabel}
            </Button>
          </form>

          <FieldSeparator>Or continue with</FieldSeparator>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => handleProviderSignIn("github", "GitHub")}
              disabled={submitting}
            >
              <GithubIcon data-icon="inline-start" />
              GitHub
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => handleProviderSignIn("google", "Google")}
              disabled={submitting}
            >
              <ChromeIcon data-icon="inline-start" />
              Google
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => void handleAnonymousSignIn()}
              disabled={submitting}
            >
              <UserRoundIcon data-icon="inline-start" />
              Continue as guest
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
