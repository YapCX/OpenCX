"use client";

import { useUserSync } from "@/hooks/useUserSync";
import { ReactNode } from "react";

interface UserSyncProviderProps {
  children: ReactNode;
}

export function UserSyncProvider({ children }: UserSyncProviderProps) {
  const { syncError, isLoading } = useUserSync();

  // Show simple loading state while syncing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Show error if sync failed
  if (syncError && syncError.includes("No invitation found")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <div className="mx-auto h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-yellow-600">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Required</h2>
            <p className="text-gray-600 mb-4">This system requires an invitation to access.</p>
            <p className="text-sm text-gray-500">Please contact your administrator for an invitation.</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}