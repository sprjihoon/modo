import {
  applyCustomerListView,
  paginateCustomers,
  parseCustomerPage,
  parseCustomerPageSize,
  parseCustomerSortBy,
  parseCustomerSortDir,
  sortCustomers,
  type CustomerListSortable,
} from "./customer-list";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function customer(partial: Partial<CustomerListSortable> & { id: string }): CustomerListSortable {
  return {
    created_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

assert(parseCustomerSortBy(undefined) === "created_at", "정렬 기본값 가입일");
assert(parseCustomerSortBy("totalSpent") === "totalSpent", "허용된 정렬 필드");
assert(parseCustomerSortBy("hack") === "created_at", "잘못된 정렬 필드는 가입일");
assert(parseCustomerSortDir(undefined) === "desc", "정렬 방향 기본값 내림차순");
assert(parseCustomerSortDir("asc") === "asc", "오름차순");
assert(parseCustomerPageSize(10) === 10, "10명");
assert(parseCustomerPageSize(20) === 20, "20명");
assert(parseCustomerPageSize(50) === 50, "50명");
assert(parseCustomerPageSize(99) === 20, "허용되지 않은 페이지 크기는 20");
assert(parseCustomerPage(0) === 1, "페이지 최소 1");
assert(parseCustomerPage("3") === 3, "페이지 문자열");

const rows: CustomerListSortable[] = [
  customer({
    id: "a",
    created_at: "2026-03-01T00:00:00.000Z",
    last_seen_at: "2026-03-10T00:00:00.000Z",
    last_device_os: "android",
    totalOrders: 2,
    totalSpent: 30000,
    lastOrderDate: "2026-03-05T00:00:00.000Z",
  }),
  customer({
    id: "b",
    created_at: "2026-01-01T00:00:00.000Z",
    last_seen_at: "2026-04-01T00:00:00.000Z",
    last_device_os: "ios",
    totalOrders: 5,
    totalSpent: 10000,
    lastOrderDate: "2026-04-01T00:00:00.000Z",
  }),
  customer({
    id: "c",
    created_at: "2026-02-01T00:00:00.000Z",
    last_device_os: "web",
    totalOrders: 0,
    totalSpent: 0,
  }),
];

assert(
  sortCustomers(rows, "created_at", "desc").map((c) => c.id).join("") === "acb",
  "가입일 최신순이 기본 정렬"
);
assert(
  sortCustomers(rows, "last_seen_at", "desc").map((c) => c.id).join("") === "bac",
  "마지막 접속 최신순, 기록 없음은 뒤"
);
assert(
  sortCustomers(rows, "last_device_os", "asc").map((c) => c.id).join("") === "bac",
  "OS는 iOS → Android → 웹"
);
assert(
  sortCustomers(rows, "totalOrders", "desc").map((c) => c.id).join("") === "bac",
  "주문 수 많은순"
);
assert(
  sortCustomers(rows, "totalSpent", "desc").map((c) => c.id).join("") === "abc",
  "구매액 많은순"
);
assert(
  sortCustomers(rows, "lastOrderDate", "desc").map((c) => c.id).join("") === "bac",
  "최근 주문 최신순, 주문 없음은 뒤"
);

const many = Array.from({ length: 25 }, (_, i) =>
  customer({ id: `u${i}`, created_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z` })
);
const firstPage = paginateCustomers(many, 1, 10);
assert(firstPage.items.length === 10, "1페이지 10명");
assert(firstPage.pagination.total === 25, "전체 25명");
assert(firstPage.pagination.totalPages === 3, "3페이지");
assert(firstPage.items[0].id === "u0", "첫 페이지 시작");

const lastPage = paginateCustomers(many, 3, 10);
assert(lastPage.items.length === 5, "마지막 페이지 나머지");
assert(lastPage.pagination.page === 3, "마지막 페이지");

const overflow = paginateCustomers(many, 99, 10);
assert(overflow.pagination.page === 3, "페이지 초과 시 마지막 페이지");

const viewedRows = [
  ...rows,
  ...Array.from({ length: 12 }, (_, i) =>
    customer({
      id: `z${i}`,
      created_at: "2025-01-01T00:00:00.000Z",
      totalOrders: 0,
      totalSpent: 0,
    })
  ),
];
const viewed = applyCustomerListView(viewedRows, {
  sortBy: "totalOrders",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
});
assert(viewed.items[0].id === "b" && viewed.items[1].id === "a", "정렬 후 첫 페이지");
assert(viewed.items.length === 10, "10명씩 페이징");
assert(viewed.pagination.total === 15, "필터 후 전체 수");
assert(viewed.sortBy === "totalOrders", "정렬 필드 유지");

const secondPage = applyCustomerListView(viewedRows, {
  sortBy: "totalOrders",
  sortDir: "desc",
  page: 2,
  pageSize: 10,
});
assert(secondPage.items.length === 5, "2페이지 나머지");
assert(secondPage.pagination.page === 2, "2페이지");

console.log("customer-list.test.ts: ok");
