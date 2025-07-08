import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for file uploads
export const generateUploadUrl = mutation(async (ctx) => {
  // In a production app, you might want to add authentication here
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  
  return await ctx.storage.generateUploadUrl();
});

// Save file metadata after upload
export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Store file metadata
    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      description: args.description,
      uploadedBy: identity.subject,
      uploadedAt: Date.now(),
    });

    return fileId;
  },
});

// Get file URL
export const getFileUrl = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return null;
    }

    return await ctx.storage.getUrl(file.storageId);
  },
});

// Get file by storage ID
export const getFileByStorageId = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
    
    if (!file) {
      return null;
    }

    const url = await ctx.storage.getUrl(file.storageId);
    return { ...file, url };
  },
});

// Delete file
export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId);
    
    // Delete metadata
    await ctx.db.delete(args.fileId);
  },
});

// Delete file by storage ID
export const deleteFileByStorageId = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const file = await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
    
    if (!file) {
      throw new Error("File not found");
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId);
    
    // Delete metadata
    await ctx.db.delete(file._id);
  },
});