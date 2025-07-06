import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  currencies: defineTable({
    code: v.string(),
    name: v.string(),
    country: v.string(),
    flag: v.string(),
    symbol: v.string(),
    marketRate: v.number(),
    discountPercent: v.number(),
    markupPercent: v.number(),
    buyRate: v.number(),
    sellRate: v.number(),
    manualBuyRate: v.boolean(),
    manualSellRate: v.boolean(),
    lastUpdated: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"])
    .index("by_country", ["country"]),

  denominations: defineTable({
    currencyCode: v.string(),
    value: v.number(),
    isCoin: v.boolean(),
    imageId: v.optional(v.id("_storage")),
  })
    .index("by_currency", ["currencyCode"])
    .index("by_currency_and_value", ["currencyCode", "value"])
    .index("by_value", ["value"]),

  // Currency exchange transactions/orders
  transactions: defineTable({
    transactionId: v.string(),
    userId: v.string(), // Clerk user ID
    customerId: v.optional(v.string()), // Customer ID for walk-in customers
    
    // Transaction types
    type: v.union(
      v.literal("currency_buy"),    // Order type: Buy
      v.literal("currency_sell"),   // Order type: Sell
      v.literal("cash_in"),
      v.literal("cash_out"),
      v.literal("transfer"),
      v.literal("adjustment")
    ),
    
    // Currency exchange specific fields
    fromCurrency: v.string(),
    fromAmount: v.number(),
    toCurrency: v.string(),
    toAmount: v.number(),
    exchangeRate: v.number(),
    
    // Fee structure
    serviceFee: v.optional(v.number()),
    serviceFeeType: v.optional(v.union(v.literal("flat"), v.literal("percentage"))),
    
    // Payment and processing
    paymentMethod: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Customer information
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    
    // Compliance and notes
    requiresAML: v.boolean(),
    notes: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_transaction_id", ["transactionId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"])
    .index("by_customer", ["customerId"]),

  // Customer management system
  customers: defineTable({
    customerId: v.string(), // Auto-generated format: CUST-000001
    userId: v.string(), // Clerk user ID who created this customer
    
    // Customer type
    type: v.union(
      v.literal("individual"),
      v.literal("corporate")
    ),
    
    // Individual customer fields
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    occupation: v.optional(v.string()),
    
    // Corporate customer fields
    businessName: v.optional(v.string()),
    incorporationNumber: v.optional(v.string()),
    businessType: v.optional(v.string()),
    isMSB: v.optional(v.boolean()), // Money Service Business
    
    // Contact person for corporate customers
    contactPersonName: v.optional(v.string()),
    contactPersonTitle: v.optional(v.string()),
    contactPersonEmail: v.optional(v.string()),
    contactPersonPhone: v.optional(v.string()),
    
    // Common contact information
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    
    // Address information
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    
    // Status and compliance
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending"),
      v.literal("suspended"),
      v.literal("flagged")
    ),
    
    // Risk and AML
    riskLevel: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    
    amlStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("requires_review")
    ),
    
    sanctionsScreeningStatus: v.union(
      v.literal("pending"),
      v.literal("clear"),
      v.literal("match"),
      v.literal("needs_review")
    ),
    
    lastScreeningDate: v.optional(v.number()),
    
    // Metadata
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(), // Clerk user ID
    lastUpdatedBy: v.string(), // Clerk user ID
  })
    .index("by_customer_id", ["customerId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_risk_level", ["riskLevel"])
    .index("by_aml_status", ["amlStatus"])
    .index("by_user", ["userId"])
    .index("by_full_name", ["fullName"])
    .index("by_business_name", ["businessName"])
    .index("by_phone", ["phone"])
    .index("by_email", ["email"]),

  // Customer ID documents
  customerDocuments: defineTable({
    customerId: v.string(),
    documentType: v.string(), // Passport, Driver's License, etc.
    documentNumber: v.string(),
    issuingAuthority: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")), // File storage reference
    imageUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
      v.literal("expired")
    ),
    notes: v.optional(v.string()),
    uploadedAt: v.number(),
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.string()), // Clerk user ID
  })
    .index("by_customer", ["customerId"])
    .index("by_document_type", ["documentType"])
    .index("by_status", ["status"]),

  // AML screening history
  amlScreenings: defineTable({
    customerId: v.string(),
    screeningType: v.union(
      v.literal("sanctions"),
      v.literal("pep"), // Politically Exposed Person
      v.literal("adverse_media")
    ),
    screeningProvider: v.string(), // OFAC, UN, EU, etc.
    status: v.union(
      v.literal("clear"),
      v.literal("match"),
      v.literal("potential_match"),
      v.literal("error")
    ),
    confidence: v.optional(v.number()), // Match confidence 0-100
    matches: v.optional(v.array(v.any())), // Detailed match information
    screenshotUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    screenedAt: v.number(),
    screenedBy: v.string(), // Clerk user ID
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()), // Clerk user ID
    reviewNotes: v.optional(v.string()),
  })
    .index("by_customer", ["customerId"])
    .index("by_screening_type", ["screeningType"])
    .index("by_status", ["status"])
    .index("by_screened_at", ["screenedAt"]),

  // Risk assessments
  riskAssessments: defineTable({
    customerId: v.string(),
    riskLevel: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    riskScore: v.number(), // Calculated risk score
    factors: v.array(v.object({
      factor: v.string(),
      score: v.number(),
      weight: v.number(),
      description: v.string(),
    })),
    assessmentDate: v.number(),
    assessedBy: v.string(), // Clerk user ID
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_customer", ["customerId"])
    .index("by_risk_level", ["riskLevel"])
    .index("by_assessment_date", ["assessmentDate"]),

  // ID document types
  idTypes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    requiresExpiry: v.boolean(),
    country: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_active", ["isActive"])
    .index("by_country", ["country"]),

  // Settings for global configuration
  settings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    lastUpdated: v.number(),
    updatedBy: v.optional(v.string()), // Clerk user ID
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),
};

export default defineSchema({
  ...applicationTables,
});
