export type StaffRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "WORKER";

export const STAFF_ROLES: StaffRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"];
export const ADMIN_ROLES: StaffRole[] = ["SUPER_ADMIN", "ADMIN"];

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return !!role && STAFF_ROLES.includes(role as StaffRole);
}

export function canAccessStaffAdmin(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role as StaffRole);
}

export function canAccessAdminDashboard(role: string | null | undefined): boolean {
  return canAccessStaffAdmin(role);
}

export function canAccessOpsConsole(role: string | null | undefined): boolean {
  return isStaffRole(role);
}

/** 직원 계정 생성/수정 시 부여할 수 있는 역할 */
export function assignableRoles(actorRole: StaffRole): StaffRole[] {
  if (actorRole === "SUPER_ADMIN") return [...STAFF_ROLES];
  if (actorRole === "ADMIN") return ["ADMIN", "MANAGER", "WORKER"];
  return [];
}

export function canAssignRole(actorRole: StaffRole, targetRole: StaffRole): boolean {
  return assignableRoles(actorRole).includes(targetRole);
}

export function canEditStaff(actorRole: StaffRole, targetRole: StaffRole): boolean {
  if (!canAccessStaffAdmin(actorRole)) return false;
  if (targetRole === "SUPER_ADMIN") return actorRole === "SUPER_ADMIN";
  return true;
}

export function canDeleteStaff(actorRole: StaffRole, targetRole: StaffRole): boolean {
  if (!canAccessStaffAdmin(actorRole)) return false;
  if (targetRole === "SUPER_ADMIN") return false;
  return true;
}

export const OPS_MENU_HREFS = {
  WORKER: ["/ops/work", "/ops/my-dashboard", "/ops/work-history"],
  MANAGER: [
    "/ops/inbound",
    "/ops/outbound",
    "/ops/returns",
    "/ops/reprint",
    "/ops/my-dashboard",
    "/ops/work-history",
    "/ops/label-editor",
    "/ops/barcode-layout",
  ],
} as const;

export function canSeeOpsMenu(role: StaffRole, href: string): boolean {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  if (role === "WORKER") return (OPS_MENU_HREFS.WORKER as readonly string[]).includes(href);
  if (role === "MANAGER") return (OPS_MENU_HREFS.MANAGER as readonly string[]).includes(href);
  return false;
}

export function loginLandingPath(role: string): "/dashboard" | "/ops/inbound" | "/ops/work" | "/login" {
  if (canAccessAdminDashboard(role)) return "/dashboard";
  if (role === "WORKER") return "/ops/work";
  if (canAccessOpsConsole(role)) return "/ops/inbound";
  return "/login";
}
