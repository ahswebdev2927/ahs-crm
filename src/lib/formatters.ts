/**
 * Standard Indian Rupee (INR / ₹) Currency and Financial Date Formatters
 * In accordance with AGENTS.md § 19:
 * - Canonical Currency: Indian Rupees (INR / ₹)
 * - Locale: en-IN (e.g. ₹1,50,000.00)
 * - Minor unit base: paise (1 INR = 100 paise)
 */

export function formatINR(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) return "₹0.00";
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatINRCompact(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) return "₹0";
  const rupees = paise / 100;
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)} L`;
  }
  if (rupees >= 1000) {
    return `₹${(rupees / 1000).toFixed(1)}k`;
  }
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export function formatFinancialDate(timestamp: number | string | Date | undefined | null): string {
  if (!timestamp) return "—";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
