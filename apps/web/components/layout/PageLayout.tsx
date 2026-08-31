import { AppBanner } from "./AppBanner";
import { TopHeader } from "./TopHeader";
import { CompanyFooter } from "./CompanyFooter";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showAppBanner?: boolean;
  showIcons?: boolean;
  showFooter?: boolean;
  /** 주문 플로우처럼 화면 높이를 고정해 하단 다음 버튼이 항상 보이게 */
  fillHeight?: boolean;
}

export function PageLayout({
  children,
  title,
  showBack = false,
  showAppBanner = true,
  showIcons = true,
  showFooter = true,
  fillHeight = false,
}: PageLayoutProps) {
  return (
    <div
      className={
        fillHeight
          ? "flex flex-col flex-1 h-dvh min-h-0 bg-white"
          : "flex flex-col flex-1 min-h-screen bg-white"
      }
    >
      {showAppBanner && <AppBanner />}
      <TopHeader title={title} showBack={showBack} showIcons={showIcons} />
      <main className={fillHeight ? "flex-1 flex flex-col min-h-0" : "flex-1 flex flex-col"}>
        <div className={fillHeight ? "flex-1 min-h-0 flex flex-col" : "flex-1"}>
          {children}
        </div>
        {showFooter && <CompanyFooter />}
      </main>
    </div>
  );
}
