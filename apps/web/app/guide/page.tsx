import Link from "next/link";
import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "온라인 수선 이용 안내 | 모두의수선",
  description:
    "온라인 수선으로 옷수선을 맡기는 방법. 택배 수거, 전문 수선, 집으로 배송. 바지 기장·지퍼·허리 수선 가격과 이용 방법을 안내합니다.",
  path: "/guide",
});

export default function GuideHubPage() {
  return (
    <PageLayout title="온라인 수선 안내" showBack showAppBanner={false}>
      <article className="px-5 py-6 space-y-8 text-gray-800">
        <header className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">온라인으로 맡기는 의류 수선</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            모두의수선은 수선집에 직접 가지 않아도 되는 <strong>온라인 수선</strong>·
            <strong>비대면 수선</strong> 서비스입니다. 웹이나 앱에서 수선 항목을 고르고
            결제하면, 지정한 날에 우체국이 옷을 수거합니다. 수선이 끝나면 집으로 보내 드립니다.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">이런 수선을 맡길 수 있어요</h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-gray-600 space-y-1">
            <li>바지·청바지 기장 줄임</li>
            <li>허리 줄임, 지퍼 교체</li>
            <li>아우터 소매 기장, 코트·재킷 수선</li>
            <li>그 외 가격표에 있는 의류 수선</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">이용 방법</h2>
          <ol className="list-decimal pl-5 text-sm leading-relaxed text-gray-600 space-y-1">
            <li>수선할 옷과 항목을 선택합니다.</li>
            <li>수거 희망일을 정하고 결제합니다.</li>
            <li>그날 우체국 집배원이 방문 수거합니다.</li>
            <li>전문 수선 후 고객 주소로 배송됩니다.</li>
          </ol>
        </section>

        <div className="grid gap-3">
          <Link
            href="/guide/price"
            className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800"
          >
            수선 가격표 보기
          </Link>
          <Link
            href="/guide/easy"
            className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800"
          >
            쉬운 이용 가이드
          </Link>
          <Link
            href="/faq"
            className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800"
          >
            자주 묻는 질문
          </Link>
          <Link
            href="/order/new"
            className="block rounded-xl bg-[#00C896] px-4 py-3 text-center text-sm font-bold text-white"
          >
            온라인 수선 신청하기
          </Link>
        </div>
      </article>
    </PageLayout>
  );
}
