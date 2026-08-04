import { Suspense } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";

export default function NotificationsPage() {
  return (
    <PageLayout title="알림" showBack showAppBanner={false}>
      <Suspense
        fallback={
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        <NotificationsClient />
      </Suspense>
    </PageLayout>
  );
}
