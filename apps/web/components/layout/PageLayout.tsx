import { AppBanner } from "./AppBanner";
import { TopHeader } from "./TopHeader";
import { CompanyFooter } from "./CompanyFooter";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showAppBanner?: boolean;
  showIcons?: boolean;
}

export function PageLayout({
  children,
  title,
  showBack = false,
  showAppBanner = true,
  showIcons = true,
}: PageLayoutProps) {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-white">
      {showAppBanner && <AppBanner />}
      <TopHeader title={title} showBack={showBack} showIcons={showIcons} />
      <main className="flex-1 flex flex-col">
        <div className="flex-1">{children}</div>
        <CompanyFooter />
      </main>
    </div>
  );
}
