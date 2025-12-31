"use client";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TextField, Button, Text, Flex, Box, Separator } from "@radix-ui/themes";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [signInStarted, setSignInStarted] = useState(false);

  // Monitor auth state changes after sign-in attempt
  useEffect(() => {
    if (signInStarted) {
      console.log("🔐 Auth state changed - isAuthenticated:", isAuthenticated);
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
  }, [isAuthenticated, signInStarted, flow]);

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
    
    let waitingForAuth = false;
    
    try {
      const result = await signIn("password", formData);
      console.log("✅ Sign-in result:", result);
      
      // Check if result indicates sign-in is complete or in progress
      if (result && typeof result === 'object' && 'signingIn' in result) {
        if (result.signingIn === true) {
          console.log("⏳ Sign-in in progress, waiting for auth state update...");
          waitingForAuth = true;
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

  return (
    <Flex direction="column" gap="4" className="w-full">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <TextField.Root
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            required
            size="3"
          />
          <TextField.Root
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            size="3"
          />
          <Button 
            type="submit" 
            disabled={submitting} 
            size="3" 
            className="w-full"
          >
            {flow === "signIn" ? "Sign in" : "Sign up"}
          </Button>
          <Text size="2" color="gray" className="text-center">
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
            <Button
              type="button"
              variant="ghost"
              size="1"
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
              }}
              className="inline"
            >
              {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
            </Button>
          </Text>
        </Flex>
      </form>
      <Flex align="center" justify="center" gap="3">
        <Separator className="flex-1" />
        <Text size="2" color="gray" className="px-2">or</Text>
        <Separator className="flex-1" />
      </Flex>
      <Button 
        variant="outline" 
        size="3" 
        className="w-full" 
        onClick={() => {
          void signIn("anonymous");
        }}
      >
        Sign in anonymously
      </Button>
    </Flex>
  );
}
