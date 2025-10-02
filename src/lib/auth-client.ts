import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const {
  signIn,
  signOut,
  signUp,
  useSession
} = authClient;

/**
 * Custom hook to get user role
 * Returns "coach", "client", or null if not authenticated
 */
export function useUserRole(): "coach" | "client" | null {
  const { data: session } = useSession();

  // This will be populated from the session context
  // For now, we'll need to fetch it separately or extend the session
  return (session as any)?.user?.role ?? null;
}
