"use client";

import { signOut } from "~/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";

interface SignOutButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function SignOutButton({
  variant = "outline",
  size = "default",
  className
}: SignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignOut}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
