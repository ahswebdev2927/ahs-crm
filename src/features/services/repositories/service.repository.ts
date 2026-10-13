import { db } from "@/db";
import { eq, and, or, like, sql, desc, asc, count, max, SQL } from "drizzle-orm";
import { services, customerServices, customers, users } from "@/db/schema";
import type {
  CatalogServiceItem,
  CustomerServiceSubscriptionItem,
  ServiceKpis,
  SyncCatalogItemInput,
  SyncResult,
  BillingModel,
  ServiceStatus,
  CustomerServiceStatus,
} from "../types/service.types";
import type {
  CatalogServiceInput,
  UpdateCatalogServiceInput,
  ServiceQueryInput,
} from "../schemas/service.schema";

const parseJsonArray = (val: string | null | undefined): string[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mapServiceRow = (row: typeof services.$inferSelect): CatalogServiceItem => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  category: row.category,
  categoryKey: row.categoryKey,
  serviceType: row.serviceType,
  plan: row.plan,
  billingModel: row.billingModel as BillingModel,
  billingText: row.billingText,
  price: row.price,
  priceText: row.priceText,
  features: parseJsonArray(row.features),
  rawFeatures: parseJsonArray(row.rawFeatures),
  note: row.note,
  isPopular: Boolean(row.isPopular),
  externalSourceId: row.externalSourceId,
  lastSyncedAt: row.lastSyncedAt,
  sortOrder: row.sortOrder,
  status: row.status as ServiceStatus,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * List catalog services with optional filters, search, and pagination.
 */
export const findCatalogServices = async (
  params: ServiceQueryInput
): Promise<{ items: CatalogServiceItem[]; total: number }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (params.categoryKey) {
    conditions.push(eq(services.categoryKey, params.categoryKey));
  }

  if (params.serviceType) {
    conditions.push(eq(services.serviceType, params.serviceType));
  }

  if (params.status && params.status !== "all") {
    conditions.push(eq(services.status, params.status));
  }

  if (params.billingModel && params.billingModel !== "all") {
    conditions.push(eq(services.billingModel, params.billingModel));
  }

  if (params.search && params.search.trim() !== "") {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(services.name, term),
        like(services.code, term),
        like(services.serviceType, term),
        like(services.category, term)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db
    .select({ count: count() })
    .from(services)
    .where(whereClause);

  const total = Number(totalRes?.count ?? 0);

  const rows = await db
    .select()
    .from(services)
    .where(whereClause)
    .orderBy(asc(services.sortOrder), asc(services.categoryKey), asc(services.serviceType), asc(services.price))
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map(mapServiceRow),
    total,
  };
};

/**
 * Find a single catalog service by numeric ID.
 */
export const findCatalogServiceById = async (
  id: number
): Promise<CatalogServiceItem | null> => {
  const [row] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return row ? mapServiceRow(row) : null;
};

/**
 * Find a single catalog service by code (SKU).
 */
export const findCatalogServiceByCode = async (
  code: string
): Promise<CatalogServiceItem | null> => {
  const [row] = await db.select().from(services).where(eq(services.code, code)).limit(1);
  return row ? mapServiceRow(row) : null;
};

/**
 * Create a new service in the catalog.
 */
export const createCatalogServiceRecord = async (
  data: CatalogServiceInput
): Promise<CatalogServiceItem> => {
  const [inserted] = await db
    .insert(services)
    .values({
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      categoryKey: data.categoryKey,
      serviceType: data.serviceType,
      plan: data.plan,
      billingModel: data.billingModel,
      billingText: data.billingText ?? null,
      price: data.price,
      priceText: data.priceText ?? null,
      features: JSON.stringify(data.features || []),
      rawFeatures: JSON.stringify(data.rawFeatures || data.features || []),
      note: data.note ?? null,
      isPopular: data.isPopular ? true : false,
      sortOrder: data.sortOrder,
      status: data.status,
      lastSyncedAt: null,
    })
    .returning();

  return mapServiceRow(inserted);
};

/**
 * Update an existing catalog service item.
 */
export const updateCatalogServiceRecord = async (
  id: number,
  data: UpdateCatalogServiceInput
): Promise<CatalogServiceItem | null> => {
  const updatePayload: Partial<typeof services.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.code !== undefined) updatePayload.code = data.code;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.category !== undefined) updatePayload.category = data.category;
  if (data.categoryKey !== undefined) updatePayload.categoryKey = data.categoryKey;
  if (data.serviceType !== undefined) updatePayload.serviceType = data.serviceType;
  if (data.plan !== undefined) updatePayload.plan = data.plan;
  if (data.billingModel !== undefined) updatePayload.billingModel = data.billingModel;
  if (data.billingText !== undefined) updatePayload.billingText = data.billingText;
  if (data.price !== undefined) updatePayload.price = data.price;
  if (data.priceText !== undefined) updatePayload.priceText = data.priceText;
  if (data.features !== undefined) updatePayload.features = JSON.stringify(data.features);
  if (data.rawFeatures !== undefined) updatePayload.rawFeatures = JSON.stringify(data.rawFeatures);
  if (data.note !== undefined) updatePayload.note = data.note;
  if (data.isPopular !== undefined) updatePayload.isPopular = data.isPopular ? true : false;
  if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;
  if (data.status !== undefined) updatePayload.status = data.status;

  const [updated] = await db
    .update(services)
    .set(updatePayload)
    .where(eq(services.id, id))
    .returning();

  return updated ? mapServiceRow(updated) : null;
};

/**
 * Upsert catalog services from public website sync without altering customer_services.
 */
export const upsertCatalogItemsFromSync = async (
  items: SyncCatalogItemInput[]
): Promise<SyncResult> => {
  let addedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  const syncTimestamp = new Date();

  await db.transaction(async (tx) => {
    for (const item of items) {
      // Find existing plan by deterministic SKU code
      const [existing] = await tx
        .select()
        .from(services)
        .where(eq(services.code, item.code))
        .limit(1);

      const featuresJson = JSON.stringify(item.features || []);
      const rawFeaturesJson = JSON.stringify(item.rawFeatures || item.features || []);

      if (existing) {
        // Update existing catalog plan
        await tx
          .update(services)
          .set({
            name: item.name,
            category: item.category,
            categoryKey: item.categoryKey,
            serviceType: item.serviceType,
            plan: item.plan,
            billingModel: item.billingModel,
            billingText: item.billingText,
            price: item.priceMinorUnits,
            priceText: item.priceText,
            features: featuresJson,
            rawFeatures: rawFeaturesJson,
            note: item.note ?? null,
            isPopular: item.isPopular ? true : false,
            sortOrder: item.sortOrder,
            externalSourceId: item.externalId,
            lastSyncedAt: syncTimestamp,
            updatedAt: syncTimestamp,
          })
          .where(eq(services.id, existing.id));

        updatedCount++;
      } else {
        // Insert new catalog plan
        await tx.insert(services).values({
          code: item.code,
          name: item.name,
          description: null,
          category: item.category,
          categoryKey: item.categoryKey,
          serviceType: item.serviceType,
          plan: item.plan,
          billingModel: item.billingModel,
          billingText: item.billingText,
          price: item.priceMinorUnits,
          priceText: item.priceText,
          features: featuresJson,
          rawFeatures: rawFeaturesJson,
          note: item.note ?? null,
          isPopular: item.isPopular ? true : false,
          sortOrder: item.sortOrder,
          status: "active",
          externalSourceId: item.externalId,
          lastSyncedAt: syncTimestamp,
        });

        addedCount++;
      }
    }
  });

  return {
    success: true,
    syncedAt: syncTimestamp.toISOString(),
    source: "ahs-public-website-turso",
    totalReceived: items.length,
    addedCount,
    updatedCount,
    unchangedCount,
  };
};

/**
 * List all service subscriptions for a given customer.
 */
export const findCustomerServices = async (
  customerId: string
): Promise<CustomerServiceSubscriptionItem[]> => {
  const rows = await db
    .select({
      sub: customerServices,
      cust: {
        id: customers.id,
        name: customers.name,
        company: customers.company,
      },
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(customerServices)
    .innerJoin(customers, eq(customerServices.customerId, customers.id))
    .leftJoin(users, eq(customerServices.createdById, users.id))
    .where(eq(customerServices.customerId, customerId))
    .orderBy(desc(customerServices.createdAt));

  return rows.map((r) => ({
    id: r.sub.id,
    customerId: r.sub.customerId,
    customerName: r.cust.name,
    customerCompany: r.cust.company,
    serviceId: r.sub.serviceId,
    serviceNameSnapshot: r.sub.serviceNameSnapshot,
    categorySnapshot: r.sub.categorySnapshot,
    serviceTypeSnapshot: r.sub.serviceTypeSnapshot,
    planSnapshot: r.sub.planSnapshot,
    catalogPriceSnapshot: r.sub.catalogPriceSnapshot,
    billingModel: r.sub.billingModel as BillingModel,
    billingText: r.sub.billingText,
    quantity: r.sub.quantity,
    price: r.sub.price,
    totalPrice: r.sub.totalPrice,
    notes: r.sub.notes,
    status: r.sub.status as CustomerServiceStatus,
    startDate: r.sub.startDate,
    endDate: r.sub.endDate,
    createdById: r.sub.createdById,
    createdByName: r.creator?.name ?? null,
    createdAt: r.sub.createdAt,
    updatedAt: r.sub.updatedAt,
  }));
};

/**
 * Find single customer service subscription by UUID.
 */
export const findCustomerServiceById = async (
  id: string
): Promise<CustomerServiceSubscriptionItem | null> => {
  const [row] = await db
    .select({
      sub: customerServices,
      cust: {
        id: customers.id,
        name: customers.name,
        company: customers.company,
      },
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(customerServices)
    .innerJoin(customers, eq(customerServices.customerId, customers.id))
    .leftJoin(users, eq(customerServices.createdById, users.id))
    .where(eq(customerServices.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.sub.id,
    customerId: row.sub.customerId,
    customerName: row.cust.name,
    customerCompany: row.cust.company,
    serviceId: row.sub.serviceId,
    serviceNameSnapshot: row.sub.serviceNameSnapshot,
    categorySnapshot: row.sub.categorySnapshot,
    serviceTypeSnapshot: row.sub.serviceTypeSnapshot,
    planSnapshot: row.sub.planSnapshot,
    catalogPriceSnapshot: row.sub.catalogPriceSnapshot,
    billingModel: row.sub.billingModel as BillingModel,
    billingText: row.sub.billingText,
    quantity: row.sub.quantity,
    price: row.sub.price,
    totalPrice: row.sub.totalPrice,
    notes: row.sub.notes,
    status: row.sub.status as CustomerServiceStatus,
    startDate: row.sub.startDate,
    endDate: row.sub.endDate,
    createdById: row.sub.createdById,
    createdByName: row.creator?.name ?? null,
    createdAt: row.sub.createdAt,
    updatedAt: row.sub.updatedAt,
  };
};

/**
 * Assign a service to a customer with complete immutable snapshot.
 */
export const assignServiceToCustomerRecord = async (data: {
  id: string;
  customerId: string;
  serviceId: number;
  serviceNameSnapshot: string;
  categorySnapshot: string;
  serviceTypeSnapshot: string;
  planSnapshot: string;
  catalogPriceSnapshot: number;
  billingModel: BillingModel;
  billingText: string | null;
  quantity: number;
  price: number;
  totalPrice: number;
  notes: string | null;
  status: CustomerServiceStatus;
  startDate: Date;
  endDate: Date | null;
  createdById: string | null;
}): Promise<CustomerServiceSubscriptionItem> => {
  const [inserted] = await db
    .insert(customerServices)
    .values({
      id: data.id,
      customerId: data.customerId,
      serviceId: data.serviceId,
      serviceNameSnapshot: data.serviceNameSnapshot,
      categorySnapshot: data.categorySnapshot,
      serviceTypeSnapshot: data.serviceTypeSnapshot,
      planSnapshot: data.planSnapshot,
      catalogPriceSnapshot: data.catalogPriceSnapshot,
      billingModel: data.billingModel,
      billingText: data.billingText,
      quantity: data.quantity,
      price: data.price,
      totalPrice: data.totalPrice,
      notes: data.notes,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      createdById: data.createdById,
    })
    .returning();

  const full = await findCustomerServiceById(inserted.id);
  if (!full) throw new Error("Failed to load created customer service");
  return full;
};

/**
 * Update a customer service subscription (status, dates, price, notes).
 */
export const updateCustomerServiceRecord = async (
  id: string,
  data: {
    quantity?: number;
    price?: number;
    totalPrice?: number;
    status?: CustomerServiceStatus;
    startDate?: Date;
    endDate?: Date | null;
    notes?: string | null;
  }
): Promise<CustomerServiceSubscriptionItem | null> => {
  const updatePayload: Partial<typeof customerServices.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.quantity !== undefined) updatePayload.quantity = data.quantity;
  if (data.price !== undefined) updatePayload.price = data.price;
  if (data.totalPrice !== undefined) updatePayload.totalPrice = data.totalPrice;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.startDate !== undefined) updatePayload.startDate = data.startDate;
  if (data.endDate !== undefined) updatePayload.endDate = data.endDate;
  if (data.notes !== undefined) updatePayload.notes = data.notes;

  await db
    .update(customerServices)
    .set(updatePayload)
    .where(eq(customerServices.id, id));

  return findCustomerServiceById(id);
};

/**
 * Get Service KPIs (catalog plan counts, active subscriptions, MRR, one-time value).
 */
export const getServicesKpis = async (
  customerId?: string
): Promise<ServiceKpis> => {
  // 1. Catalog plans counts
  const [catalogTotals] = await db
    .select({
      total: count(),
      active: sql<number>`count(case when ${services.status} = 'active' then 1 end)`,
      lastSynced: max(services.lastSyncedAt),
    })
    .from(services);

  // 2. Customer Subscriptions metrics
  const subConditions: SQL[] = [eq(customerServices.status, "active")];
  if (customerId) {
    subConditions.push(eq(customerServices.customerId, customerId));
  }

  const [subTotals] = await db
    .select({
      activeSubsCount: count(),
      mrr: sql<number>`coalesce(sum(case when ${customerServices.billingModel} = 'monthly' then ${customerServices.totalPrice} else 0 end), 0)`,
      oneTimeRev: sql<number>`coalesce(sum(case when ${customerServices.billingModel} = 'one_time' then ${customerServices.totalPrice} else 0 end), 0)`,
    })
    .from(customerServices)
    .where(and(...subConditions));

  return {
    totalCatalogPlans: Number(catalogTotals?.total ?? 0),
    activeCatalogPlans: Number(catalogTotals?.active ?? 0),
    activeSubscriptionsCount: Number(subTotals?.activeSubsCount ?? 0),
    monthlyRecurringRevenue: Number(subTotals?.mrr ?? 0),
    oneTimeProjectRevenue: Number(subTotals?.oneTimeRev ?? 0),
    lastSyncedAt: catalogTotals?.lastSynced ? new Date(Number(catalogTotals.lastSynced)) : null,
  };
};
