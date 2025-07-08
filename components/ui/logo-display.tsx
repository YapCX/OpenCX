"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Building2 } from "lucide-react";
import Image from "next/image";

interface LogoDisplayProps {
  logoImageId?: Id<"_storage">;
  companyName?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LogoDisplay({ 
  logoImageId, 
  companyName = "OpenCX", 
  className = "",
  size = "md" 
}: LogoDisplayProps) {
  const fileData = useQuery(
    api.files.getFileByStorageId, 
    logoImageId ? { storageId: logoImageId } : "skip"
  );

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  if (logoImageId && fileData?.url) {
    return (
      <Image
        src={fileData.url}
        alt={`${companyName} logo`}
        width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
        height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
        className={`object-contain ${className}`}
        onError={(e) => {
          // Fallback to icon if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Fallback to building icon
  return (
    <div className={`${sizeClasses[size]} bg-gray-100 rounded flex items-center justify-center ${className}`}>
      <Building2 className={`${iconSizeClasses[size]} text-gray-400`} />
    </div>
  );
}