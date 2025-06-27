import { useState } from "react";
import { useMutation } from "convex/react";
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
import { Stack, FlexLayout } from "./components/layout";

// Lucide icons
import { Eye, EyeOff, Shield, Building2 } from "lucide-react";

export function InitialSetupForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completeInitialSetup = useMutation(api.seed.completeInitialSetup);
  const { signIn } = useAuthActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validation
      if (!email.trim() || !fullName.trim() || !password.trim()) {
        toast.error("All fields are required");
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

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error("Please enter a valid email address");
        return;
      }

      // Step 1: Sign up with Convex Auth first
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("password", password.trim());
      formData.set("name", fullName.trim());
      formData.set("flow", "signUp");

      await signIn("password", formData);

      // Step 2: Complete initial setup (create extended user record and seed data)
      await completeInitialSetup();

      toast.success("Admin account created successfully! Welcome to OpenCX.");

    } catch (error: any) {
      toast.error(error.message || "Failed to create admin account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FlexLayout align="center" className="min-h-screen bg-background justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <FlexLayout align="center" className="mb-4 justify-center">
            <Building2 className="h-12 w-12 text-primary" />
          </FlexLayout>
          <CardTitle className="text-2xl">Welcome to OpenCX</CardTitle>
          <CardDescription>
            Set up your initial administrator account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <Stack space={2}>
                <div className="font-medium">Initial Setup Required</div>
                <p className="text-sm">
                  This appears to be your first time using OpenCX. Create an administrator
                  account to get started. This will also set up:
                </p>
                <Stack as="ul" space={1} className="text-sm mt-2 ml-4">
                  <li>• 8 common currencies (USD, CAD, EUR, GBP, JPY, AUD, CHF, MXN)</li>
                  <li>• Basic system settings and compliance limits</li>
                  <li>• Common ID document types</li>
                  <li>• Full administrator privileges for your account</li>
                </Stack>
              </Stack>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit}>
            <Stack space={4}>
              <Stack space={2}>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                />
              </Stack>

              <Stack space={2}>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Administrator Name"
                  required
                />
              </Stack>

              <Separator />

              <Stack space={2}>
                <Label htmlFor="password">Password *</Label>
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
              </Stack>

              <Stack space={2}>
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
              </Stack>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Admin Account..." : "Create Admin Account"}
                </Button>
              </div>
            </Stack>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              This account will have full administrative privileges and can create additional users.
            </p>
          </div>
        </CardContent>
      </Card>
    </FlexLayout>
  );
}