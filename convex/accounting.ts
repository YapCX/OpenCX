import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

function generateJournalEntryNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `JE-${year}${month}${day}-${random}`
}

export const getJournalEntries = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const entries = await ctx.db
      .query("journalEntries")
      .order("desc")
      .collect()

    let filtered = entries

    if (args.dateFrom) {
      filtered = filtered.filter((e) => e.entryDate >= args.dateFrom!)
    }

    if (args.dateTo) {
      filtered = filtered.filter((e) => e.entryDate <= args.dateTo!)
    }

    if (args.status) {
      filtered = filtered.filter((e) => e.status === args.status)
    }

    const limit = args.limit || 100
    return filtered.slice(0, limit)
  },
})

export const getJournalEntryWithLines = query({
  args: { id: v.id("journalEntries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const entry = await ctx.db.get(args.id)
    if (!entry) return null

    const lines = await ctx.db
      .query("journalEntryLines")
      .withIndex("by_entry", (q) => q.eq("journalEntryId", args.id))
      .collect()

    const linesWithAccounts = await Promise.all(
      lines.map(async (line) => {
        const account = await ctx.db.get(line.accountId)
        return { ...line, account }
      })
    )

    return { ...entry, lines: linesWithAccounts }
  },
})

export const createJournalEntry = mutation({
  args: {
    entryDate: v.number(),
    description: v.string(),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    lines: v.array(
      v.object({
        accountId: v.id("ledgerAccounts"),
        debit: v.number(),
        credit: v.number(),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const totalDebit = args.lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredit = args.lines.reduce((sum, l) => sum + l.credit, 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error("Journal entry must be balanced (debits = credits)")
    }

    const entryNumber = generateJournalEntryNumber()
    const now = Date.now()

    const entryId = await ctx.db.insert("journalEntries", {
      entryNumber,
      entryDate: args.entryDate,
      description: args.description,
      referenceType: args.referenceType,
      referenceId: args.referenceId,
      status: "posted",
      postedAt: now,
      postedBy: userId,
      createdAt: now,
      createdBy: userId,
    })

    for (const line of args.lines) {
      await ctx.db.insert("journalEntryLines", {
        journalEntryId: entryId,
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })
    }

    return { entryId, entryNumber }
  },
})

export const createJournalEntryFromTransaction = mutation({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const transaction = await ctx.db.get(args.transactionId)
    if (!transaction) throw new Error("Transaction not found")

    const existingEntry = await ctx.db
      .query("journalEntries")
      .filter((q) =>
        q.and(
          q.eq(q.field("referenceType"), "transaction"),
          q.eq(q.field("referenceId"), args.transactionId)
        )
      )
      .first()

    if (existingEntry) {
      return { entryId: existingEntry._id, entryNumber: existingEntry.entryNumber, alreadyExists: true }
    }

    const cashAccounts = await ctx.db
      .query("ledgerAccounts")
      .filter((q) => q.eq(q.field("isCash"), true))
      .collect()

    const sourceCashAccount = cashAccounts.find(
      (a) => a.currency === transaction.sourceCurrency
    )
    const targetCashAccount = cashAccounts.find(
      (a) => a.currency === transaction.targetCurrency
    )

    if (!sourceCashAccount || !targetCashAccount) {
      throw new Error("Cash accounts not found for transaction currencies. Please create cash accounts first.")
    }

    const revenueAccounts = await ctx.db
      .query("mainAccounts")
      .withIndex("by_type", (q) => q.eq("accountType", "revenue"))
      .first()

    let fxRevenueAccount = await ctx.db
      .query("ledgerAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("accountName"), "FX Revenue"),
          q.eq(q.field("currency"), "USD")
        )
      )
      .first()

    if (!fxRevenueAccount && revenueAccounts) {
      const fxRevenueId = await ctx.db.insert("ledgerAccounts", {
        accountCode: "4001",
        accountName: "FX Revenue",
        mainAccountId: revenueAccounts._id,
        currency: "USD",
        isBank: false,
        isCash: false,
        displayInInvoice: false,
        description: "Foreign exchange spread revenue",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      fxRevenueAccount = await ctx.db.get(fxRevenueId)
    }

    const entryNumber = generateJournalEntryNumber()
    const now = Date.now()

    const description =
      transaction.transactionType === "buy"
        ? `Buy ${transaction.targetAmount.toFixed(2)} ${transaction.targetCurrency} for ${transaction.sourceAmount.toFixed(2)} ${transaction.sourceCurrency}`
        : `Sell ${transaction.sourceAmount.toFixed(2)} ${transaction.sourceCurrency} for ${transaction.targetAmount.toFixed(2)} ${transaction.targetCurrency}`

    const entryId = await ctx.db.insert("journalEntries", {
      entryNumber,
      entryDate: transaction.createdAt,
      description,
      referenceType: "transaction",
      referenceId: args.transactionId,
      status: "posted",
      postedAt: now,
      postedBy: userId,
      createdAt: now,
      createdBy: userId,
    })

    if (transaction.transactionType === "buy") {
      await ctx.db.insert("journalEntryLines", {
        journalEntryId: entryId,
        accountId: targetCashAccount._id,
        debit: transaction.targetAmount,
        credit: 0,
        description: `Receive ${transaction.targetCurrency}`,
      })
      await ctx.db.insert("journalEntryLines", {
        journalEntryId: entryId,
        accountId: sourceCashAccount._id,
        debit: 0,
        credit: transaction.sourceAmount,
        description: `Pay ${transaction.sourceCurrency}`,
      })
    } else {
      await ctx.db.insert("journalEntryLines", {
        journalEntryId: entryId,
        accountId: sourceCashAccount._id,
        debit: transaction.sourceAmount,
        credit: 0,
        description: `Receive ${transaction.sourceCurrency}`,
      })
      await ctx.db.insert("journalEntryLines", {
        journalEntryId: entryId,
        accountId: targetCashAccount._id,
        debit: 0,
        credit: transaction.targetAmount,
        description: `Pay ${transaction.targetCurrency}`,
      })
    }

    return { entryId, entryNumber, alreadyExists: false }
  },
})

export const getDailyReconciliation = query({
  args: {
    date: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const startOfDay = new Date(args.date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(args.date)
    endOfDay.setHours(23, 59, 59, 999)

    const startTimestamp = startOfDay.getTime()
    const endTimestamp = endOfDay.getTime()

    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .collect()

    const dayTransactions = transactions.filter(
      (t) =>
        t.createdAt >= startTimestamp &&
        t.createdAt <= endTimestamp &&
        t.status === "completed" &&
        (!args.branchId || t.branchId === args.branchId)
    )

    const voidedTransactions = transactions.filter(
      (t) =>
        t.createdAt >= startTimestamp &&
        t.createdAt <= endTimestamp &&
        t.status === "voided" &&
        (!args.branchId || t.branchId === args.branchId)
    )

    const currencyBreakdown: Record<
      string,
      { bought: number; sold: number; buyCount: number; sellCount: number }
    > = {}

    for (const t of dayTransactions) {
      if (t.transactionType === "buy") {
        if (!currencyBreakdown[t.targetCurrency]) {
          currencyBreakdown[t.targetCurrency] = { bought: 0, sold: 0, buyCount: 0, sellCount: 0 }
        }
        currencyBreakdown[t.targetCurrency].bought += t.targetAmount
        currencyBreakdown[t.targetCurrency].buyCount++
      } else {
        if (!currencyBreakdown[t.sourceCurrency]) {
          currencyBreakdown[t.sourceCurrency] = { bought: 0, sold: 0, buyCount: 0, sellCount: 0 }
        }
        currencyBreakdown[t.sourceCurrency].sold += t.sourceAmount
        currencyBreakdown[t.sourceCurrency].sellCount++
      }
    }

    let inventory = null
    if (args.branchId) {
      const branchId = args.branchId
      const inventoryRecords = await ctx.db
        .query("currencyInventory")
        .withIndex("by_branch_currency", (q) => q.eq("branchId", branchId))
        .collect()

      inventory = inventoryRecords.reduce(
        (acc, r) => {
          acc[r.currencyCode] = r.balance
          return acc
        },
        {} as Record<string, number>
      )
    }

    const totalBuyAmount = dayTransactions
      .filter((t) => t.transactionType === "buy")
      .reduce((sum, t) => sum + t.totalAmount, 0)

    const totalSellAmount = dayTransactions
      .filter((t) => t.transactionType === "sell")
      .reduce((sum, t) => sum + t.totalAmount, 0)

    return {
      date: args.date,
      transactionCount: dayTransactions.length,
      voidedCount: voidedTransactions.length,
      totalBuyAmount,
      totalSellAmount,
      netAmount: totalBuyAmount - totalSellAmount,
      currencyBreakdown,
      currentInventory: inventory,
      transactions: dayTransactions.map((t) => ({
        _id: t._id,
        transactionNumber: t.transactionNumber,
        type: t.transactionType,
        sourceCurrency: t.sourceCurrency,
        targetCurrency: t.targetCurrency,
        sourceAmount: t.sourceAmount,
        targetAmount: t.targetAmount,
        totalAmount: t.totalAmount,
        createdAt: t.createdAt,
      })),
    }
  },
})

export const getProfitLossByCurrency = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const rates = await ctx.db.query("exchangeRates").order("desc").collect()

    const rateMap: Record<string, { buyRate: number; sellRate: number; midRate: number }> = {}
    for (const r of rates) {
      const key = `${r.baseCurrency}-${r.targetCurrency}`
      if (!rateMap[key]) {
        rateMap[key] = { buyRate: r.buyRate, sellRate: r.sellRate, midRate: r.midRate }
      }
    }

    const transactions = await ctx.db.query("transactions").collect()

    let filtered = transactions.filter((t) => t.status === "completed")

    if (args.dateFrom) {
      filtered = filtered.filter((t) => t.createdAt >= args.dateFrom!)
    }

    if (args.dateTo) {
      filtered = filtered.filter((t) => t.createdAt <= args.dateTo!)
    }

    if (args.branchId) {
      filtered = filtered.filter((t) => t.branchId === args.branchId)
    }

    const currencyPL: Record<
      string,
      {
        currency: string
        buyVolume: number
        sellVolume: number
        buyCount: number
        sellCount: number
        estimatedProfit: number
      }
    > = {}

    for (const t of filtered) {
      const currency = t.transactionType === "buy" ? t.targetCurrency : t.sourceCurrency

      if (!currencyPL[currency]) {
        currencyPL[currency] = {
          currency,
          buyVolume: 0,
          sellVolume: 0,
          buyCount: 0,
          sellCount: 0,
          estimatedProfit: 0,
        }
      }

      const rateKey = `USD-${currency}`
      const rate = rateMap[rateKey]

      if (t.transactionType === "buy") {
        currencyPL[currency].buyVolume += t.targetAmount
        currencyPL[currency].buyCount++
        if (rate) {
          const spread = (rate.midRate - t.exchangeRate) * t.targetAmount
          currencyPL[currency].estimatedProfit += spread
        }
      } else {
        currencyPL[currency].sellVolume += t.sourceAmount
        currencyPL[currency].sellCount++
        if (rate) {
          const spread = (t.exchangeRate - rate.midRate) * t.sourceAmount
          currencyPL[currency].estimatedProfit += spread
        }
      }
    }

    return Object.values(currencyPL).sort((a, b) => b.estimatedProfit - a.estimatedProfit)
  },
})

export const generateAllJournalEntries = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const transactions = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect()

    const existingEntries = await ctx.db.query("journalEntries").collect()
    const existingRefIds = new Set(
      existingEntries
        .filter((e) => e.referenceType === "transaction")
        .map((e) => e.referenceId)
    )

    const cashAccounts = await ctx.db
      .query("ledgerAccounts")
      .filter((q) => q.eq(q.field("isCash"), true))
      .collect()

    const cashAccountMap: Record<string, typeof cashAccounts[0]> = {}
    for (const account of cashAccounts) {
      cashAccountMap[account.currency] = account
    }

    let created = 0
    let skipped = 0

    for (const transaction of transactions) {
      if (existingRefIds.has(transaction._id)) {
        skipped++
        continue
      }

      const sourceCashAccount = cashAccountMap[transaction.sourceCurrency]
      const targetCashAccount = cashAccountMap[transaction.targetCurrency]

      if (!sourceCashAccount || !targetCashAccount) {
        skipped++
        continue
      }

      const entryNumber = generateJournalEntryNumber()
      const now = Date.now()

      const description =
        transaction.transactionType === "buy"
          ? `Buy ${transaction.targetAmount.toFixed(2)} ${transaction.targetCurrency} for ${transaction.sourceAmount.toFixed(2)} ${transaction.sourceCurrency}`
          : `Sell ${transaction.sourceAmount.toFixed(2)} ${transaction.sourceCurrency} for ${transaction.targetAmount.toFixed(2)} ${transaction.targetCurrency}`

      const entryId = await ctx.db.insert("journalEntries", {
        entryNumber,
        entryDate: transaction.createdAt,
        description,
        referenceType: "transaction",
        referenceId: transaction._id,
        status: "posted",
        postedAt: now,
        postedBy: userId,
        createdAt: now,
        createdBy: userId,
      })

      if (transaction.transactionType === "buy") {
        await ctx.db.insert("journalEntryLines", {
          journalEntryId: entryId,
          accountId: targetCashAccount._id,
          debit: transaction.targetAmount,
          credit: 0,
          description: `Receive ${transaction.targetCurrency}`,
        })
        await ctx.db.insert("journalEntryLines", {
          journalEntryId: entryId,
          accountId: sourceCashAccount._id,
          debit: 0,
          credit: transaction.sourceAmount,
          description: `Pay ${transaction.sourceCurrency}`,
        })
      } else {
        await ctx.db.insert("journalEntryLines", {
          journalEntryId: entryId,
          accountId: sourceCashAccount._id,
          debit: transaction.sourceAmount,
          credit: 0,
          description: `Receive ${transaction.sourceCurrency}`,
        })
        await ctx.db.insert("journalEntryLines", {
          journalEntryId: entryId,
          accountId: targetCashAccount._id,
          debit: 0,
          credit: transaction.targetAmount,
          description: `Pay ${transaction.targetCurrency}`,
        })
      }

      created++
    }

    return { created, skipped, total: transactions.length }
  },
})

export const getRateHistory = query({
  args: {
    baseCurrency: v.optional(v.string()),
    targetCurrency: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const rates = await ctx.db
      .query("exchangeRates")
      .order("desc")
      .collect()

    let filtered = rates

    if (args.baseCurrency) {
      filtered = filtered.filter((r) => r.baseCurrency === args.baseCurrency)
    }

    if (args.targetCurrency) {
      filtered = filtered.filter((r) => r.targetCurrency === args.targetCurrency)
    }

    const limit = args.limit || 100
    return filtered.slice(0, limit)
  },
})
