"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export interface UseTableQueryParamsOptions {
  /**
   * Keys to preserve when resetFilters() is called.
   * Defaults to ["tab", "sortBy", "sortOrder"].
   */
  defaultPreserveKeys?: string[];
}

/**
 * Custom hook to synchronize table search terms, active dropdown filters,
 * pagination, and date ranges bi-directionally with URL query parameters.
 */
export function useTableQueryParams(options: UseTableQueryParamsOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { defaultPreserveKeys = ["tab", "sortBy", "sortOrder"] } = options;

  /**
   * Get a string query parameter or fallback.
   */
  const getParam = React.useCallback(
    (key: string, defaultValue = ""): string => {
      return searchParams.get(key) ?? defaultValue;
    },
    [searchParams]
  );

  /**
   * Get an integer query parameter (e.g. page, limit) or fallback.
   */
  const getNumberParam = React.useCallback(
    (key: string, defaultValue = 1): number => {
      const val = searchParams.get(key);
      if (!val) return defaultValue;
      const num = parseInt(val, 10);
      return isNaN(num) ? defaultValue : num;
    },
    [searchParams]
  );

  /**
   * Update one or multiple query parameters atomically.
   * Cleans up empty, null, or "all" values to keep URLs clean.
   * By default resets `page` to 1 whenever any filter changes (unless `page` is explicitly passed).
   */
  const setQueryParams = React.useCallback(
    (
      updates: Record<string, string | number | null | undefined>,
      opts?: { resetPage?: boolean }
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          value === "all"
        ) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      // Unless disabled or page is specifically updated, reset to page 1 on filter mutation
      if (opts?.resetPage !== false && !("page" in updates)) {
        params.delete("page");
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /**
   * Reset all filter parameters, preserving keys like sort or view tabs.
   */
  const resetFilters = React.useCallback(
    (preserveKeys: string[] = defaultPreserveKeys) => {
      const params = new URLSearchParams();
      preserveKeys.forEach((key) => {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      });

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [router, pathname, searchParams, defaultPreserveKeys]
  );

  return {
    searchParams,
    getParam,
    getNumberParam,
    setQueryParams,
    resetFilters,
  };
}
