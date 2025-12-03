import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db.query("mainAccounts").collect()
  },
})

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const accounts = await ctx.db.query("mainAccounts").collect()
    return accounts.filter(a => a.isActive)
  },
})

export const listByType = query({
  args: { accountType: v.string() },
  handler: async (ctx, { accountType }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db
      .query("mainAccounts")
      .withIndex("by_type", (q) => q.eq("accountType", accountType))
      .collect()
  },
})

export const get = query({
  args: { id: v.id("mainAccounts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db.get(id)
  },
})

export const create = mutation({
  args: {
    accountCode: v.string(),
    accountName: v.string(),
    accountType: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("mainAccounts")
      .withIndex("by_code", (q) => q.eq("accountCode", args.accountCode))
      .first()

    if (existing) {
      throw new Error(`Account code ${args.accountCode} already exists`)
    }

    const now = Date.now()
    return await ctx.db.insert("mainAccounts", {
      accountCode: args.accountCode,
      accountName: args.accountName,
      accountType: args.accountType,
      description: args.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("mainAccounts"),
    accountCode: v.string(),
    accountName: v.string(),
    accountType: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error("Main account not found")

    const duplicate = await ctx.db
      .query("mainAccounts")
      .withIndex("by_code", (q) => q.eq("accountCode", args.accountCode))
      .first()

    if (duplicate && duplicate._id !== args.id) {
      throw new Error(`Account code ${args.accountCode} already exists`)
    }

    await ctx.db.patch(args.id, {
      accountCode: args.accountCode,
      accountName: args.accountName,
      accountType: args.accountType,
      description: args.description,
      isActive: args.isActive,
      updatedAt: Date.now(),
    })

    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id("mainAccounts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const subAccounts = await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_main_account", (q) => q.eq("mainAccountId", id))
      .collect()

    if (subAccounts.length > 0) {
      throw new Error("Cannot delete main account with linked sub-accounts")
    }

    await ctx.db.delete(id)
  },
})

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.query("mainAccounts").first()
    if (existing) return { message: "Default main accounts already exist" }

    const defaultAccounts = [
      { code: "1000", name: "Assets", type: "assets", description: "All assets owned by the company" },
      { code: "2000", name: "Liabilities", type: "liabilities", description: "All debts and obligations" },
      { code: "3000", name: "Equity", type: "equity", description: "Owner's equity and retained earnings" },
      { code: "4000", name: "Revenue", type: "revenue", description: "Income from operations" },
      { code: "5000", name: "Cost of Goods Sold", type: "expenses", description: "Direct costs of currency exchange" },
      { code: "6000", name: "Operating Expenses", type: "expenses", description: "Day-to-day operational costs" },
    ]

    const now = Date.now()
    for (const account of defaultAccounts) {
      await ctx.db.insert("mainAccounts", {
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        description: account.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    }

    return { message: "Default main accounts created successfully" }
  },
})
