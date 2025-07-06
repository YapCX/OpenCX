"use client";

import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-14">
          <Sidebar className="flex-1" />
        </div>
        
        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="flex-1 md:ml-64">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function UnauthenticatedLayout() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to OpenCX</h1>
          <p className="text-muted-foreground">
            Sign in to access your currency exchange management dashboard
          </p>
        </div>
        <div className="space-y-4">
          <SignInButton mode="modal">
            <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 rounded-md">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <>
      <Authenticated>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedLayout />
      </Unauthenticated>
    </>
  );
}