import { AppBanner } from "./AppBanner";
import { TopHeader } from "./TopHeader";
import { BottomTabBar } from "./BottomTabBar";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showTabBar?: boolean;
  showAppBanner?: boolean;
  showIcons?: boolean;
}

export function PageLayout({
  children,
  title,
  showBack = false,
  showTabBar = true,
  showAppBanner = true,
  showIcons = true,
}: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {showAppBanner && <AppBanner />}
      <TopHeader title={title} showBack={showBack} showIcons={showIcons} />
      <main className={`flex-1 ${showTabBar ? "pb-[65px]" : ""}`}>
        {children}
      </main>
      {showTabBar && <BottomTabBar />}
    </div>
  );
}
