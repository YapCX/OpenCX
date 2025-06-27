import { query, mutation, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

export const list = query({
  args: {
    searchTerm: v.optional(v.string()),
    customerType: v.optional(v.union(v.literal("individual"), v.literal("corporate"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const limit = args.limit || 50; // Default limit to prevent large queries
    let customers;
    
    if (args.customerType) {
      customers = await ctx.db
        .query("customers")
        .withIndex("by_customer_type", q => q.eq("customerType", args.customerType!))
        .order("desc")
        .take(limit);
    } else {
      customers = await ctx.db
        .query("customers")
        .order("desc")
        .take(limit);
    }
    

    
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      return customers.filter(customer => {
        const searchableFields = [
          customer.customerId,
          customer.fullName,
          customer.legalBusinessName,
          customer.phoneNumber,
          customer.businessPhone,
          customer.occupation,
          customer.typeOfBusiness,
        ];
        
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return customers;
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const customer = await ctx.db.get(args.id);
    if (!customer) return null;
    
    // Only get image URLs if there are documents to process
    if (!customer.idDocuments || customer.idDocuments.length === 0) {
      return customer;
    }
    
    // Get image URLs for ID documents
    const idDocumentsWithUrls = await Promise.all(
      customer.idDocuments.map(async (doc) => ({
        ...doc,
        imageUrl: doc.imageId ? await ctx.storage.getUrl(doc.imageId) : null,
      }))
    );
    
    return {
      ...customer,
      idDocuments: idDocumentsWithUrls,
    };
  },
});

export const getNextCustomerId = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    
    const lastCustomer = await ctx.db
      .query("customers")
      .withIndex("by_creation_time")
      .order("desc")
      .first();
    
    if (!lastCustomer) {
      return "CUST-000001";
    }
    
    const lastId = lastCustomer.customerId;
    const numericPart = parseInt(lastId.split("-")[1]);
    const nextNumber = numericPart + 1;
    
    return `CUST-${nextNumber.toString().padStart(6, "0")}`;
  },
});

export const create = mutation({
  args: {
    customerType: v.union(v.literal("individual"), v.literal("corporate")),
    
    // Individual fields
    fullName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    fullAddress: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    occupation: v.optional(v.string()),
    
    // Corporate fields
    legalBusinessName: v.optional(v.string()),
    typeOfBusiness: v.optional(v.string()),
    incorporationNumber: v.optional(v.string()),
    businessAddress: v.optional(v.string()),
    businessPhone: v.optional(v.string()),
    isWholesalerOrBank: v.optional(v.boolean()),
    isMSB: v.optional(v.boolean()),
    msbRegistrationNumber: v.optional(v.string()),
    msbExpirationDate: v.optional(v.string()),
    
    // Contact person (for corporate)
    contactPersonName: v.optional(v.string()),
    contactPersonTitle: v.optional(v.string()),
    contactPersonEmail: v.optional(v.string()),
    contactPersonPhone: v.optional(v.string()),
    
    // Common fields
    status: v.string(),
    idDocuments: v.array(v.object({
      idNumber: v.string(),
      idType: v.string(),
      expirationDate: v.string(),
      issuingAuthority: v.string(),
      imageId: v.id("_storage"),
      originalFileName: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Generate customer ID with retry logic to prevent race conditions
    let nextId: string;
    let attempts = 0;
    const maxAttempts = 5;
    
    do {
      const lastCustomer = await ctx.db
        .query("customers")
        .withIndex("by_creation_time")
        .order("desc")
        .first();
        
      if (!lastCustomer) {
        nextId = "CUST-000001";
      } else {
        const lastId = lastCustomer.customerId;
        const numericPart = parseInt(lastId.split("-")[1]);
        const nextNumber = numericPart + 1;
        nextId = `CUST-${nextNumber.toString().padStart(6, "0")}`;
      }
      
      // Check if this ID already exists
      const existingCustomer = await ctx.db
        .query("customers")
        .withIndex("by_customer_id", (q) => q.eq("customerId", nextId))
        .first();
        
      if (!existingCustomer) {
        break; // ID is unique, we can use it
      }
      
      attempts++;
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique customer ID after multiple attempts");
    }
    
    const customerId = await ctx.db.insert("customers", {
      customerId: nextId,
      customerType: args.customerType,
      
      // Individual fields
      fullName: args.fullName,
      dateOfBirth: args.dateOfBirth,
      fullAddress: args.fullAddress,
      phoneNumber: args.phoneNumber,
      occupation: args.occupation,
      
      // Corporate fields
      legalBusinessName: args.legalBusinessName,
      typeOfBusiness: args.typeOfBusiness,
      incorporationNumber: args.incorporationNumber,
      businessAddress: args.businessAddress,
      businessPhone: args.businessPhone,
      isWholesalerOrBank: args.isWholesalerOrBank || false,
      isMSB: args.isMSB || false,
      msbRegistrationNumber: args.msbRegistrationNumber,
      msbExpirationDate: args.msbExpirationDate,
      
      // Contact person
      contactPersonName: args.contactPersonName,
      contactPersonTitle: args.contactPersonTitle,
      contactPersonEmail: args.contactPersonEmail,
      contactPersonPhone: args.contactPersonPhone,
      
      // Common fields
      status: args.status,
      idDocuments: args.idDocuments,
      
      // AML fields
      riskLevel: "low",
      amlStatus: "clear",
      sanctionsScreeningStatus: "pending",
      
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      createdBy: userId,
    });

    // Only trigger screening if enabled - make it async
    const customerName = args.customerType === "individual" 
      ? args.fullName || ""
      : args.legalBusinessName || "";

    if (customerName) {
      // Schedule screening to run after 1 second to avoid blocking the response
      await ctx.scheduler.runAfter(1000, internal.customers.performAutomaticScreening, {
        customerId,
        customerName,
      });
    }

    return customerId;
  },
});

export const performAutomaticScreening = internalAction({
  args: {
    customerId: v.id("customers"),
    customerName: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if AML module exists before calling
      const result = await ctx.runAction(internal.aml.performSanctionScreening, {
        customerId: args.customerId,
        customerName: args.customerName,
        screeningType: "automatic",
      }).catch(() => {
        // If AML screening fails, just mark as error and continue
        return { success: false, matchesFound: 0 };
      });

      // Update screening status based on result
      if (result.success) {
        const status = result.matchesFound > 0 ? "flagged" : "clear";
        await ctx.runMutation(internal.customers.updateScreeningStatus, {
          customerId: args.customerId,
          status,
        });
      } else {
        await ctx.runMutation(internal.customers.updateScreeningStatus, {
          customerId: args.customerId,
          status: "error",
        });
      }
    } catch (error) {
      console.error("Automatic screening failed:", error);
      await ctx.runMutation(internal.customers.updateScreeningStatus, {
        customerId: args.customerId,
        status: "error",
      });
    }
  },
});

export const updateScreeningStatus = internalMutation({
  args: {
    customerId: v.id("customers"),
    status: v.union(v.literal("pending"), v.literal("clear"), v.literal("flagged"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.customerId, {
      sanctionsScreeningStatus: args.status,
      lastUpdated: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    customerType: v.union(v.literal("individual"), v.literal("corporate")),
    
    // Individual fields
    fullName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    fullAddress: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    occupation: v.optional(v.string()),
    
    // Corporate fields
    legalBusinessName: v.optional(v.string()),
    typeOfBusiness: v.optional(v.string()),
    incorporationNumber: v.optional(v.string()),
    businessAddress: v.optional(v.string()),
    businessPhone: v.optional(v.string()),
    isWholesalerOrBank: v.optional(v.boolean()),
    isMSB: v.optional(v.boolean()),
    msbRegistrationNumber: v.optional(v.string()),
    msbExpirationDate: v.optional(v.string()),
    
    // Contact person (for corporate)
    contactPersonName: v.optional(v.string()),
    contactPersonTitle: v.optional(v.string()),
    contactPersonEmail: v.optional(v.string()),
    contactPersonPhone: v.optional(v.string()),
    
    // Common fields
    status: v.string(),
    idDocuments: v.array(v.object({
      idNumber: v.string(),
      idType: v.string(),
      expirationDate: v.string(),
      issuingAuthority: v.string(),
      imageId: v.id("_storage"),
      originalFileName: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const { id, ...updateData } = args;
    
    await ctx.db.patch(id, {
      ...updateData,
      lastUpdated: Date.now(),
    });
    
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const manualSanctionsScreening = action({
  args: {
    customerId: v.id("customers"),
    customerName: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; matchesFound?: number; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    
    try {
      const result: { success: boolean; matchesFound: number } = await ctx.runAction(internal.aml.performSanctionScreening, {
        customerId: args.customerId,
        customerName: args.customerName,
        screeningType: "manual",
        performedBy: userId || undefined,
      });

      if (result.success) {
        const status = result.matchesFound > 0 ? "flagged" : "clear";
        await ctx.runMutation(internal.customers.updateScreeningStatus, {
          customerId: args.customerId,
          status,
        });
      }

      return result;
    } catch (error) {
      console.error("Manual screening failed:", error);
      return { success: false, error: "Screening service unavailable" };
    }
  },
});
