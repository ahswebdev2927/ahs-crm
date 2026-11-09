/**
 * Standard Indian Rupee (INR / ₹) Currency and Financial Date Formatters
 * In accordance with AGENTS.md § 19:
 * - Canonical Currency: Indian Rupees (INR / ₹)
 * - Locale: en-IN (e.g. ₹1,50,000.00)
 * - Minor unit base: paise (1 INR = 100 paise)
 */

export function formatINR(
  paise: number | undefined | null,
  options?: { forceDecimals?: boolean }
): string {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return options?.forceDecimals ? "₹0.00" : "₹0";
  }
  const rupees = paise / 100;
  const hasDecimals = paise % 100 !== 0;
  return rupees.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: options?.forceDecimals || hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats Rupee amounts compactly for chart axis tick labels.
 * User rule:
 * - 0 -> 0
 * - 1,000 to 99,999 -> 0.5k, 1k, 2k, 20k, 50k
 * - 1,00,000 to 99,99,999 -> 1L, 20L, 50L (1 Lakh = 100k rupees)
 * - >= 1,00,00,000 -> 1Cr, 2Cr (1 Crore = 100 Lakhs = 10,000,000 rupees)
 * - Plain numbers without currency symbol as specified by user.
 */
export function formatAxisINR(rupees: number | undefined | null): string {
  if (rupees === undefined || rupees === null || isNaN(rupees) || rupees === 0) return "0";
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? "-" : "";

  if (abs >= 10000000) {
    const cr = abs / 10000000;
    return `${sign}${Number(cr.toFixed(cr >= 10 ? 0 : 1))}Cr`;
  }
  if (abs >= 100000) {
    const l = abs / 100000;
    return `${sign}${Number(l.toFixed(l >= 10 ? 0 : 1))}L`;
  }
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}${Number(k.toFixed(k >= 10 ? 0 : 1))}k`;
  }
  if (abs >= 100) {
    const k = abs / 1000;
    return `${sign}${Number(k.toFixed(1))}k`;
  }
  return `${sign}${abs}`;
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
