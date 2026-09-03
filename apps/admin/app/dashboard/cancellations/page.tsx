"use client";

import { Suspense } from "react";
import { CancellationQueuePage } from "@/components/orders/cancellation-queue-page";

function CancellationQueueFallback() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export default function DashboardCancellationsPage() {
  return (
    <Suspense fallback={<CancellationQueueFallback />}>
      <CancellationQueuePage
        title="취소/반송 큐"
        description="취소·반송 요청을 확인하고 송장 재출력부터 반송 완료까지 처리합니다"
      />
    </Suspense>
  );
}
