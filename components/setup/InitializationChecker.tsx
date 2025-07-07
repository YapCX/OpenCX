"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { InitializationWizard } from "./InitializationWizard";

interface InitializationCheckerProps {
  children: React.ReactNode;
}

export function InitializationChecker({ children }: InitializationCheckerProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  
  const initStatus = useQuery(api.settings.getSystemInitializationStatus);
  
  useEffect(() => {
    if (initStatus && !hasChecked) {
      setHasChecked(true);
      
      // Show wizard if system needs initialization
      if (initStatus.needsInitialization) {
        setShowWizard(true);
      }
    }
  }, [initStatus, hasChecked]);

  const handleWizardComplete = () => {
    setShowWizard(false);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
  };

  // Show loading while checking initialization status
  if (!initStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="mt-2 text-gray-600">Checking system status...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <InitializationWizard
        isOpen={showWizard}
        onClose={handleWizardClose}
        onComplete={handleWizardComplete}
      />
    </>
  );
}