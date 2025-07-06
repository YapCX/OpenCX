import { useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

export function useUserSync() {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const syncFromClerk = useMutation(api.users.syncFromClerk);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (isAuthenticated && user) {
        setIsLoading(true);
        setSyncError(null);
        try {
          await syncFromClerk({
            clerkUserId: user.id,
            email: user.emailAddresses[0]?.emailAddress || "",
            fullName: user.fullName || undefined,
          });
        } catch (error) {
          console.error("Failed to sync user:", error);
          setSyncError(error instanceof Error ? error.message : "Failed to sync user");
        } finally {
          setIsLoading(false);
        }
      }
    };

    syncUser();
  }, [isAuthenticated, user, syncFromClerk]);

  return { isAuthenticated, user, syncError, isLoading };
}