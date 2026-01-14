"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";

// 토스페이먼츠 클라이언트 키 (환경변수 필수)
function getClientKey(): string {
  const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
}

interface TossPaymentWidgetProps {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  successUrl: string;
  failUrl: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export default function TossPaymentWidget({
  orderId,
  orderName,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  successUrl,
  failUrl,
  onReady,
  onError,
}: TossPaymentWidgetProps) {
  const [widgets, setWidgets] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const paymentMethodsRef = useRef<HTMLDivElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);

  // 토스페이먼츠 SDK 초기화 및 위젯 인스턴스 생성
  useEffect(() => {
    const initializeWidget = async () => {
      try {
        setIsLoading(true);
        
        // SDK 초기화
        const tossPayments = await loadTossPayments(getClientKey());
        
        // 결제위젯 인스턴스 생성 (비회원 결제)
        const paymentWidgets = tossPayments.widgets({
          customerKey: ANONYMOUS,
        });

        // 결제 금액 설정
        await paymentWidgets.setAmount({
          currency: "KRW",
          value: amount,
        });

        setWidgets(paymentWidgets);
      } catch (error) {
        console.error("토스페이먼츠 SDK 초기화 실패:", error);
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWidget();
  }, [amount, onError]);

  // 위젯 렌더링
  useEffect(() => {
    const renderWidgets = async () => {
      if (!widgets || !paymentMethodsRef.current || !agreementRef.current) return;

      try {
        // 결제 수단 UI 렌더링
        await widgets.renderPaymentMethods({
          selector: "#payment-methods",
          variantKey: "DEFAULT",
        });

        // 이용약관 UI 렌더링
        await widgets.renderAgreement({
          selector: "#agreement",
          variantKey: "AGREEMENT",
        });

        setIsReady(true);
        onReady?.();
      } catch (error) {
        console.error("결제 위젯 렌더링 실패:", error);
        onError?.(error as Error);
      }
    };

    renderWidgets();
  }, [widgets, onReady, onError]);

  // 결제 금액 업데이트
  useEffect(() => {
    if (widgets && amount > 0) {
      widgets.setAmount({
        currency: "KRW",
        value: amount,
      });
    }
  }, [widgets, amount]);

  // 결제 요청 함수
  const handlePayment = async () => {
    if (!widgets || !isReady) {
      alert("결제 위젯이 아직 준비되지 않았습니다.");
      return;
    }

    try {
      await widgets.requestPayment({
        orderId,
        orderName,
        successUrl,
        failUrl,
        customerName,
        customerEmail,
        customerMobilePhone: customerPhone,
      });
    } catch (error: any) {
      // 사용자가 결제창을 닫은 경우
      if (error.code === "USER_CANCEL") {
        console.log("사용자가 결제를 취소했습니다.");
        return;
      }
      
      console.error("결제 요청 실패:", error);
      onError?.(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">결제 위젯 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 결제 수단 선택 영역 */}
      <div 
        id="payment-methods" 
        ref={paymentMethodsRef}
        className="min-h-[300px]"
      />
      
      {/* 이용약관 영역 */}
      <div 
        id="agreement" 
        ref={agreementRef}
      />
      
      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        disabled={!isReady}
        className={`
          w-full py-4 text-lg font-semibold rounded-lg transition-colors
          ${isReady 
            ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" 
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        {isReady ? `${amount.toLocaleString()}원 결제하기` : "결제 준비 중..."}
      </button>
    </div>
  );
}

