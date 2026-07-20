"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, Suspense } from "react";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { PageTracker } from "@/components/analytics/PageTracker";
import { InviteBootstrap } from "@/components/auth/InviteBootstrap";
import { preloadAllSvgs } from "@/components/ui/InlineSvg";

preloadAllSvgs();

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <PostHogProvider>
      <Suspense>
        <PageTracker />
        <InviteBootstrap />
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </Suspense>
    </PostHogProvider>
  );
}
