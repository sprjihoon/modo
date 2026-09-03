export const CUSTOMER_PAGE_SIZES = [10, 20, 50] as const;

export const CUSTOMER_SORT_FIELDS = [
  "created_at",
  "last_seen_at",
  "last_device_os",
  "totalOrders",
  "totalSpent",
  "lastOrderDate",
] as const;

export type CustomerSortBy = (typeof CUSTOMER_SORT_FIELDS)[number];
export type CustomerSortDir = "asc" | "desc";
export type CustomerPageSize = (typeof CUSTOMER_PAGE_SIZES)[number];

export type CustomerListSortable = {
  id: string;
  created_at: string;
  last_seen_at?: string | null;
  last_device_os?: string | null;
  totalOrders?: number | null;
  totalSpent?: number | null;
  lastOrderDate?: string | null;
};

export type CustomerListPagination = {
  page: number;
  pageSize: CustomerPageSize;
  total: number;
  totalPages: number;
};

const SORT_FIELD_SET = new Set<string>(CUSTOMER_SORT_FIELDS);
const PAGE_SIZE_SET = new Set<number>(CUSTOMER_PAGE_SIZES);

export function parseCustomerSortBy(value?: string | null): CustomerSortBy {
  if (value && SORT_FIELD_SET.has(value)) return value as CustomerSortBy;
  return "created_at";
}

export function parseCustomerSortDir(value?: string | null): CustomerSortDir {
  return value === "asc" ? "asc" : "desc";
}

export function parseCustomerPageSize(value?: string | number | null): CustomerPageSize {
  const n = typeof value === "number" ? value : Number(value);
  if (PAGE_SIZE_SET.has(n)) return n as CustomerPageSize;
  return 20;
}

export function parseCustomerPage(value?: string | number | null): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function osRank(os?: string | null): number {
  if (!os?.trim()) return 99;
  const raw = os.trim();
  if (/^ios/i.test(raw)) return 1;
  if (/^android/i.test(raw)) return 2;
  if (/web/i.test(raw)) return 3;
  return 4;
}

function compareNullableDate(
  a?: string | null,
  b?: string | null,
  dir: number
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b) * dir;
}

export function sortCustomers<T extends CustomerListSortable>(
  customers: T[],
  sortBy: CustomerSortBy = "created_at",
  sortDir: CustomerSortDir = "desc"
): T[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...customers].sort((a, b) => {
    let result = 0;
    switch (sortBy) {
      case "created_at":
        result = compareNullableDate(a.created_at, b.created_at, dir);
        break;
      case "last_seen_at":
        result = compareNullableDate(a.last_seen_at, b.last_seen_at, dir);
        break;
      case "last_device_os":
        result = (osRank(a.last_device_os) - osRank(b.last_device_os)) * dir;
        break;
      case "totalOrders":
        result = ((a.totalOrders ?? 0) - (b.totalOrders ?? 0)) * dir;
        break;
      case "totalSpent":
        result = ((a.totalSpent ?? 0) - (b.totalSpent ?? 0)) * dir;
        break;
      case "lastOrderDate":
        result = compareNullableDate(a.lastOrderDate, b.lastOrderDate, dir);
        break;
      default:
        result = compareNullableDate(a.created_at, b.created_at, dir);
    }
    if (result !== 0) return result;
    const created = compareNullableDate(a.created_at, b.created_at, -1);
    if (created !== 0) return created;
    return a.id.localeCompare(b.id);
  });
}

export function paginateCustomers<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; pagination: CustomerListPagination } {
  const safePageSize = parseCustomerPageSize(pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize) || 1);
  const safePage = Math.min(Math.max(1, parseCustomerPage(page)), totalPages);
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
    },
  };
}

export function applyCustomerListView<T extends CustomerListSortable>(
  customers: T[],
  options?: {
    sortBy?: string | null;
    sortDir?: string | null;
    page?: string | number | null;
    pageSize?: string | number | null;
  }
) {
  const sortBy = parseCustomerSortBy(options?.sortBy);
  const sortDir = parseCustomerSortDir(options?.sortDir);
  const sorted = sortCustomers(customers, sortBy, sortDir);
  const paged = paginateCustomers(sorted, parseCustomerPage(options?.page), parseCustomerPageSize(options?.pageSize));
  return {
    ...paged,
    sortBy,
    sortDir,
  };
}
