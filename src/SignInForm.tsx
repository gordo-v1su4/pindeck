"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { TextField, Button, Text, Flex, Box, Separator } from "@radix-ui/themes";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Flex direction="column" gap="4" className="w-full">
      <Flex 
        as="form"
        direction="column" 
        gap="4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData)
            .then(() => {
              // Sign in successful
              toast.success(flow === "signIn" ? "Signed in successfully!" : "Account created successfully!");
            })
            .catch((error) => {
              let toastTitle = "";
              if (error.message.includes("Invalid password")) {
                toastTitle = "Invalid password. Please try again.";
              } else {
                toastTitle =
                  flow === "signIn"
                    ? "Could not sign in, did you mean to sign up?"
                    : "Could not sign up, did you mean to sign in?";
              }
              toast.error(toastTitle);
            })
            .finally(() => {
              setSubmitting(false);
            });
        }}
      >
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
        <Button type="submit" disabled={submitting} size="3" className="w-full">
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </Button>
        <Text size="2" color="gray" className="text-center">
          {flow === "signIn"
            ? "Don't have an account? "
            : "Already have an account? "}
          <Button
            variant="ghost"
            size="1"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
            className="inline"
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </Button>
        </Text>
      </Flex>
      <Flex align="center" justify="center" gap="3">
        <Separator className="flex-1" />
        <Text size="2" color="gray" className="px-2">or</Text>
        <Separator className="flex-1" />
      </Flex>
      <Button variant="outline" size="3" className="w-full" onClick={() => void signIn("anonymous")}>
        Sign in anonymously
      </Button>
    </Flex>
  );
}
