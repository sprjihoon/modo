import {
  assignableRoles,
  canAccessAdminDashboard,
  canAccessOpsConsole,
  canAccessStaffAdmin,
  canAssignRole,
  canDeleteStaff,
  canEditStaff,
  canAccessOpsPath,
  canSeeOpsMenu,
  loginLandingPath,
} from "./staff-permissions";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(canAccessStaffAdmin("SUPER_ADMIN") === true, "최고관리자 직원관리");
assert(canAccessStaffAdmin("ADMIN") === true, "관리자 직원관리");
assert(canAccessStaffAdmin("MANAGER") === false, "입출고관리자 직원관리 불가");
assert(canAccessStaffAdmin("WORKER") === false, "작업자 직원관리 불가");
assert(canAccessStaffAdmin("CUSTOMER") === false, "고객 직원관리 불가");

assert(canAccessAdminDashboard("ADMIN") === true, "관리자 대시보드");
assert(canAccessAdminDashboard("MANAGER") === false, "입출고관리자 대시보드 불가");
assert(canAccessOpsConsole("WORKER") === true, "작업자 센터 콘솔");
assert(canAccessOpsConsole("CUSTOMER") === false, "고객 센터 콘솔 불가");

assert(loginLandingPath("SUPER_ADMIN") === "/dashboard", "최고관리자 랜딩");
assert(loginLandingPath("ADMIN") === "/dashboard", "관리자 랜딩");
assert(loginLandingPath("MANAGER") === "/ops/inbound", "입출고관리자 랜딩");
assert(loginLandingPath("WORKER") === "/ops/work", "작업자 랜딩");
assert(loginLandingPath("CUSTOMER") === "/login", "고객 차단");

assert(
  JSON.stringify(assignableRoles("SUPER_ADMIN")) ===
    JSON.stringify(["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"]),
  "최고관리자는 모든 역할 부여"
);
assert(
  JSON.stringify(assignableRoles("ADMIN")) === JSON.stringify(["ADMIN", "MANAGER", "WORKER"]),
  "관리자는 최고관리자 부여 불가"
);
assert(assignableRoles("MANAGER").length === 0, "입출고관리자는 역할 부여 없음");

assert(canAssignRole("ADMIN", "SUPER_ADMIN") === false, "관리자→최고관리자 승격 불가");
assert(canAssignRole("ADMIN", "WORKER") === true, "관리자→작업자 부여");
assert(canAssignRole("SUPER_ADMIN", "SUPER_ADMIN") === true, "최고관리자→최고관리자 부여");

assert(canEditStaff("ADMIN", "SUPER_ADMIN") === false, "관리자는 최고관리자 수정 불가");
assert(canEditStaff("ADMIN", "WORKER") === true, "관리자는 작업자 수정");
assert(canEditStaff("SUPER_ADMIN", "SUPER_ADMIN") === true, "최고관리자는 최고관리자 수정");
assert(canEditStaff("MANAGER", "WORKER") === false, "입출고관리자는 수정 불가");

assert(canDeleteStaff("SUPER_ADMIN", "SUPER_ADMIN") === false, "최고관리자 삭제 불가");
assert(canDeleteStaff("ADMIN", "SUPER_ADMIN") === false, "관리자도 최고관리자 삭제 불가");
assert(canDeleteStaff("ADMIN", "WORKER") === true, "관리자는 작업자 삭제");
assert(canDeleteStaff("WORKER", "WORKER") === false, "작업자는 삭제 불가");

assert(canSeeOpsMenu("WORKER", "/ops/work") === true, "작업자 작업 메뉴");
assert(canSeeOpsMenu("WORKER", "/ops/inbound") === false, "작업자 입고 메뉴 숨김");
assert(canSeeOpsMenu("MANAGER", "/ops/inbound") === true, "입출고관리자 입고");
assert(canSeeOpsMenu("MANAGER", "/ops/work") === false, "입출고관리자 작업 숨김");
assert(canSeeOpsMenu("ADMIN", "/ops/work") === true, "관리자 센터 전체");
assert(canSeeOpsMenu("SUPER_ADMIN", "/ops/outbound") === true, "최고관리자 센터 전체");

assert(canAccessOpsPath("MANAGER", "/ops/work") === false, "입출고관리자 작업 URL 차단");
assert(canAccessOpsPath("MANAGER", "/ops/work/") === false, "입출고관리자 작업 URL 슬래시");
assert(canAccessOpsPath("WORKER", "/ops/inbound") === false, "작업자 입고 URL 차단");
assert(canAccessOpsPath("WORKER", "/ops/delivery-monitor") === false, "작업자 배송모니터 차단");
assert(canAccessOpsPath("MANAGER", "/ops/delivery-monitor") === false, "입출고관리자 배송모니터 차단");
assert(canAccessOpsPath("WORKER", "/ops/work") === true, "작업자 작업 URL 허용");
assert(canAccessOpsPath("MANAGER", "/ops/inbound") === true, "입출고관리자 입고 URL 허용");
assert(canAccessOpsPath("MANAGER", "/ops/print/barcodes") === true, "입출고관리자 바코드 출력");
assert(canAccessOpsPath("WORKER", "/ops/test") === false, "작업자 테스트 페이지 차단");
assert(canAccessOpsPath("ADMIN", "/ops/work") === true, "관리자 작업 URL 허용");
assert(canAccessOpsPath("ADMIN", "/ops/test") === true, "관리자 테스트 페이지 허용");

console.log("staff-permissions tests passed");
