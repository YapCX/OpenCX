"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle, XCircle, UserPlus } from "lucide-react";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user } = useUser();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [error, setError] = useState<string>("");

  const invitationValidation = useQuery(
    api.users.validateInvitation,
    token ? { token } : "skip"
  );
  const acceptInvitation = useMutation(api.users.acceptInvitation);

  const handleAcceptInvitation = async () => {
    if (!token || !user) return;

    setIsAccepting(true);
    setError("");
    try {
      await acceptInvitation({
        token,
        clerkUserId: user.id,
      });
      setIsAccepted(true);

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      setIsAccepting(false);
    }
  };

  // Loading state
  if (!token || !invitationValidation) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Invalid invitation
  if (!invitationValidation.valid) {
    return (
      <div className="text-center">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
        <p className="text-gray-600 mb-4">{invitationValidation.error}</p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            This invitation may have expired or been used already. Please contact your administrator for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (isAccepted) {
    return (
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
        <p className="text-gray-600 mb-4">
          Your invitation has been accepted successfully. You now have access to the system.
        </p>
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </div>
    );
  }

  // Need to sign in first
  if (!user) {
    return (
      <div className="text-center">
        <UserPlus className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
        <p className="text-gray-600 mb-4">
          Please sign in to accept your invitation and access the system.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Invited Email:</strong> {invitationValidation.user?.email}
          </p>
        </div>
        <SignInButton>
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md transition-colors">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  // Ready to accept invitation
  return (
    <div className="text-center">
      <UserPlus className="h-12 w-12 text-green-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Accept Invitation</h1>
      <p className="text-gray-600 mb-4">
        You&apos;ve been invited to join the system. Click below to accept your invitation.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          <strong>Email:</strong> {invitationValidation.user?.email}
        </p>
        {invitationValidation.user?.fullName && (
          <p className="text-sm text-green-800">
            <strong>Name:</strong> {invitationValidation.user.fullName}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        onClick={handleAcceptInvitation}
        disabled={isAccepting}
        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-md transition-colors"
      >
        {isAccepting ? "Accepting..." : "Accept Invitation"}
      </button>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="bg-white shadow rounded-lg p-8">
            <AcceptInvitationContent />
          </div>
        </div>
      </div>
    </Suspense>
  );
}