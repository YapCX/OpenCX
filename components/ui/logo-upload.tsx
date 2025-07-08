"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";

interface LogoUploadProps {
  currentLogoId?: Id<"_storage">;
  onLogoChange: (logoId: Id<"_storage"> | undefined) => void;
  className?: string;
}

export function LogoUpload({ currentLogoId, onLogoChange, className }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const deleteFile = useMutation(api.files.deleteFileByStorageId);
  
  // Get current logo data
  const logoData = useQuery(
    api.files.getFileByStorageId,
    currentLogoId ? { storageId: currentLogoId } : "skip"
  );

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Validate image dimensions and file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PNG, JPG, or SVG files only");
      return;
    }

    setIsUploading(true);

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Save file metadata
      const fileId = await saveFile({
        storageId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        description: "Company logo",
      });

      onLogoChange(storageId);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemove = async () => {
    if (!currentLogoId) return;

    try {
      await deleteFile({ storageId: currentLogoId });
      onLogoChange(undefined);
      toast.success("Logo removed successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to remove logo");
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <Label className="text-sm font-medium">Company Logo</Label>
      
      {currentLogoId && logoData ? (
        // Display current logo
        <div className="relative">
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex-shrink-0">
              {logoData.url ? (
                <Image 
                  src={logoData.url} 
                  alt="Company logo"
                  width={48}
                  height={48}
                  className="object-contain rounded"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{logoData.fileName}</p>
              <p className="text-xs text-gray-500">
                {(logoData.fileSize / 1024).toFixed(1)} KB • {logoData.fileType}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFileDialog}
                disabled={isUploading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Upload area
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm text-gray-600">Uploading logo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                Upload company logo
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG, or SVG • Max 5MB • Recommended: 200px height
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFileDialog}
                className="mt-3"
              >
                Choose File
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}