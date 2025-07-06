import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

function generateCustomerId(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CUST-${timestamp.slice(-6)}${random}`;
}

// Customer CRUD operations
export const list = query({
  args: {
    searchTerm: v.optional(v.string()),
    type: v.optional(v.union(v.literal("individual"), v.literal("corporate"))),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending"),
      v.literal("suspended"),
      v.literal("flagged")
    )),
    riskLevel: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    let customers;

    // Apply filters using proper conditional logic
    if (args.type !== undefined) {
      const type = args.type; // Type narrowing
      customers = await ctx.db
        .query("customers")
        .withIndex("by_type", (q) => q.eq("type", type))
        .order("desc")
        .take(args.limit || 100);
    } else if (args.status !== undefined) {
      const status = args.status; // Type narrowing
      customers = await ctx.db
        .query("customers")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(args.limit || 100);
    } else if (args.riskLevel !== undefined) {
      const riskLevel = args.riskLevel; // Type narrowing
      customers = await ctx.db
        .query("customers")
        .withIndex("by_risk_level", (q) => q.eq("riskLevel", riskLevel))
        .order("desc")
        .take(args.limit || 100);
    } else {
      customers = await ctx.db
        .query("customers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(args.limit || 100);
    }

    // Apply search filter if provided
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      customers = customers.filter((customer) =>
        customer.customerId?.toLowerCase().includes(searchLower) ||
        customer.fullName?.toLowerCase().includes(searchLower) ||
        customer.businessName?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchLower)
      );
    }

    return customers;
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const customer = await ctx.db.get(args.id);

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Get customer documents
    const documents = await ctx.db
      .query("customerDocuments")
      .withIndex("by_customer", (q) => q.eq("customerId", customer.customerId))
      .collect();

    // Generate image URLs for documents
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        if (doc.imageId) {
          const imageUrl = await ctx.storage.getUrl(doc.imageId);
          return { ...doc, imageUrl };
        }
        return doc;
      })
    );

    return {
      ...customer,
      documents: documentsWithUrls,
    };
  },
});

export const getByCustomerId = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId))
      .first();

    if (!customer) {
      throw new Error("Customer not found");
    }

    return customer;
  },
});

export const create = mutation({
  args: {
    type: v.union(v.literal("individual"), v.literal("corporate")),

    // Individual fields
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    occupation: v.optional(v.string()),

    // Corporate fields
    businessName: v.optional(v.string()),
    incorporationNumber: v.optional(v.string()),
    businessType: v.optional(v.string()),
    isMSB: v.optional(v.boolean()),

    // Contact person for corporate
    contactPersonName: v.optional(v.string()),
    contactPersonTitle: v.optional(v.string()),
    contactPersonEmail: v.optional(v.string()),
    contactPersonPhone: v.optional(v.string()),

    // Common fields
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    // Generate unique customer ID with retry logic
    let customerId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      customerId = generateCustomerId();
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_customer_id", (q) => q.eq("customerId", customerId))
        .first();

      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique customer ID");
    }

    // Create full name for individual customers
    let fullName: string | undefined;
    if (args.type === "individual" && args.firstName && args.lastName) {
      fullName = `${args.firstName} ${args.lastName}`;
    }

    const customer = {
      customerId,
      userId,
      type: args.type,
      firstName: args.firstName,
      lastName: args.lastName,
      fullName,
      dateOfBirth: args.dateOfBirth,
      occupation: args.occupation,
      businessName: args.businessName,
      incorporationNumber: args.incorporationNumber,
      businessType: args.businessType,
      isMSB: args.isMSB || false,
      contactPersonName: args.contactPersonName,
      contactPersonTitle: args.contactPersonTitle,
      contactPersonEmail: args.contactPersonEmail,
      contactPersonPhone: args.contactPersonPhone,
      email: args.email,
      phone: args.phone,
      address: args.address,
      city: args.city,
      province: args.province,
      postalCode: args.postalCode,
      country: args.country,
      status: "pending" as const,
      riskLevel: "low" as const, // Default to low risk
      amlStatus: "pending" as const,
      sanctionsScreeningStatus: "pending" as const,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      lastUpdatedBy: userId,
    };

    const id = await ctx.db.insert("customers", customer);

    // Trigger AML screening
    try {
      await ctx.scheduler.runAfter(0, api.customers.triggerAMLScreening, {
        customerId: customer.customerId,
      });
    } catch (error) {
      console.warn("Failed to trigger AML screening:", error);
    }

    return { id, customerId: customer.customerId };
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    occupation: v.optional(v.string()),
    businessName: v.optional(v.string()),
    incorporationNumber: v.optional(v.string()),
    businessType: v.optional(v.string()),
    isMSB: v.optional(v.boolean()),
    contactPersonName: v.optional(v.string()),
    contactPersonTitle: v.optional(v.string()),
    contactPersonEmail: v.optional(v.string()),
    contactPersonPhone: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const { id, ...updates } = args;

    const customer = await ctx.db.get(id);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Update full name if individual customer
    let fullName: string | undefined = customer.fullName;
    if (customer.type === "individual" && (updates.firstName || updates.lastName)) {
      const firstName = updates.firstName || customer.firstName;
      const lastName = updates.lastName || customer.lastName;
      if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      fullName,
      updatedAt: Date.now(),
      lastUpdatedBy: userId,
    });

    return { success: true };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("customers"),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending"),
      v.literal("suspended"),
      v.literal("flagged")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const customer = await ctx.db.get(args.id);

    if (!customer) {
      throw new Error("Customer not found");
    }

    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
      lastUpdatedBy: userId,
    };

    if (args.notes) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const customer = await ctx.db.get(args.id);

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check if customer has any transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_customer", (q) => q.eq("customerId", customer.customerId))
      .first();

    if (transactions) {
      throw new Error("Cannot delete customer with existing transactions");
    }

    // Delete related documents
    const documents = await ctx.db
      .query("customerDocuments")
      .withIndex("by_customer", (q) => q.eq("customerId", customer.customerId))
      .collect();

    for (const doc of documents) {
      await ctx.db.delete(doc._id);
      if (doc.imageId) {
        await ctx.storage.delete(doc.imageId);
      }
    }

    // Delete AML screenings
    const screenings = await ctx.db
      .query("amlScreenings")
      .withIndex("by_customer", (q) => q.eq("customerId", customer.customerId))
      .collect();

    for (const screening of screenings) {
      await ctx.db.delete(screening._id);
    }

    // Delete risk assessments
    const assessments = await ctx.db
      .query("riskAssessments")
      .withIndex("by_customer", (q) => q.eq("customerId", customer.customerId))
      .collect();

    for (const assessment of assessments) {
      await ctx.db.delete(assessment._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const stats = {
      total: customers.length,
      individual: customers.filter(c => c.type === "individual").length,
      corporate: customers.filter(c => c.type === "corporate").length,
      active: customers.filter(c => c.status === "active").length,
      pending: customers.filter(c => c.status === "pending").length,
      verified: customers.filter(c => c.amlStatus === "approved").length,
      pendingVerification: customers.filter(c => c.amlStatus === "pending").length,
      suspended: customers.filter(c => c.status === "suspended").length,
      flagged: customers.filter(c => c.status === "flagged").length,
      lowRisk: customers.filter(c => c.riskLevel === "low").length,
      mediumRisk: customers.filter(c => c.riskLevel === "medium").length,
      highRisk: customers.filter(c => c.riskLevel === "high").length,
    };

    return stats;
  },
});

// Document management
export const uploadDocument = mutation({
  args: {
    customerId: v.string(),
    documentType: v.string(),
    documentNumber: v.string(),
    issuingAuthority: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const document = {
      customerId: args.customerId,
      documentType: args.documentType,
      documentNumber: args.documentNumber,
      issuingAuthority: args.issuingAuthority,
      issueDate: args.issueDate,
      expiryDate: args.expiryDate,
      imageId: args.imageId,
      status: "pending" as const,
      notes: args.notes,
      uploadedAt: Date.now(),
    };

    const id = await ctx.db.insert("customerDocuments", document);
    return { id };
  },
});

export const getDocuments = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const documents = await ctx.db
      .query("customerDocuments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();

    // Generate image URLs
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        if (doc.imageId) {
          const imageUrl = await ctx.storage.getUrl(doc.imageId);
          return { ...doc, imageUrl };
        }
        return doc;
      })
    );

    return documentsWithUrls;
  },
});

// AML screening trigger (simplified version)
export const triggerAMLScreening = action({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // This is a simplified version - in production, this would integrate with
    // actual AML screening services like OFAC, UN sanctions lists, etc.
    const screening = {
      customerId: args.customerId,
      screeningType: "sanctions" as const,
      screeningProvider: "OFAC",
      status: "clear" as const, // For demo purposes
      confidence: 95,
      matches: [],
      screenedAt: Date.now(),
      screenedBy: userId,
    };

    await ctx.runMutation(api.customers.recordAMLScreening, screening);

    return { success: true, status: "clear" };
  },
});

export const recordAMLScreening = mutation({
  args: {
    customerId: v.string(),
    screeningType: v.union(
      v.literal("sanctions"),
      v.literal("pep"),
      v.literal("adverse_media")
    ),
    screeningProvider: v.string(),
    status: v.union(
      v.literal("clear"),
      v.literal("match"),
      v.literal("potential_match"),
      v.literal("error")
    ),
    confidence: v.optional(v.number()),
    matches: v.optional(v.array(v.any())),
    screenedAt: v.number(),
    screenedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("amlScreenings", args);

    // Update customer's screening status
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId))
      .first();

    if (customer) {
      await ctx.db.patch(customer._id, {
        sanctionsScreeningStatus: args.status === "clear" ? "clear" : "needs_review",
        lastScreeningDate: args.screenedAt,
        updatedAt: Date.now(),
        lastUpdatedBy: args.screenedBy,
      });
    }

    return { id };
  },
});