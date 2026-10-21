export type QuotationStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired";

export interface QuotationItemModel {
  id: number;
  quotationId: string;
  serviceId: number | null;
  description: string;
  quantity: number;
  unitPrice: number; // in paise
  totalPrice: number; // in paise
  createdAt: number;
  updatedAt: number;
}

export interface QuotationClientSnapshot {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface QuotationCreatorSnapshot {
  id: string;
  name: string;
  email: string;
}

export interface QuotationItem {
  id: string;
  quoteNumber: string;
  leadId: string | null;
  customerId: string | null;
  validUntil: number;
  subtotal: number; // in paise
  discount: number; // in paise
  tax: number; // in paise
  total: number; // in paise
  status: QuotationStatus;
  notes: string | null;
  terms: string | null;
  sentAt: number | null;
  acceptedAt: number | null;
  declinedAt: number | null;
  createdById: string;
  createdAt: number;
  updatedAt: number;
  lead?: QuotationClientSnapshot | null;
  customer?: QuotationClientSnapshot | null;
  createdBy?: QuotationCreatorSnapshot | null;
  itemsCount?: number;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
}

export interface QuotationDetail extends QuotationItem {
  items: QuotationItemModel[];
}

export interface QuotationKpis {
  totalQuotations: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  declinedCount: number;
  expiredCount: number;
  totalPipelineValue: number; // sum of total for active non-declined/expired
  acceptedValue: number; // sum of accepted total
}
