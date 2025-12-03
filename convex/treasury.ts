import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const getInventory = query({
  args: {
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    let inventory
    if (args.branchId) {
      inventory = await ctx.db
        .query("currencyInventory")
        .withIndex("by_branch_currency", (q) => q.eq("branchId", args.branchId!))
        .collect()
    } else {
      inventory = await ctx.db.query("currencyInventory").collect()
    }

    const currencies = await ctx.db.query("currencies").collect()
    const branches = await ctx.db.query("branches").collect()

    return inventory.map((inv) => {
      const currency = currencies.find((c) => c.code === inv.currencyCode)
      const branch = branches.find((b) => b._id === inv.branchId)
      return {
        ...inv,
        currencyName: currency?.name || inv.currencyCode,
        currencySymbol: currency?.symbol || "",
        branchName: branch?.name || "Unknown",
        isLow: inv.lowThreshold ? inv.balance <= inv.lowThreshold : false,
        isHigh: inv.highThreshold ? inv.balance >= inv.highThreshold : false,
      }
    })
  },
})

export const getInventoryByCurrency = query({
  args: {
    branchId: v.id("branches"),
    currencyCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db
      .query("currencyInventory")
      .withIndex("by_branch_currency", (q) =>
        q.eq("branchId", args.branchId).eq("currencyCode", args.currencyCode)
      )
      .first()
  },
})

export const getMovements = query({
  args: {
    branchId: v.optional(v.id("branches")),
    currencyCode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    let movementsQuery = ctx.db.query("inventoryMovements").order("desc")

    const allMovements = await movementsQuery.collect()

    let filtered = allMovements
    if (args.branchId) {
      filtered = filtered.filter((m) => m.branchId === args.branchId)
    }
    if (args.currencyCode) {
      filtered = filtered.filter((m) => m.currencyCode === args.currencyCode)
    }

    const limited = args.limit ? filtered.slice(0, args.limit) : filtered

    const users = await ctx.db.query("users").collect()
    const branches = await ctx.db.query("branches").collect()

    return limited.map((mov) => {
      const user = users.find((u) => u._id === mov.createdBy)
      const branch = branches.find((b) => b._id === mov.branchId)
      return {
        ...mov,
        createdByName: user?.email || "Unknown",
        branchName: branch?.name || "Unknown",
      }
    })
  },
})

export const adjustInventory = mutation({
  args: {
    branchId: v.id("branches"),
    currencyCode: v.string(),
    adjustmentAmount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("currencyInventory")
      .withIndex("by_branch_currency", (q) =>
        q.eq("branchId", args.branchId).eq("currencyCode", args.currencyCode)
      )
      .first()

    const balanceBefore = existing?.balance || 0
    const balanceAfter = balanceBefore + args.adjustmentAmount

    if (balanceAfter < 0) {
      throw new Error("Adjustment would result in negative balance")
    }

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: balanceAfter,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("currencyInventory", {
        branchId: args.branchId,
        currencyCode: args.currencyCode,
        balance: balanceAfter,
        updatedAt: now,
      })
    }

    await ctx.db.insert("inventoryMovements", {
      branchId: args.branchId,
      currencyCode: args.currencyCode,
      movementType: "adjustment",
      amount: args.adjustmentAmount,
      balanceBefore,
      balanceAfter,
      notes: args.notes,
      createdAt: now,
      createdBy: userId,
    })

    return { success: true, newBalance: balanceAfter }
  },
})

export const setThresholds = mutation({
  args: {
    branchId: v.id("branches"),
    currencyCode: v.string(),
    lowThreshold: v.optional(v.number()),
    highThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("currencyInventory")
      .withIndex("by_branch_currency", (q) =>
        q.eq("branchId", args.branchId).eq("currencyCode", args.currencyCode)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        lowThreshold: args.lowThreshold,
        highThreshold: args.highThreshold,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert("currencyInventory", {
        branchId: args.branchId,
        currencyCode: args.currencyCode,
        balance: 0,
        lowThreshold: args.lowThreshold,
        highThreshold: args.highThreshold,
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

export const recordWholesaleBuy = mutation({
  args: {
    branchId: v.id("branches"),
    currencyCode: v.string(),
    amount: v.number(),
    supplier: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("currencyInventory")
      .withIndex("by_branch_currency", (q) =>
        q.eq("branchId", args.branchId).eq("currencyCode", args.currencyCode)
      )
      .first()

    const balanceBefore = existing?.balance || 0
    const balanceAfter = balanceBefore + args.amount

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: balanceAfter,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("currencyInventory", {
        branchId: args.branchId,
        currencyCode: args.currencyCode,
        balance: balanceAfter,
        updatedAt: now,
      })
    }

    await ctx.db.insert("inventoryMovements", {
      branchId: args.branchId,
      currencyCode: args.currencyCode,
      movementType: "wholesale_buy",
      amount: args.amount,
      balanceBefore,
      balanceAfter,
      notes: args.supplier ? `Supplier: ${args.supplier}. ${args.notes || ""}` : args.notes,
      createdAt: now,
      createdBy: userId,
    })

    return { success: true, newBalance: balanceAfter }
  },
})

export const recordWholesaleSell = mutation({
  args: {
    branchId: v.id("branches"),
    currencyCode: v.string(),
    amount: v.number(),
    buyer: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const existing = await ctx.db
      .query("currencyInventory")
      .withIndex("by_branch_currency", (q) =>
        q.eq("branchId", args.branchId).eq("currencyCode", args.currencyCode)
      )
      .first()

    const balanceBefore = existing?.balance || 0
    const balanceAfter = balanceBefore - args.amount

    if (balanceAfter < 0) {
      throw new Error("Insufficient inventory for wholesale sell")
    }

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: balanceAfter,
        updatedAt: now,
      })
    } else {
      throw new Error("No inventory exists for this currency")
    }

    await ctx.db.insert("inventoryMovements", {
      branchId: args.branchId,
      currencyCode: args.currencyCode,
      movementType: "wholesale_sell",
      amount: -args.amount,
      balanceBefore,
      balanceAfter,
      notes: args.buyer ? `Buyer: ${args.buyer}. ${args.notes || ""}` : args.notes,
      createdAt: now,
      createdBy: userId,
    })

    return { success: true, newBalance: balanceAfter }
  },
})

export const getLowInventoryAlerts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const inventory = await ctx.db.query("currencyInventory").collect()
    const currencies = await ctx.db.query("currencies").collect()
    const branches = await ctx.db.query("branches").collect()

    return inventory
      .filter((inv) => inv.lowThreshold && inv.balance <= inv.lowThreshold)
      .map((inv) => {
        const currency = currencies.find((c) => c.code === inv.currencyCode)
        const branch = branches.find((b) => b._id === inv.branchId)
        return {
          ...inv,
          currencyName: currency?.name || inv.currencyCode,
          branchName: branch?.name || "Unknown",
          shortfall: (inv.lowThreshold || 0) - inv.balance,
        }
      })
  },
})

export const initializeInventory = mutation({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const currencies = await ctx.db
      .query("currencies")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()

    const now = Date.now()
    let created = 0

    for (const currency of currencies) {
      const existing = await ctx.db
        .query("currencyInventory")
        .withIndex("by_branch_currency", (q) =>
          q.eq("branchId", args.branchId).eq("currencyCode", currency.code)
        )
        .first()

      if (!existing) {
        await ctx.db.insert("currencyInventory", {
          branchId: args.branchId,
          currencyCode: currency.code,
          balance: 0,
          lowThreshold: 1000,
          highThreshold: 100000,
          updatedAt: now,
        })
        created++
      }
    }

    return { success: true, created }
  },
})
