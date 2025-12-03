import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const accounts = await ctx.db.query("ledgerAccounts").collect()

    const mainAccounts = await ctx.db.query("mainAccounts").collect()
    const mainAccountMap = new Map(mainAccounts.map(ma => [ma._id, ma]))

    const branches = await ctx.db.query("branches").collect()
    const branchMap = new Map(branches.map(b => [b._id, b]))

    const tills = await ctx.db.query("tills").collect()
    const tillMap = new Map(tills.map(t => [t._id, t]))

    return accounts.map(account => ({
      ...account,
      mainAccount: account.mainAccountId ? mainAccountMap.get(account.mainAccountId) : undefined,
      branch: account.branchId ? branchMap.get(account.branchId) : undefined,
      till: account.tillId ? tillMap.get(account.tillId) : undefined,
    }))
  },
})

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const accounts = await ctx.db.query("ledgerAccounts").collect()
    return accounts.filter(a => a.isActive)
  },
})

export const listByMainAccount = query({
  args: { mainAccountId: v.id("mainAccounts") },
  handler: async (ctx, { mainAccountId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_main_account", (q) => q.eq("mainAccountId", mainAccountId))
      .collect()
  },
})

export const listByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .collect()
  },
})

export const listByTill = query({
  args: { tillId: v.id("tills") },
  handler: async (ctx, { tillId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_till", (q) => q.eq("tillId", tillId))
      .collect()
  },
})

export const listForInvoiceDropdown = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const accounts = await ctx.db.query("ledgerAccounts").collect()
    return accounts.filter(a => a.isActive && a.displayInInvoice)
  },
})

export const get = query({
  args: { id: v.id("ledgerAccounts") },
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
    mainAccountId: v.id("mainAccounts"),
    currency: v.string(),
    branchId: v.optional(v.id("branches")),
    isBank: v.optional(v.boolean()),
    isCash: v.optional(v.boolean()),
    displayInInvoice: v.optional(v.boolean()),
    tillId: v.optional(v.id("tills")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_code", (q) => q.eq("accountCode", args.accountCode))
      .first()

    if (existing) {
      throw new Error(`Account code ${args.accountCode} already exists`)
    }

    const mainAccount = await ctx.db.get(args.mainAccountId)
    if (!mainAccount) {
      throw new Error("Main account not found")
    }

    const now = Date.now()
    return await ctx.db.insert("ledgerAccounts", {
      accountCode: args.accountCode,
      accountName: args.accountName,
      mainAccountId: args.mainAccountId,
      currency: args.currency,
      branchId: args.branchId,
      isBank: args.isBank,
      isCash: args.isCash,
      displayInInvoice: args.displayInInvoice,
      tillId: args.tillId,
      description: args.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("ledgerAccounts"),
    accountCode: v.string(),
    accountName: v.string(),
    mainAccountId: v.id("mainAccounts"),
    currency: v.string(),
    branchId: v.optional(v.id("branches")),
    isBank: v.optional(v.boolean()),
    isCash: v.optional(v.boolean()),
    displayInInvoice: v.optional(v.boolean()),
    tillId: v.optional(v.id("tills")),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error("Account not found")

    const duplicate = await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_code", (q) => q.eq("accountCode", args.accountCode))
      .first()

    if (duplicate && duplicate._id !== args.id) {
      throw new Error(`Account code ${args.accountCode} already exists`)
    }

    await ctx.db.patch(args.id, {
      accountCode: args.accountCode,
      accountName: args.accountName,
      mainAccountId: args.mainAccountId,
      currency: args.currency,
      branchId: args.branchId,
      isBank: args.isBank,
      isCash: args.isCash,
      displayInInvoice: args.displayInInvoice,
      tillId: args.tillId,
      description: args.description,
      isActive: args.isActive,
      updatedAt: Date.now(),
    })

    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id("ledgerAccounts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const journalLines = await ctx.db
      .query("journalEntryLines")
      .withIndex("by_account", (q) => q.eq("accountId", id))
      .first()

    if (journalLines) {
      throw new Error("Cannot delete account with journal entries")
    }

    await ctx.db.delete(id)
  },
})
