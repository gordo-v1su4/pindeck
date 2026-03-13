"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { TextField, Button, Text, Flex, Box, Separator, IconButton } from "@radix-ui/themes";
import { Chrome, Github, UserRound } from "lucide-react";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [signInStarted, setSignInStarted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Monitor auth state changes after sign-in attempt
  useEffect(() => {
    console.log("🔐 Auth state:", { isAuthenticated, isLoading, signInStarted });
    
    if (signInStarted) {
      const authStorage = localStorage.getItem("convex-auth");
      console.log("🔐 LocalStorage Auth:", authStorage ? "exists" : "missing");
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          console.log("🔐 Auth Token Keys:", Object.keys(parsed));
        } catch (e) {
          console.log("🔐 Auth Storage Parse Error:", e);
        }
      }
      
      // When authentication completes, show success and reset
      if (isAuthenticated) {
        console.log("✅ Authentication completed successfully!");
        toast.success(flow === "signIn" ? "Signed in successfully!" : "Account created successfully!");
        setSignInStarted(false);
        setSubmitting(false);
      }
    }
  }, [isAuthenticated, isLoading, signInStarted, flow]);

  // Timeout to detect stuck auth (after 10 seconds)
  useEffect(() => {
    if (signInStarted && !isAuthenticated) {
      const timeout = setTimeout(() => {
        if (signInStarted && !isAuthenticated) {
          console.error("⏰ Auth timeout - sign-in did not complete within 10 seconds");
          console.log("🔍 Debug info:", {
            isAuthenticated,
            isLoading,
            localStorage: localStorage.getItem("convex-auth") ? "exists" : "missing"
          });
          toast.error("Sign-in timed out. Please check your connection and try again.");
          setSignInStarted(false);
          setSubmitting(false);
        }
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [signInStarted, isAuthenticated, isLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Get values directly from FormData (works with name attributes)
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string || "";
    const password = formData.get("password") as string || "";
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setSubmitting(true);
    setSignInStarted(true);
    formData.set("flow", flow);

    try {
      const result = await signIn("password", formData);
      console.log("✅ Sign-in result:", result);
      
      // Check if result indicates sign-in is complete or in progress
      if (result && typeof result === 'object' && 'signingIn' in result) {
        if (result.signingIn === true) {
          console.log("⏳ Sign-in in progress, waiting for auth state update...");
          // Don't show success toast yet - wait for auth state to update via useEffect
          // Don't reset form or set submitting to false yet - wait for auth completion
        } else {
          // Sign-in completed immediately
          console.log("✅ Sign-in completed immediately");
          toast.success(flow === "signIn" ? "Signed in successfully!" : "Account created successfully!");
          form.reset();
          setSubmitting(false);
          setSignInStarted(false);
        }
      } else {
        // If result doesn't have signingIn property, assume it completed
        console.log("✅ Sign-in completed (no signingIn property)");
        toast.success(flow === "signIn" ? "Signed in successfully!" : "Account created successfully!");
        form.reset();
        setSubmitting(false);
        setSignInStarted(false);
      }
    } catch (error: any) {
      console.error("❌ Sign-in error:", error);
      let toastTitle = "";
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("Account") && errorMsg.includes("already exists")) {
        toastTitle = "An account with this email already exists. Please sign in instead.";
        setFlow("signIn");
      } else if (errorMsg.includes("InvalidSecret") || errorMsg.includes("Invalid password")) {
        toastTitle = "Invalid password. Please check your password and try again.";
      } else if (errorMsg.includes("User not found") || errorMsg.includes("not found")) {
        toastTitle = flow === "signIn" 
          ? "No account found with this email. Please sign up first."
          : "Could not create account. Please try again.";
      } else {
        toastTitle =
          flow === "signIn"
            ? `Could not sign in: ${errorMsg || "Unknown error"}. Please check your email and password.`
            : `Could not sign up: ${errorMsg || "Unknown error"}. Please try again.`;
      }
      toast.error(toastTitle);
      setSignInStarted(false);
      setSubmitting(false);
    }
    // Note: If waitingForAuth is true, useEffect will handle resetting submitting when auth completes
  };

  const handleProviderSignIn = (provider: "google" | "github", label: string) => {
    setSubmitting(true);
    void signIn(provider).catch((error) => {
      console.error(`❌ ${label} sign-in error:`, error);
      toast.error(`${label} sign-in failed: ` + (error as Error).message);
      setSubmitting(false);
      setSignInStarted(false);
    });
  };

  const title = "Discover Visual Inspiration";
  const description = "A curated collection of visual references, design inspiration, and creative shots";
  const submitLabel =
    flow === "signIn"
      ? submitting
        ? "Signing in..."
        : "Sign in"
      : submitting
        ? "Creating account..."
        : "Sign up";

  return (
    <Box className="auth-shell">
      <Flex direction="column" gap="6" className="w-full">
        <Flex direction="column" align="center" gap="5" className="text-center">
          <Box className="max-w-[40rem] px-2">
            <Text as="p" size="7" weight="bold" className="auth-hero-title">
              {title}
            </Text>
            <Text as="p" size="4" color="gray" className="mt-2 auth-hero-copy">
              {description}
            </Text>
          </Box>
        </Flex>

        <form onSubmit={handleSubmit} className="auth-form-column">
          <Flex direction="column" gap="4">
            <TextField.Root
              id="auth-email"
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="email"
              required
              size="3"
              className="auth-hero-field"
            />

            <TextField.Root
              id="auth-password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              required
              size="3"
              className="auth-hero-field"
            >
              <TextField.Slot side="right">
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeClosedIcon width="18" height="18" /> : <EyeOpenIcon width="18" height="18" />}
                </button>
              </TextField.Slot>
            </TextField.Root>

            <Button type="submit" disabled={submitting} size="4" className="auth-primary-button">
              {submitLabel}
            </Button>
          </Flex>
        </form>

        <Flex justify="center" align="center" gap="2" wrap="wrap" className="text-center">
          <Text size="4" color="gray">
            {flow === "signIn" ? "Don't have an account?" : "Already have an account?"}
          </Text>
          <Button
            type="button"
            variant="ghost"
            size="3"
            className="auth-switch-link"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </Button>
        </Flex>

        <Flex align="center" justify="center" gap="4">
          <Separator className="flex-1 auth-divider-line" />
          <Text size="3" color="gray" className="auth-divider-text">
            or
          </Text>
          <Separator className="flex-1 auth-divider-line" />
        </Flex>

        <Box className="auth-provider-stack">
          <IconButton
            variant="solid"
            size="4"
            className="auth-provider-button"
            aria-label="Continue with Google"
            title="Continue with Google"
            onClick={() => handleProviderSignIn("google", "Google")}
            disabled={submitting}
          >
            <Chrome size={18} strokeWidth={2.2} />
          </IconButton>
          <IconButton
            variant="solid"
            size="4"
            className="auth-provider-button"
            aria-label="Continue with GitHub"
            title="Continue with GitHub"
            onClick={() => handleProviderSignIn("github", "GitHub")}
            disabled={submitting}
          >
            <Github size={18} strokeWidth={2.2} />
          </IconButton>
          <IconButton
            variant="solid"
            size="4"
            className="auth-provider-button"
            aria-label="Continue anonymously"
            title="Continue anonymously"
            onClick={async () => {
              console.log("🔐 Starting anonymous sign-in...");
              setSubmitting(true);
              setSignInStarted(true);
              try {
                const result = await signIn("anonymous");
                console.log("🔐 Anonymous sign-in result:", result);
              } catch (error) {
                console.error("❌ Anonymous sign-in error:", error);
                toast.error("Anonymous sign-in failed: " + (error as Error).message);
                setSubmitting(false);
                setSignInStarted(false);
              }
            }}
            disabled={submitting}
          >
            <UserRound size={18} strokeWidth={2.2} />
          </IconButton>
        </Box>
      </Flex>
    </Box>
  );
}
