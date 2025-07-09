"use client";

import { Unauthenticated, AuthLoading } from "convex/react";
import { LandingPage } from "@/components/landing/LandingPage";

export default function HomePage() {
  return (
    <>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </AuthLoading>
    </>
  );
}
