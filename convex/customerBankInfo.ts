import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("customerBankInfo")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect()
  },
})

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    bankName: v.string(),
    accountName: v.string(),
    accountNumber: v.string(),
    routingNumber: v.optional(v.string()),
    swiftCode: v.optional(v.string()),
    iban: v.optional(v.string()),
    bankAddress: v.optional(v.string()),
    currency: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const now = Date.now()
    const isDefault = args.isDefault ?? false

    if (isDefault) {
      const existingAccounts = await ctx.db
        .query("customerBankInfo")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
        .collect()

      for (const account of existingAccounts) {
        if (account.isDefault) {
          await ctx.db.patch(account._id, { isDefault: false, updatedAt: now })
        }
      }
    }

    return await ctx.db.insert("customerBankInfo", {
      customerId: args.customerId,
      bankName: args.bankName,
      accountName: args.accountName,
      accountNumber: args.accountNumber,
      routingNumber: args.routingNumber,
      swiftCode: args.swiftCode,
      iban: args.iban,
      bankAddress: args.bankAddress,
      currency: args.currency,
      isDefault,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("customerBankInfo"),
    bankName: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    routingNumber: v.optional(v.string()),
    swiftCode: v.optional(v.string()),
    iban: v.optional(v.string()),
    bankAddress: v.optional(v.string()),
    currency: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const { id, ...updates } = args
    const bankInfo = await ctx.db.get(id)
    if (!bankInfo) throw new Error("Bank info not found")

    const now = Date.now()

    if (updates.isDefault) {
      const existingAccounts = await ctx.db
        .query("customerBankInfo")
        .withIndex("by_customer", (q) => q.eq("customerId", bankInfo.customerId))
        .collect()

      for (const account of existingAccounts) {
        if (account._id !== id && account.isDefault) {
          await ctx.db.patch(account._id, { isDefault: false, updatedAt: now })
        }
      }
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now,
    })
  },
})

export const remove = mutation({
  args: { id: v.id("customerBankInfo") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    await ctx.db.delete(args.id)
  },
})
