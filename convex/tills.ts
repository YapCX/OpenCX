import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const tills = await ctx.db.query("tills").collect()

    const branches = await ctx.db.query("branches").collect()
    const branchMap = new Map(branches.map(b => [b._id, b]))

    const users = await ctx.db.query("users").collect()
    const userMap = new Map(users.map(u => [u._id, u]))

    return tills.map(till => ({
      ...till,
      branch: till.branchId ? branchMap.get(till.branchId) : undefined,
      signedInUser: till.signedInUserId ? userMap.get(till.signedInUserId) : undefined,
    }))
  },
})

export const listByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db
      .query("tills")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .collect()
  },
})

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const tills = await ctx.db.query("tills").collect()
    return tills.filter(t => t.isActive)
  },
})

export const get = query({
  args: { id: v.id("tills") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db.get(id)
  },
})

export const create = mutation({
  args: {
    tillId: v.string(),
    name: v.string(),
    branchId: v.id("branches"),
    autoCreateCashAccounts: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("tills")
      .withIndex("by_tillId", (q) => q.eq("tillId", args.tillId))
      .first()

    if (existing) {
      throw new Error(`Till ID ${args.tillId} already exists`)
    }

    const branch = await ctx.db.get(args.branchId)
    if (!branch) {
      throw new Error("Branch not found")
    }

    const now = Date.now()
    return await ctx.db.insert("tills", {
      tillId: args.tillId,
      name: args.name,
      branchId: args.branchId,
      autoCreateCashAccounts: args.autoCreateCashAccounts,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("tills"),
    tillId: v.string(),
    name: v.string(),
    branchId: v.id("branches"),
    autoCreateCashAccounts: v.boolean(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error("Till not found")

    const duplicate = await ctx.db
      .query("tills")
      .withIndex("by_tillId", (q) => q.eq("tillId", args.tillId))
      .first()

    if (duplicate && duplicate._id !== args.id) {
      throw new Error(`Till ID ${args.tillId} already exists`)
    }

    await ctx.db.patch(args.id, {
      tillId: args.tillId,
      name: args.name,
      branchId: args.branchId,
      autoCreateCashAccounts: args.autoCreateCashAccounts,
      isActive: args.isActive,
      updatedAt: Date.now(),
    })

    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id("tills") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const accounts = await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_till", (q) => q.eq("tillId", id))
      .first()

    if (accounts) {
      throw new Error("Cannot delete till with linked cash accounts")
    }

    await ctx.db.delete(id)
  },
})

export const signIn = mutation({
  args: { id: v.id("tills") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const till = await ctx.db.get(id)
    if (!till) throw new Error("Till not found")

    if (till.signedInUserId) {
      throw new Error("Till is already signed in by another user")
    }

    await ctx.db.patch(id, {
      signedInUserId: userId,
      signedInAt: Date.now(),
      updatedAt: Date.now(),
    })

    return id
  },
})

export const signOut = mutation({
  args: { id: v.id("tills") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const till = await ctx.db.get(id)
    if (!till) throw new Error("Till not found")

    if (till.signedInUserId !== userId) {
      throw new Error("You are not signed into this till")
    }

    await ctx.db.patch(id, {
      signedInUserId: undefined,
      signedInAt: undefined,
      updatedAt: Date.now(),
    })

    return id
  },
})

export const createCashAccounts = mutation({
  args: { id: v.id("tills") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const till = await ctx.db.get(id)
    if (!till) throw new Error("Till not found")

    const currencies = await ctx.db.query("currencies").collect()
    const activeCurrencies = currencies.filter(c => c.isActive)

    const cashMainAccount = await ctx.db
      .query("mainAccounts")
      .filter((q) => q.eq(q.field("accountType"), "assets"))
      .first()

    if (!cashMainAccount) {
      throw new Error("No assets main account found. Please create main accounts first.")
    }

    const existingAccounts = await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_till", (q) => q.eq("tillId", id))
      .collect()

    const existingCurrencies = new Set(existingAccounts.map(a => a.currency))

    const now = Date.now()
    let created = 0

    for (const currency of activeCurrencies) {
      if (existingCurrencies.has(currency.code)) continue

      const accountCode = `${till.tillId}-${currency.code}`
      const accountName = `${till.name} - ${currency.code} Cash`

      await ctx.db.insert("ledgerAccounts", {
        accountCode,
        accountName,
        mainAccountId: cashMainAccount._id,
        currency: currency.code,
        branchId: till.branchId,
        isBank: false,
        isCash: true,
        displayInInvoice: true,
        tillId: id,
        description: `Cash account for ${till.name} in ${currency.code}`,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      created++
    }

    return { message: `Created ${created} cash accounts for ${till.name}` }
  },
})
