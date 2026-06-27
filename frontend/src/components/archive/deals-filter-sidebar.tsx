"use client";

import Link from "next/link";
import { ArrowDownWideNarrow, Building2, Percent } from "lucide-react";
import {
  DealsSortOption,
  buildDealsFilterQuery,
  getBankSlug,
} from "@/lib/deals-archive";

interface DealsFilterSidebarProps {
  city: string;
  banks: any[];
  bankDealCounts: Record<string, number>;
  sort: DealsSortOption;
  minDiscount: number;
  activeBankSlug?: string;
}

const SORT_OPTIONS: Array<{ value: DealsSortOption; label: string }> = [
  { value: "discount", label: "Best Discount" },
  { value: "rating", label: "Top Rated" },
  { value: "name", label: "Name A-Z" },
];

const MIN_DISCOUNT_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80];

function withQuery(path: string, sort: DealsSortOption, minDiscount: number) {
  return `${path}${buildDealsFilterQuery(sort, minDiscount)}`;
}

export function DealsFilterSidebar({
  city,
  banks = [],
  bankDealCounts = {},
  sort,
  minDiscount,
  activeBankSlug,
}: DealsFilterSidebarProps) {
  const hasActiveFilters =
    Boolean(activeBankSlug) || sort !== "discount" || minDiscount > 0;
  const allBanksPath = `/${city}/deals/`;

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm sticky top-20 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
        <span className="text-xs font-bold text-gray-700">Filters</span>
        {hasActiveFilters && (
          <Link
            href={allBanksPath}
            data-route-type="archive"
            className="text-[10px] font-bold text-primary hover:underline"
          >
            Reset
          </Link>
        )}
      </div>

      {banks.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-primary" /> Banks
          </h4>

          <div className="flex flex-wrap gap-1.5">
            <Link
              href={withQuery(allBanksPath, sort, minDiscount)}
              data-route-type="archive"
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                !activeBankSlug
                  ? "bg-primary text-white border-primary"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/50 hover:text-primary"
              }`}
            >
              All
            </Link>

            {banks.map((bank: any) => {
              const slug = getBankSlug(bank);
              const count = bankDealCounts[String(bank?._id)] || 0;
              const isActive = Boolean(activeBankSlug) && activeBankSlug === slug;

              return (
                <Link
                  key={String(bank?._id)}
                  href={withQuery(`/${city}/deals/${slug}/`, sort, minDiscount)}
                  data-route-type="archive"
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                    isActive
                      ? "bg-primary text-white border-primary"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {bank?.name || "Bank"} ({count})
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1.5">
          <ArrowDownWideNarrow className="w-3 h-3 text-primary" /> Sort
        </h4>
        <div className="space-y-1.5">
          {SORT_OPTIONS.map((option) => {
            const isActive = sort === option.value;
            return (
              <Link
                key={option.value}
                href={withQuery(
                  activeBankSlug
                    ? `/${city}/deals/${activeBankSlug}/`
                    : allBanksPath,
                  option.value,
                  minDiscount,
                )}
                data-route-type="archive"
                className={`block text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/50 hover:text-primary"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1.5">
          <Percent className="w-3 h-3 text-primary" /> Min Discount
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {MIN_DISCOUNT_OPTIONS.map((value) => {
            const isActive = minDiscount === value;
            return (
              <Link
                key={value}
                href={withQuery(
                  activeBankSlug
                    ? `/${city}/deals/${activeBankSlug}/`
                    : allBanksPath,
                  sort,
                  value,
                )}
                data-route-type="archive"
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                  isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-primary/50 hover:text-primary"
                }`}
              >
                {value === 0 ? "Any" : `${value}%+`}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

