export type InvoiceStatus =
  | "draft"
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled"
  | "void";

export interface InvoiceItemModel {
  id: number;
  invoiceId: string;
  serviceId: number | null;
  description: string;
  quantity: number;
  unitPrice: number; // in paise
  totalPrice: number; // in paise
  createdAt: number;
  updatedAt: number;
}

export interface InvoicePaymentSummary {
  id: string;
  amount: number; // in paise
  paymentDate: number;
  paymentMethod: string;
  transactionReference: string | null;
  receiptUrl: string | null;
  status: string;
  receivedByName?: string | null;
  createdAt: number;
}

export interface InvoiceClientSnapshot {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface InvoiceCreatorSnapshot {
  id: string;
  name: string;
  email: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  quotationId: string | null;
  issueDate: number;
  dueDate: number;
  subtotal: number; // in paise
  discount: number; // in paise
  tax: number; // in paise
  total: number; // in paise
  amountPaid: number; // in paise
  amountDue: number; // in paise
  status: InvoiceStatus;
  notes: string | null;
  terms: string | null;
  createdById: string;
  createdAt: number;
  updatedAt: number;
  customer?: InvoiceClientSnapshot | null;
  createdBy?: InvoiceCreatorSnapshot | null;
  quotationNumber?: string | null;
  isOverdue?: boolean;
}

export interface InvoiceDetail extends InvoiceItem {
  items: InvoiceItemModel[];
  payments: InvoicePaymentSummary[];
}

export interface InvoiceKpis {
  totalBilled: number; // in paise
  totalCollected: number; // in paise
  totalOutstanding: number; // in paise
  totalOverdue: number; // in paise
  totalInvoices: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  paidCount: number;
  overdueCount: number;
}
