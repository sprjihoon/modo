"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Package,
  Users,
  Video,
  Settings,
  BarChart3,
  CreditCard,
  TrendingUp,
  Scissors,
  Ticket,
  Truck,
  Building2,
  Image,
  ClipboardList,
  FileText,
  DollarSign,
  Activity,
  Bell,
  MessageSquareText,
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  Clock,
  PanelLeftClose,
  PanelLeft,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: "main",
    title: "메인",
    icon: LayoutDashboard,
    items: [
      { title: "대시보드", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "orders",
    title: "주문 & 배송",
    icon: Package,
    items: [
      { title: "주문 관리", href: "/dashboard/orders", icon: Package },
      { title: "수거/배송 관리", href: "/dashboard/shipments", icon: Truck },
    ],
  },
  {
    id: "customers",
    title: "고객 & 마케팅",
    icon: Users,
    items: [
      { title: "고객 관리", href: "/dashboard/customers", icon: Users },
      { title: "포인트 관리", href: "/dashboard/points", icon: TrendingUp },
      { title: "프로모션 코드", href: "/dashboard/promotions", icon: Ticket },
    ],
  },
  {
    id: "finance",
    title: "재무",
    icon: DollarSign,
    items: [
      { title: "결제 내역", href: "/dashboard/payments", icon: CreditCard },
      { title: "정산 관리", href: "/dashboard/settlements", icon: DollarSign },
    ],
  },
  {
    id: "analytics",
    title: "분석",
    icon: BarChart3,
    items: [
      { title: "통계 및 분석", href: "/dashboard/analytics", icon: BarChart3 },
      { title: "고객 행동 분석", href: "/dashboard/analytics/customer-behavior", icon: Activity },
      { title: "직원 행동 분석", href: "/dashboard/action-logs", icon: Activity },
    ],
  },
  {
    id: "content",
    title: "콘텐츠",
    icon: FileText,
    items: [
      { title: "수선 메뉴 관리", href: "/dashboard/repair-menu", icon: Scissors },
      { title: "영상 관리", href: "/dashboard/videos", icon: Video },
      { title: "배너 관리", href: "/dashboard/banners", icon: Image },
      { title: "콘텐츠 관리", href: "/dashboard/settings/contents", icon: FileText },
    ],
  },
  {
    id: "notifications",
    title: "알림",
    icon: Bell,
    items: [
      { title: "공지사항 관리", href: "/dashboard/notifications/announcements", icon: Bell },
      { title: "알림 템플릿", href: "/dashboard/notifications/templates", icon: MessageSquareText },
    ],
  },
  {
    id: "system",
    title: "시스템",
    icon: Settings,
    items: [
      { title: "작업 내역", href: "/dashboard/work-history", icon: ClipboardList },
      { title: "설정", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

const STORAGE_KEYS = {
  EXPANDED_GROUPS: "admin-nav-expanded-groups",
  FAVORITES: "admin-nav-favorites",
  RECENT: "admin-nav-recent",
  COLLAPSED: "admin-nav-collapsed",
};

const MAX_RECENT_ITEMS = 5;

export function DashboardNav() {
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState("모두의수선");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["main", "orders"]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedExpanded = localStorage.getItem(STORAGE_KEYS.EXPANDED_GROUPS);
    const savedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    const savedRecent = localStorage.getItem(STORAGE_KEYS.RECENT);
    const savedCollapsed = localStorage.getItem(STORAGE_KEYS.COLLAPSED);

    if (savedExpanded) setExpandedGroups(JSON.parse(savedExpanded));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRecent) setRecentItems(JSON.parse(savedRecent));
    if (savedCollapsed) setIsCollapsed(JSON.parse(savedCollapsed));

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.EXPANDED_GROUPS, JSON.stringify(expandedGroups));
  }, [expandedGroups, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recentItems));
  }, [recentItems, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.COLLAPSED, JSON.stringify(isCollapsed));
  }, [isCollapsed, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !pathname) return;
    
    setRecentItems((prev) => {
      const filtered = prev.filter((item) => item !== pathname);
      return [pathname, ...filtered].slice(0, MAX_RECENT_ITEMS);
    });
  }, [pathname, isHydrated]);

  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const response = await fetch("/api/admin/settings/company-info");
        const data = await response.json();
        if (data.success && data.data?.company_name) {
          const cleanName = data.data.company_name.split("(")[0].trim();
          setCompanyName(cleanName);
        }
      } catch (error) {
        console.error("회사 정보 로드 실패:", error);
      }
    };

    loadCompanyInfo();
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((g) => g !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const toggleFavorite = useCallback((href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(href)
        ? prev.filter((f) => f !== href)
        : [...prev, href]
    );
  }, []);

  const allItems = useMemo(() => {
    return navGroups.flatMap((group) => group.items);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return navGroups;

    const query = searchQuery.toLowerCase();
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            group.title.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const favoriteItems = useMemo(() => {
    return allItems.filter((item) => favorites.includes(item.href));
  }, [allItems, favorites]);

  const recentNavItems = useMemo(() => {
    return recentItems
      .map((href) => allItems.find((item) => item.href === href))
      .filter((item): item is NavItem => item !== undefined)
      .slice(0, 3);
  }, [recentItems, allItems]);

  const isItemActive = useCallback(
    (href: string) => {
      if (href === "/dashboard") {
        return pathname === href;
      }
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  const renderNavItem = useCallback(
    (item: NavItem, showFavorite: boolean = true) => {
      const isActive = isItemActive(item.href);
      const isFavorite = favorites.includes(item.href);

      if (isCollapsed) {
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-center p-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.title}</p>
            </TooltipContent>
          </Tooltip>
        );
      }

      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
          )}
        >
          <div className="flex items-center space-x-3">
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </div>
          {showFavorite && (
            <button
              onClick={(e) => toggleFavorite(item.href, e)}
              className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600",
                isFavorite && "opacity-100"
              )}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  isFavorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-400"
                )}
              />
            </button>
          )}
        </Link>
      );
    },
    [isCollapsed, favorites, isItemActive, toggleFavorite]
  );

  const renderNavGroup = useCallback(
    (group: NavGroup) => {
      const isExpanded = expandedGroups.includes(group.id);
      const hasActiveItem = group.items.some((item) => isItemActive(item.href));

      if (isCollapsed) {
        return (
          <div key={group.id} className="space-y-1">
            {group.items.map((item) => renderNavItem(item, false))}
          </div>
        );
      }

      return (
        <div key={group.id} className="space-y-1">
          <button
            onClick={() => toggleGroup(group.id)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors",
              hasActiveItem
                ? "text-primary bg-primary/5"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <div className="flex items-center space-x-2">
              <group.icon className="h-4 w-4" />
              <span>{group.title}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          <div
            className={cn(
              "overflow-hidden transition-all duration-200",
              isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="ml-2 pl-2 border-l-2 border-gray-100 dark:border-gray-700 space-y-1 py-1">
              {group.items.map((item) => renderNavItem(item))}
            </div>
          </div>
        </div>
      );
    },
    [expandedGroups, isCollapsed, isItemActive, renderNavItem, toggleGroup]
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen flex flex-col transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* 헤더 */}
        <div className={cn("p-4", isCollapsed && "px-2")}>
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center",
                isCollapsed ? "justify-center" : "space-x-2"
              )}
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🧵</span>
              </div>
              {!isCollapsed && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                    {companyName}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    관리자
                  </p>
                </div>
              )}
            </Link>
          </div>

          {/* 축소/확장 버튼 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex items-center justify-center w-full p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
              isCollapsed && "px-0"
            )}
          >
            {isCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 mr-2" />
                <span className="text-xs">메뉴 접기</span>
              </>
            )}
          </button>
        </div>

        {/* 검색 */}
        {!isCollapsed && (
          <div className="px-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="메뉴 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        <ScrollArea className="flex-1 px-2">
          <nav className="space-y-4 pb-4">
            {/* 즐겨찾기 섹션 */}
            {!searchQuery && favoriteItems.length > 0 && (
              <div className="space-y-1">
                {!isCollapsed && (
                  <div className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
                    <Star className="h-3.5 w-3.5 fill-yellow-400" />
                    <span>즐겨찾기</span>
                  </div>
                )}
                <div className={cn("space-y-1", isCollapsed && "pt-2")}>
                  {favoriteItems.map((item) => renderNavItem(item, false))}
                </div>
                {!isCollapsed && (
                  <div className="mx-3 my-2 border-b border-gray-100 dark:border-gray-700" />
                )}
              </div>
            )}

            {/* 최근 방문 섹션 */}
            {!searchQuery && recentNavItems.length > 0 && !isCollapsed && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Clock className="h-3.5 w-3.5" />
                  <span>최근 방문</span>
                </div>
                <div className="space-y-1">
                  {recentNavItems.map((item) => renderNavItem(item, false))}
                </div>
                <div className="mx-3 my-2 border-b border-gray-100 dark:border-gray-700" />
              </div>
            )}

            {/* 메뉴 그룹 */}
            <div className="space-y-2">
              {filteredGroups.map((group) => renderNavGroup(group))}
            </div>

            {/* 검색 결과 없음 */}
            {searchQuery && filteredGroups.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>검색 결과가 없습니다</p>
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* 센터 콘솔로 이동 버튼 */}
        <div
          className={cn(
            "mt-auto p-4 border-t border-gray-200 dark:border-gray-700",
            isCollapsed && "p-2"
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/ops/inbound"
                  className={cn(
                    "flex items-center justify-center p-2 rounded-lg transition-colors",
                    pathname.startsWith("/ops")
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400"
                  )}
                >
                  <Building2 className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>센터 콘솔로 이동</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/ops/inbound"
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium shadow-sm",
                pathname.startsWith("/ops")
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-2 border-green-300 dark:border-green-700"
                  : "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700"
              )}
            >
              <Building2 className="h-5 w-5" />
              <span>센터 콘솔로 이동</span>
            </Link>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
