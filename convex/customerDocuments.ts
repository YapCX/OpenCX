import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("customerDocuments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect()
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    return await ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    documentType: v.string(),
    fileName: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    return await ctx.db.insert("customerDocuments", {
      customerId: args.customerId,
      documentType: args.documentType,
      fileName: args.fileName,
      storageId: args.storageId,
      uploadedAt: Date.now(),
      uploadedBy: userId,
    })
  },
})

export const remove = mutation({
  args: { id: v.id("customerDocuments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const doc = await ctx.db.get(args.id)
    if (!doc) throw new Error("Document not found")

    await ctx.storage.delete(doc.storageId)
    await ctx.db.delete(args.id)
  },
})

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})
