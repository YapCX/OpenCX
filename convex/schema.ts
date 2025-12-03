import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

export default defineSchema({
  ...authTables,

  // User profiles with additional business data
  userProfiles: defineTable({
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    role: v.string(), // admin, manager, teller, compliance
    branchId: v.optional(v.id("branches")),
    userAlias: v.optional(v.string()),
    userPin: v.optional(v.string()),
    transactionLimitPerDay: v.optional(v.number()),
    enable2FA: v.optional(v.boolean()),
    isVerified: v.optional(v.boolean()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_branch", ["branchId"]),

  // Branches for multi-branch support
  branches: defineTable({
    name: v.string(),
    code: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"]),

  // Customers with KYC data
  customers: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    idType: v.optional(v.string()), // passport, driver_license, national_id
    idNumber: v.optional(v.string()),
    idExpiryDate: v.optional(v.string()),
    nationality: v.optional(v.string()),
    occupation: v.optional(v.string()),
    kycStatus: v.string(), // pending, verified, rejected
    sanctionScreeningStatus: v.optional(v.string()), // clear, flagged, pending
    sanctionScreeningDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_name", ["lastName", "firstName"])
    .searchIndex("search_customers", {
      searchField: "lastName",
      filterFields: ["kycStatus"],
    }),

  // Customer documents for KYC
  customerDocuments: defineTable({
    customerId: v.id("customers"),
    documentType: v.string(), // id_front, id_back, proof_of_address, etc.
    fileName: v.string(),
    storageId: v.id("_storage"),
    uploadedAt: v.number(),
    uploadedBy: v.id("users"),
  })
    .index("by_customer", ["customerId"]),

  // Currencies
  currencies: defineTable({
    code: v.string(), // USD, EUR, GBP, etc.
    name: v.string(),
    symbol: v.string(),
    decimalPlaces: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"]),

  // Exchange rates
  exchangeRates: defineTable({
    baseCurrency: v.string(),
    targetCurrency: v.string(),
    buyRate: v.number(),
    sellRate: v.number(),
    midRate: v.number(),
    spread: v.number(),
    source: v.string(), // manual, api
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_currencies", ["baseCurrency", "targetCurrency"])
    .index("by_effective_date", ["effectiveFrom"]),

  // Transactions
  transactions: defineTable({
    transactionNumber: v.string(),
    transactionType: v.string(), // buy, sell
    customerId: v.optional(v.id("customers")),
    branchId: v.id("branches"),
    sourceCurrency: v.string(),
    targetCurrency: v.string(),
    sourceAmount: v.number(),
    targetAmount: v.number(),
    exchangeRate: v.number(),
    commission: v.optional(v.number()),
    totalAmount: v.number(),
    status: v.string(), // pending, completed, voided
    voidReason: v.optional(v.string()),
    voidedAt: v.optional(v.number()),
    voidedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_number", ["transactionNumber"])
    .index("by_customer", ["customerId"])
    .index("by_branch", ["branchId"])
    .index("by_date", ["createdAt"])
    .index("by_status", ["status"]),

  // Currency inventory
  currencyInventory: defineTable({
    branchId: v.id("branches"),
    currencyCode: v.string(),
    balance: v.number(),
    lowThreshold: v.optional(v.number()),
    highThreshold: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_branch_currency", ["branchId", "currencyCode"]),

  // Inventory movements
  inventoryMovements: defineTable({
    branchId: v.id("branches"),
    currencyCode: v.string(),
    movementType: v.string(), // transaction, adjustment, wholesale_buy, wholesale_sell, transfer
    amount: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_branch_currency", ["branchId", "currencyCode"])
    .index("by_date", ["createdAt"]),

  // Compliance alerts
  complianceAlerts: defineTable({
    alertType: v.string(), // threshold_exceeded, sanction_match, suspicious_activity
    severity: v.string(), // low, medium, high, critical
    customerId: v.optional(v.id("customers")),
    transactionId: v.optional(v.id("transactions")),
    description: v.string(),
    status: v.string(), // pending, reviewed, resolved, escalated
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    resolutionNotes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"])
    .index("by_severity", ["severity"]),

  // Audit log
  auditLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_date", ["createdAt"]),

  // General ledger accounts
  ledgerAccounts: defineTable({
    accountCode: v.string(),
    accountName: v.string(),
    accountType: v.string(), // asset, liability, equity, revenue, expense
    parentAccountId: v.optional(v.id("ledgerAccounts")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["accountCode"])
    .index("by_type", ["accountType"]),

  // Journal entries
  journalEntries: defineTable({
    entryNumber: v.string(),
    entryDate: v.number(),
    description: v.string(),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    status: v.string(), // draft, posted
    postedAt: v.optional(v.number()),
    postedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_number", ["entryNumber"])
    .index("by_date", ["entryDate"]),

  // Journal entry lines
  journalEntryLines: defineTable({
    journalEntryId: v.id("journalEntries"),
    accountId: v.id("ledgerAccounts"),
    debit: v.number(),
    credit: v.number(),
    description: v.optional(v.string()),
  })
    .index("by_entry", ["journalEntryId"])
    .index("by_account", ["accountId"]),

  // System settings
  systemSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"]),

  // Lookup data for dynamic dropdowns (Customer Groups, Payment Methods, Sources of Funds, etc.)
  lookups: defineTable({
    lookupKey: v.string(), // e.g., 'customer_group', 'payment_method', 'source_of_funds', 'id_type'
    lookupValue: v.string(),
    displayOrder: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["lookupKey"])
    .index("by_key_value", ["lookupKey", "lookupValue"]),
})
