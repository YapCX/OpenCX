import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "./components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const { signOut } = useAuthActions();
  
  return (
    <Button 
      onClick={() => void signOut()} 
      variant="outline" 
      className="w-full"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  );
}