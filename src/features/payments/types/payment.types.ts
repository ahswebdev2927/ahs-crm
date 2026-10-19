import type { PaymentMethod } from "../schemas/payment.schema";

export interface PaymentClientSnapshot {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PaymentInvoiceSnapshot {
  id: string;
  invoiceNumber: string;
  total: number; // in paise
  amountPaid: number; // in paise
  amountDue: number; // in paise
  status: string;
}

export interface PaymentItem {
  id: string;
  invoiceId: string;
  customerId: string | null;
  amount: number; // in paise
  paymentDate: number;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  receiptUrl: string | null;
  receiptPublicId: string | null;
  notes: string | null;
  status: "pending" | "completed" | "failed" | "refunded";
  receivedById: string;
  createdAt: number;
  updatedAt: number;
  receivedByName?: string | null;
  receivedByEmail?: string | null;
  invoice?: PaymentInvoiceSnapshot | null;
  customer?: PaymentClientSnapshot | null;
}

export interface PaymentKpis {
  totalCollected: number; // in paise
  todayCollected: number; // in paise
  monthCollected: number; // in paise
  transactionCount: number;
  methodBreakdown: Record<string, number>; // method -> amount in paise
}
