import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

// shadcn/ui components
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Separator } from "./components/ui/separator";
import { Spinner } from "./components/ui/spinner";
import { FlexLayout, Stack } from "./components/layout";

// Lucide icons
import { Eye, EyeOff, CheckCircle, XCircle, UserPlus } from "lucide-react";

interface AcceptInvitationFormProps {
  token: string;
}

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  // Validate the invitation token
  const invitationData = useQuery(api.users.validateInvitation, { token });
  const acceptInvitation = useMutation(api.users.acceptInvitation);
  const { signIn } = useAuthActions();

  const isValidToken = invitationData !== undefined;
  const isExpiredOrInvalid = invitationData === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!password.trim()) {
        toast.error("Password is required");
        return;
      }

      if (password.length < 8) {
        toast.error("Password must be at least 8 characters long");
        return;
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      // First, accept the invitation (this marks it as accepted in the database)
      const result = await acceptInvitation({
        token,
        password: password.trim()
      });

      // Then create the auth account using Convex Auth
      const formData = new FormData();
      formData.set("email", result.email);
      formData.set("password", password.trim());
      formData.set("flow", "signUp");

      await signIn("password", formData);

      setIsAccepted(true);
      toast.success("Account activated successfully! Signing you in...");

    } catch (error: any) {
      toast.error(error.message || "Failed to activate account");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAccepted) {
    return (
      <Stack space={4}>
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Account Activated!</CardTitle>
            <CardDescription>
              Your account has been successfully activated. You can now sign in to OpenCX.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting to sign in page...
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  if (isExpiredOrInvalid) {
    return (
      <Stack space={4}>
        <div className="flex items-center justify-center mb-4">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Invalid or Expired Invitation</div>
              <p className="text-sm">
                This invitation link is either invalid or has expired.
                Please contact your administrator for a new invitation.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Go to Sign In
          </Button>
        </div>
      </Stack>
    );
  }

  if (!isValidToken) {
    return (
      <Stack space={4}>
        <div className="text-center">
          <FlexLayout align="center" className="justify-center">
            <Spinner size="lg" className="text-primary" />
          </FlexLayout>
          <p className="mt-2 text-sm text-muted-foreground">Validating invitation...</p>
        </div>
      </Stack>
    );
  }

  return (
    <Stack space={4}>
      <div className="flex items-center justify-center mb-4">
        <UserPlus className="h-12 w-12 text-primary" />
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Welcome to OpenCX</CardTitle>
          <CardDescription>
            You've been invited to join as {invitationData.fullName || "User"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Account Details:</div>
                <div className="text-sm space-y-1">
                  <div><strong>Email:</strong> {invitationData.email}</div>
                  <div><strong>Name:</strong> {invitationData.fullName || "Not specified"}</div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <Separator className="mb-4" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Activating Account..." : "Activate Account"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/'}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </Stack>
  );
}