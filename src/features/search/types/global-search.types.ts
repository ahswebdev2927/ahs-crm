export type SearchCategory =
  | "leads"
  | "customers"
  | "appointments"
  | "tasks"
  | "quotations"
  | "invoices"
  | "payments";

export interface GlobalSearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  href: string;
}

export interface CategorizedSearchResults {
  leads: GlobalSearchResultItem[];
  customers: GlobalSearchResultItem[];
  appointments: GlobalSearchResultItem[];
  tasks: GlobalSearchResultItem[];
  quotations: GlobalSearchResultItem[];
  invoices: GlobalSearchResultItem[];
  payments: GlobalSearchResultItem[];
}

export interface GlobalSearchResponse {
  query: string;
  totalCount: number;
  categories: CategorizedSearchResults;
}
