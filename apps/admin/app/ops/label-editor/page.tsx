"use client";

import { useState, useRef, useEffect } from "react";
import { Save, X, Image as ImageIcon, Download, Upload, RotateCcw } from "lucide-react";

// 필드 설정 타입
interface FieldConfig {
  fieldKey: string;
  label: string;
  exampleValue: string;
  fontSize: number;
  isBold: boolean;
  borderColor?: string;
  type: "text" | "barcode";
}

// 라벨 요소 모델
interface LabelElement {
  fieldKey: string;
  label: string;
  exampleValue: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
  borderColor?: string;
  letterSpacing?: number; // 자간 (px)
  type: "text" | "barcode";
  editable?: boolean; // 수정 가능 여부 (기본값: true)
}

// 우체국 C형 송장 규격 (mm) - 가로형
const LABEL_WIDTH_MM = 168;  // 가로
const LABEL_HEIGHT_MM = 107; // 세로
const DPI = 96;

// mm를 픽셀로 변환
const mmToPx = (mm: number) => mm * (DPI / 25.4);
const pxToMm = (px: number) => px * (25.4 / DPI);

// 기본 필드 목록 (샘플 이미지 기반)
const DEFAULT_FIELDS: FieldConfig[] = [
  {
    fieldKey: "output_label",
    label: "0차 출력",
    exampleValue: "0차 출력",
    fontSize: 14,
    isBold: true,
    type: "text",
  },
  {
    fieldKey: "sorting_code_large",
    label: "집배코드 (큰 글씨)",
    exampleValue: "경1 701 48 05",
    fontSize: 40, // 35 -> 40
    isBold: true,
    type: "text",
  },
  {
    fieldKey: "delivery_center_info",
    label: "도착집중국 정보",
    exampleValue: "대구M 동대구 -480-",
    fontSize: 13,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "order_date",
    label: "신청일",
    exampleValue: "신청일: 2025-12-02",
    fontSize: 12,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "orderer_name",
    label: "주문인",
    exampleValue: "주문인: 테스트",
    fontSize: 11,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "customer_order_source",
    label: "고객 주문처",
    exampleValue: "고객 주문처: 틸리언 수기",
    fontSize: 11,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "order_number",
    label: "주문번호",
    exampleValue: "주문번호: 645675",
    fontSize: 11,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "package_info",
    label: "중량/용적/요금",
    exampleValue: "중량:2kg 용적:60cm 요금: 신용 0",
    fontSize: 11,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "zipcode_barcode",
    label: "우편번호 바코드",
    exampleValue: "41100",
    fontSize: 12,
    isBold: false,
    type: "barcode",
  },
  {
    fieldKey: "total_quantity",
    label: "총 개수",
    exampleValue: "[총 1개]",
    fontSize: 12,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "items_list",
    label: "상품 리스트",
    exampleValue: "1. 거래물품-1개",
    fontSize: 13,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "sender_address",
    label: "보내는 분 주소",
    exampleValue: "대구 동구 동촌로 1 (입석동, 동대구우체국, 경북지방우정청) 동대구 우체국 소포실",
    fontSize: 13, // 12 -> 13
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "sender_name",
    label: "보내는 분 이름",
    exampleValue: "틸리언",
    fontSize: 13, // 12 -> 13
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "sender_phone",
    label: "보내는 분 전화",
    exampleValue: "010-2723-9490",
    fontSize: 13, // 12 -> 13
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "receiver_address",
    label: "받는 분 주소",
    exampleValue: "대구 동구 안심로 188 (신기동) 3층",
    fontSize: 16, // 14 -> 16
    isBold: true, // false -> true
    type: "text",
  },
  {
    fieldKey: "receiver_name",
    label: "받는 분 이름",
    exampleValue: "테스트",
    fontSize: 14, // 13 -> 14
    isBold: true, // false -> true
    type: "text",
  },
  {
    fieldKey: "receiver_phone",
    label: "받는 분 전화",
    exampleValue: "01027239490",
    fontSize: 14, // 13 -> 14
    isBold: true, // false -> true
    type: "text",
  },
  {
    fieldKey: "tracking_no_text",
    label: "등기번호 (텍스트)",
    exampleValue: "등기번호: 60914-8600-5658",
    fontSize: 12,
    isBold: false,
    type: "text",
  },
  {
    fieldKey: "waybill_statement",
    label: "송장 문구",
    exampleValue: "모두의수선에서 제공되는 서비스입니다.",
    fontSize: 12,
    isBold: true,
    type: "text",
  },
  {
    fieldKey: "tracking_no_barcode",
    label: "등기번호 바코드",
    exampleValue: "60914-8600-5658",
    fontSize: 12,
    isBold: false,
    type: "barcode",
  },
  {
    fieldKey: "bottom_info",
    label: "하단 정보",
    exampleValue: "[총 1개] [2회 재출력]",
    fontSize: 12,
    isBold: false,
    type: "text",
  },
];

// 초기 레이아웃 (샘플 이미지 기반으로 미리 배치)
const getInitialLayout = (canvasWidth: number, canvasHeight: number, companyInfo?: any): LabelElement[] => {
  const labelWidth = canvasWidth - mmToPx(10);
  const labelHeight = canvasHeight - mmToPx(10);
  
  // 스케일 팩터: 캔버스가 크므로 실제 송장 크기에 맞게 조정
  const scale = labelWidth / mmToPx(LABEL_WIDTH_MM);
  const scaleFont = (size: number) => Math.max(10, size * scale * 0.8); // 최소 10px, 스케일 조정
  
  // 회사 정보에서 보낸분 정보 가져오기
  const senderAddress = companyInfo?.address || "대구 동구 동촌로 1 (입석동, 동대구우체국, 경북지방우정청) 동대구 우체국 소포실";
  const senderName = companyInfo?.company_name?.split('(')[0].trim() || "틸리언";
  const senderPhone = companyInfo?.phone || "010-2723-9490";
  
  return [
    // 상단
    { fieldKey: "output_label", label: "0차 출력", exampleValue: "0차 출력", x: labelWidth / 2 - 40, y: 10, width: 80, height: 20, fontSize: scaleFont(14), isBold: true, type: "text" },
    // 집배코드: 잘리지 않으면서 적당한 크기로 조정
    { fieldKey: "sorting_code_large", label: "집배코드 (큰 글씨)", exampleValue: "경1 701 48 05", x: labelWidth * 0.38, y: 5, width: 400, height: 55, fontSize: scaleFont(40), isBold: true, letterSpacing: 12, type: "text" },
    { fieldKey: "delivery_center_info", label: "도착집중국 정보", exampleValue: "대구M 동대구 -480-", x: labelWidth * 0.54, y: 55, width: 250, height: 20, fontSize: scaleFont(15), isBold: true, letterSpacing: 10, type: "text" },
    
    // 좌측 열
    { fieldKey: "order_date", label: "신청일", exampleValue: "신청일: 2025-12-02", x: 10, y: 30, width: 150, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
    { fieldKey: "orderer_name", label: "주문인", exampleValue: "주문인: 테스트", x: 10, y: 55, width: 150, height: 18, fontSize: scaleFont(11), isBold: false, type: "text" },
    { fieldKey: "customer_order_source", label: "고객 주문처", exampleValue: `고객 주문처: ${senderName} 수기`, x: 10, y: 78, width: 200, height: 18, fontSize: scaleFont(11), isBold: false, type: "text" },
    { fieldKey: "order_number", label: "주문번호", exampleValue: "주문번호: 645675", x: 10, y: 101, width: 150, height: 18, fontSize: scaleFont(11), isBold: false, type: "text" },
    { fieldKey: "package_info", label: "중량/용적/요금", exampleValue: "중량:2kg 용적:60cm 요금: 신용 0", x: 10, y: 124, width: 250, height: 18, fontSize: scaleFont(11), isBold: false, type: "text" },
    { fieldKey: "zipcode_barcode", label: "우편번호 바코드", exampleValue: "41100", x: 10, y: 150, width: 120, height: 60, fontSize: scaleFont(12), isBold: false, type: "barcode" },
    { fieldKey: "total_quantity", label: "총 개수", exampleValue: "[총 1개]", x: 140, y: 155, width: 80, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
    { fieldKey: "items_list", label: "상품 리스트", exampleValue: "1. 거래물품-1개", x: 10, y: 220, width: 250, height: 150, fontSize: scaleFont(13), isBold: false, type: "text" },
    
    // 우측 열 - 보내는 분
    { fieldKey: "sender_address", label: "보내는 분 주소", exampleValue: senderAddress, x: labelWidth * 0.43, y: 95, width: labelWidth * 0.55, height: 40, fontSize: scaleFont(13), isBold: false, type: "text" },
    { fieldKey: "sender_name", label: "보내는 분 이름", exampleValue: senderName, x: labelWidth * 0.43, y: 140, width: 100, height: 20, fontSize: scaleFont(13), isBold: false, type: "text" },
    { fieldKey: "sender_phone", label: "보내는 분 전화", exampleValue: senderPhone, x: labelWidth * 0.43 + 110, y: 140, width: 120, height: 20, fontSize: scaleFont(13), isBold: false, type: "text" },
    
    // 우측 열 - 받는 분 (크고 진하게)
    { fieldKey: "receiver_address", label: "받는 분 주소", exampleValue: "대구 동구 안심로 188 (신기동) 3층", x: labelWidth * 0.43, y: 170, width: labelWidth * 0.55, height: 40, fontSize: scaleFont(16), isBold: true, type: "text" },
    { fieldKey: "receiver_name", label: "받는 분 이름", exampleValue: "테스트", x: labelWidth * 0.43, y: 220, width: 100, height: 22, fontSize: scaleFont(14), isBold: true, type: "text" },
    { fieldKey: "receiver_phone", label: "받는 분 전화", exampleValue: "01027239490", x: labelWidth * 0.43 + 110, y: 220, width: 120, height: 22, fontSize: scaleFont(14), isBold: true, type: "text" },
    
    { fieldKey: "tracking_no_text", label: "등기번호 (텍스트)", exampleValue: "등기번호: 60914-8600-5658", x: labelWidth * 0.43, y: 255, width: 250, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
    { fieldKey: "waybill_statement", label: "송장 문구", exampleValue: "모두의수선에서 제공되는 서비스입니다.", x: labelWidth * 0.43, y: 280, width: 300, height: 20, fontSize: scaleFont(12), isBold: true, type: "text" },
    { fieldKey: "tracking_no_barcode", label: "등기번호 바코드", exampleValue: "60914-8600-5658", x: labelWidth * 0.43, y: 305, width: 280, height: 70, fontSize: scaleFont(12), isBold: false, type: "barcode" },
    
    // 하단
    { fieldKey: "bottom_info", label: "하단 정보", exampleValue: "[총 1개] [2회 재출력]", x: 10, y: labelHeight - 25, width: 200, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
  ];
};

export default function LabelEditorPage() {
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [editingElement, setEditingElement] = useState<LabelElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabelElement | null>(null);
  const [draggingElement, setDraggingElement] = useState<LabelElement | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizingElement, setResizingElement] = useState<LabelElement | null>(null); // 크기 조절 상태
  const [resizeStartSize, setResizeStartSize] = useState<{ width: number; height: number } | null>(null); // 리사이즈 시작 크기
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null); // 리사이즈 시작 마우스 위치
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingLayout, setIsLoadingLayout] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null); // 회사 정보
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelAreaRef = useRef<HTMLDivElement>(null);

  // Supabase에서 배경 이미지 및 회사 정보 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 배경 이미지 로드
        const bgResponse = await fetch("/api/admin/settings/label-background");
        const bgData = await bgResponse.json();
        if (bgData.success && bgData.backgroundImageUrl) {
          setBackgroundImageUrl(bgData.backgroundImageUrl);
        }

        // 회사 정보 로드
        const companyResponse = await fetch("/api/admin/settings/company-info");
        const companyData = await companyResponse.json();
        if (companyData.success && companyData.data) {
          setCompanyInfo(companyData.data);
          console.log("🏢 회사 정보 로드 완료:", companyData.data);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      }
    };

    loadData();
  }, []);

  // 배경 이미지 업로드 및 저장
  const handleBackgroundImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/settings/label-background/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        setBackgroundImageUrl(data.url);
      } else {
        const errorMsg = data.error || "알 수 없는 오류";
        if (data.needsMigration) {
          alert(`업로드 실패: ${errorMsg}\n\nSupabase SQL Editor에서 다음 SQL을 실행해주세요:\n\nALTER TABLE company_info ADD COLUMN IF NOT EXISTS label_background_image_url TEXT;`);
        } else {
          alert(`업로드 실패: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error("업로드 오류:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  // 배경 이미지 제거
  const handleBackgroundImageRemove = async () => {
    try {
      const response = await fetch("/api/admin/settings/label-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backgroundImageUrl: null }),
      });

      const data = await response.json();
      
      if (data.success) {
        setBackgroundImageUrl("");
      } else {
        alert(`제거 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      console.error("제거 오류:", error);
      alert("배경 이미지 제거 중 오류가 발생했습니다.");
    }
  };

  // 캔버스 크기 계산 및 초기 레이아웃 로드
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        // 캔버스를 더 크게 만들기 위해 화면 너비의 80% 사용
        const availableWidth = Math.min(canvasRef.current.offsetWidth - 40, window.innerWidth * 0.8);
        const aspectRatio = LABEL_WIDTH_MM / LABEL_HEIGHT_MM; // 가로형: 171/111
        // 최소 크기 보장 (최소 800px 너비)
        const width = Math.max(availableWidth, 800);
        const height = width / aspectRatio;
        const newSize = { width, height };
        setCanvasSize(newSize);
        
        // 초기 레이아웃은 회사 정보가 로드된 후 별도 useEffect에서 설정
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // 회사 정보가 로드되면 초기 레이아웃 설정
  useEffect(() => {
    if (canvasSize && !isInitialized && companyInfo !== null) {
      // companyInfo가 null이 아니면 (로드 완료 또는 없음) 초기 레이아웃 설정
      const initialLayout = getInitialLayout(canvasSize.width, canvasSize.height, companyInfo);
      setElements(initialLayout);
      setIsInitialized(true);
    }
  }, [canvasSize, companyInfo, isInitialized]);

  // 요소 추가
  const addElement = (config: FieldConfig) => {
    const newElement: LabelElement = {
      ...config,
      x: 50,
      y: 50,
      width: config.type === "barcode" ? 200 : config.exampleValue.length * config.fontSize * 0.6,
      height: config.type === "barcode" ? 60 : config.fontSize * 1.5,
      editable: config.fieldKey === "waybill_statement" || config.fieldKey === "output_label" ? true : false,
    };
    setElements([...elements, newElement]);
  };

  // 요소 선택
  const handleElementClick = (e: React.MouseEvent, element: LabelElement) => {
    // 버튼, textarea, input 클릭 시 선택 방지
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('textarea') || target.closest('input')) {
      return;
    }
    
    // 더블클릭이 아닐 때만 선택
    if (e.detail === 2) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setSelectedElement(element);
  };

  // 키보드로 요소 이동
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!selectedElement || editingElement === selectedElement || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const labelAreaLeft = mmToPx(5);
      const labelAreaTop = mmToPx(5);
      const labelAreaWidth = rect.width - mmToPx(10);
      const labelAreaHeight = rect.height - mmToPx(10);

      let newX = selectedElement.x;
      let newY = selectedElement.y;
      const step = e.shiftKey ? 10 : 1; // Shift 키를 누르면 10px씩 이동

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          e.stopPropagation();
          newX = Math.max(labelAreaLeft, selectedElement.x - step);
          break;
        case "ArrowRight":
          e.preventDefault();
          e.stopPropagation();
          newX = Math.min(labelAreaLeft + labelAreaWidth - selectedElement.width, selectedElement.x + step);
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          newY = Math.max(labelAreaTop, selectedElement.y - step);
          break;
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          newY = Math.min(labelAreaTop + labelAreaHeight - selectedElement.height, selectedElement.y + step);
          break;
        case "Escape":
          e.preventDefault();
          setSelectedElement(null);
          return;
        default:
          return;
      }

      const updatedElement = { ...selectedElement, x: newX, y: newY };
      
      setElements((prev) =>
        prev.map((el) => {
          if (el === selectedElement) {
            return updatedElement;
          }
          return el;
        })
      );
      
      // 선택된 요소 업데이트
      setSelectedElement(updatedElement);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedElement, editingElement]);

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent, element: LabelElement) => {
    // 입력 모드가 활성화되어 있으면 드래그 방지
    if (editingElement === element) return;
    
    // 버튼, textarea, input 클릭 시 드래그 방지
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('textarea') || target.closest('input')) {
      return;
    }
    
    if (!labelAreaRef.current) return;

    // 더블클릭이 아닐 때만 드래그 시작
    if (e.detail === 2) {
      return;
    }

    const rect = labelAreaRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    setSelectedElement(element);
    setDraggingElement(element);
    setDragOffset({
      x: localX - element.x,
      y: localY - element.y,
    });
  };

  // 드래그 중 (전역 이벤트로 처리)
  useEffect(() => {
    if (!draggingElement || !dragOffset || !labelAreaRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const rect = labelAreaRef.current!.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      
      // 송장 영역 크기
      const labelWidth = rect.width;
      const labelHeight = rect.height;
      
      // 송장 영역 내에서만 이동 가능하도록 제한 (0 ~ width/height)
      const newX = Math.max(0, Math.min(localX - dragOffset.x, labelWidth - draggingElement.width));
      const newY = Math.max(0, Math.min(localY - dragOffset.y, labelHeight - draggingElement.height));

      setElements((prev) =>
        prev.map((el) => {
          // 참조 동등성 문제 해결을 위해 fieldKey로 비교
          if (el.fieldKey === draggingElement.fieldKey) {
            return { ...el, x: newX, y: newY };
          }
          return el;
        })
      );
    };

    const handleMouseUp = () => {
      setDraggingElement(null);
      setDragOffset(null);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingElement, dragOffset]);

  // 크기 조절 시작
  const handleResizeStart = (e: React.MouseEvent, element: LabelElement) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!labelAreaRef.current) return;
    
    setResizingElement(element);
    setResizeStartSize({ width: element.width, height: element.height });
    setResizeStartPos({ x: e.clientX, y: e.clientY });
  };

  // 크기 조절 중 (전역 이벤트로 처리)
  useEffect(() => {
    if (!resizingElement || !resizeStartSize || !resizeStartPos || !labelAreaRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      const newWidth = Math.max(20, resizeStartSize.width + deltaX);
      const newHeight = Math.max(10, resizeStartSize.height + deltaY);

      setElements((prev) =>
        prev.map((el) => {
          if (el.fieldKey === resizingElement.fieldKey) {
            return { ...el, width: newWidth, height: newHeight };
          }
          return el;
        })
      );
    };

    const handleMouseUp = () => {
      setResizingElement(null);
      setResizeStartSize(null);
      setResizeStartPos(null);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingElement, resizeStartSize, resizeStartPos]);

  // 요소 삭제
  const deleteElement = (element: LabelElement) => {
    if (confirm(`"${element.label}" 요소를 삭제하시겠습니까?`)) {
      setElements((prev) => prev.filter((el) => el !== element));
    }
  };

  // 요소 수정 (더블클릭)
  const startEditing = (element: LabelElement) => {
    setEditingElement(element);
  };

  // 수정 완료
  const finishEditing = (updatedElement: LabelElement) => {
    setElements((prev) =>
      prev.map((el) => (el === editingElement ? updatedElement : el))
    );
    setEditingElement(null);
  };

  // 실제 데이터 매핑 함수 (PDF 생성 시 사용)
  const mapFieldToActualValue = (fieldKey: string, orderData: any): string => {
    // ... (mapFieldToActualValue 구현은 동일)
    return "";
  };

  // 저장
  const handleSave = () => {
    if (!canvasSize) return;

    const scaleFactor = canvasSize.width / mmToPx(LABEL_WIDTH_MM);

    const layoutData = elements.map((element) => {
      const xMm = pxToMm(element.x / scaleFactor);
      const yMm = pxToMm(element.y / scaleFactor);
      const widthMm = pxToMm(element.width / scaleFactor);
      const heightMm = pxToMm(element.height / scaleFactor);

      return {
        fieldKey: element.fieldKey,
        x: xMm,
        y: yMm,
        width: widthMm,
        height: heightMm,
        fontSize: element.fontSize,
        isBold: element.isBold,
        borderColor: element.borderColor,
        letterSpacing: element.letterSpacing, // 자간 저장
        type: element.type, // "text" 또는 "barcode"
      };
    });

    // 서버에 레이아웃 저장
    const saveLayout = async () => {
      try {
        const response = await fetch("/api/admin/settings/label-layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: layoutData }),
        });

        const result = await response.json();
        
        if (result.success) {
          alert("✅ 레이아웃이 저장되었습니다. 실제 송장 인쇄에 반영됩니다.");
        } else {
          if (result.needsMigration) {
            alert(`⚠️ 저장 실패: ${result.error}\n\nSupabase Dashboard → Table Editor → company_info → Add Column → label_layout_config (text) 추가해주세요.`);
          } else {
            alert(`❌ 저장 실패: ${result.error || "알 수 없는 오류"}`);
          }
        }
      } catch (error) {
        console.error("저장 오류:", error);
        alert("레이아웃 저장 중 오류가 발생했습니다.");
      }
    };

    saveLayout();
  };

  // 기본 양식 불러오기 (초기 레이아웃으로 리셋)
  const handleLoadDefaultLayout = () => {
    if (!confirm("기본 양식으로 되돌리시겠습니까? 현재 레이아웃은 저장되지 않습니다.")) {
      return;
    }
    
    if (canvasSize) {
      const defaultLayout = getInitialLayout(canvasSize.width, canvasSize.height, companyInfo);
      setElements(defaultLayout);
      setIsInitialized(true);
      alert("기본 양식이 로드되었습니다.");
    }
  };

  // 저장된 양식 불러오기
  const handleLoadSavedLayout = async () => {
    setIsLoadingLayout(true);
    try {
      const response = await fetch("/api/admin/settings/label-layout");
      const data = await response.json();
      
      if (data.success && data.layout && data.layout.length > 0) {
        if (canvasSize) {
          const scaleFactor = canvasSize.width / mmToPx(LABEL_WIDTH_MM);
          const loadedElements = data.layout.map((el: any) => {
            // DEFAULT_FIELDS에서 label과 exampleValue 복원
            const defaultField = DEFAULT_FIELDS.find(f => f.fieldKey === el.fieldKey);
            
            return {
              ...el,
              label: defaultField?.label || el.label || el.fieldKey,
              exampleValue: defaultField?.exampleValue || el.exampleValue || "",
              editable: el.fieldKey === "waybill_statement" || el.fieldKey === "output_label" ? true : false,
              x: mmToPx(el.x) * scaleFactor,
              y: mmToPx(el.y) * scaleFactor,
              width: mmToPx(el.width) * scaleFactor,
              height: mmToPx(el.height) * scaleFactor,
            };
          });
          setElements(loadedElements);
          setIsInitialized(true);
          alert("저장된 양식이 로드되었습니다.");
        }
      } else {
        alert("저장된 양식이 없습니다.");
      }
    } catch (error) {
      console.error("양식 로드 실패:", error);
      alert("양식 로드 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingLayout(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">우체국 송장 레이아웃 에디터</h1>
            <p className="text-sm text-gray-500 mt-1">C형 송장 (가로형: 171mm × 111mm) 레이아웃 편집</p>
            <p className="text-xs text-gray-400 mt-1">
          💡 요소 클릭 후 방향키(←→↑↓)로 이동, Shift+방향키로 10px씩 이동, 드래그로 이동, 더블클릭으로 수정
        </p>
        {backgroundImageUrl && (
          <p className="text-xs text-green-600 mt-1">
            ✅ 배경 이미지가 로드되었습니다
          </p>
        )}
          </div>
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              isUploading 
                ? "bg-gray-300 cursor-not-allowed" 
                : "bg-gray-100 hover:bg-gray-200"
            }`}>
              <ImageIcon className="h-4 w-4" />
              <span className="text-sm">{isUploading ? "업로드 중..." : "배경 이미지"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleBackgroundImageUpload(file);
                  }
                }}
              />
            </label>
            {backgroundImageUrl && (
              <button
                onClick={handleBackgroundImageRemove}
                disabled={isUploading}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                배경 제거
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* 캔버스 영역 */}
        <div className="flex-1 flex items-start justify-center bg-gray-100 rounded-lg p-4 mb-4 overflow-auto">
          <div
            ref={canvasRef}
            className="relative bg-gray-200 rounded border-2 border-gray-300"
            style={{
              width: canvasSize?.width || 800,
              height: canvasSize?.height || 520,
              minWidth: 800,
            }}
          >
            {/* 실제 송장 영역 (배경 이미지 포함) */}
            <div
              ref={labelAreaRef}
              className="absolute bg-white"
              style={{
                left: mmToPx(5),
                top: mmToPx(5),
                width: canvasSize ? canvasSize.width - mmToPx(10) : 0,
                height: canvasSize ? canvasSize.height - mmToPx(10) : 0,
                backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : "none",
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                position: "relative",
              }}
            >
              {/* 배치된 요소들 */}
              {elements.map((element, index) => (
                <div
                  key={`${element.fieldKey}-${index}`}
                  className="absolute group"
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    opacity: draggingElement === element ? 0.7 : editingElement === element ? 0.8 : 1,
                    border: selectedElement === element
                      ? "2px solid #3b82f6"
                      : draggingElement === element 
                      ? "2px solid #3b82f6" 
                      : editingElement === element
                      ? "2px solid #10b981"
                      : "1px dashed transparent",
                    zIndex: draggingElement === element || editingElement === element || selectedElement === element ? 10 : 1,
                    cursor: editingElement === element ? "default" : "move",
                    userSelect: "none",
                    outline: selectedElement === element ? "2px solid #3b82f6" : "none",
                    outlineOffset: "2px",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleElementClick(e, element);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleElementClick(e, element);
                    handleMouseDown(e, element);
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (editingElement !== element && !draggingElement && element.editable !== false) {
                      startEditing(element);
                    }
                  }}
                  title={`${element.label} - 클릭: 선택, 방향키/드래그: 이동, 더블클릭: 수정${element.editable !== false ? '' : ' (수정 불가)'}, ×버튼: 삭제`}
                  tabIndex={selectedElement === element ? 0 : -1}
                >
                  {/* 삭제 버튼 (호버 시 표시) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteElement(element);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold z-20 hover:bg-red-600 shadow-lg"
                    title="삭제"
                  >
                    ×
                  </button>
                  
                  {/* 수정 버튼 (수정 가능한 경우만 표시) */}
                  {editingElement !== element && element.editable !== false && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startEditing(element);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold z-20 hover:bg-blue-600 shadow-lg"
                      title="수정"
                    >
                      ✎
                    </button>
                  )}
                  
                  {/* 수정 불가 표시 */}
                  {element.editable === false && (
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold z-20"
                      title="수정 불가 (DB/API 값)">
                      🔒
                    </div>
                  )}
                  
                  {/* 크기 조절 핸들 (우측 하단) */}
                  {!editingElement && !resizingElement && (
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-sm opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-nwse-resize z-20 border border-white shadow-md"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleResizeStart(e, element);
                      }}
                      title="크기 조절 (드래그)"
                    />
                  )}
                  
                  {editingElement === element ? (
                    <div 
                      className="w-full h-full bg-green-50 border-2 border-green-500 p-2 rounded relative z-30"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs text-green-700 mb-1 font-semibold">수정 중: {element.label}</div>
                      <textarea
                        value={element.exampleValue}
                        onChange={(e) => {
                          const updated = { ...element, exampleValue: e.target.value };
                          setElements((prev) =>
                            prev.map((el) => (el === editingElement ? updated : el))
                          );
                        }}
                        onBlur={(e) => {
                          // 버튼 클릭 시에는 blur 무시
                          const relatedTarget = e.relatedTarget as HTMLElement;
                          if (relatedTarget && (relatedTarget.closest('button') || relatedTarget.tagName === 'BUTTON')) {
                            e.preventDefault();
                            return;
                          }
                          // 약간의 지연을 두어 버튼 클릭 이벤트가 먼저 처리되도록
                          setTimeout(() => {
                            setEditingElement(null);
                          }, 200);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingElement(null);
                          }
                          // Enter만으로는 저장하지 않음 (Shift+Enter는 줄바꿈)
                          if (e.key === "Enter" && e.ctrlKey) {
                            e.preventDefault();
                            setEditingElement(null);
                          }
                          // 다른 키 입력은 이벤트 전파 방지
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-full text-sm border border-green-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        style={{ fontSize: `${element.fontSize}px`, minHeight: `${element.height}px` }}
                        autoFocus
                        rows={element.type === "barcode" ? 1 : Math.max(1, Math.ceil(element.height / element.fontSize / 1.5))}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500">Ctrl+Enter: 저장, Esc: 취소</div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingElement(null);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : element.type === "barcode" ? (
                    <div className="w-full h-full border border-black flex flex-col items-center justify-center bg-white relative">
                      <div className="flex gap-0.5 mb-1">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div
                            key={i}
                            className={`bg-black ${i % 3 === 0 ? "w-0.5" : "w-px"}`}
                            style={{ height: "60%" }}
                          />
                        ))}
                      </div>
                      <span className="text-xs">{element.exampleValue}</span>
                      <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-[8px] px-1 rounded">
                        바코드
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-full h-full flex items-center px-1"
                      style={{
                        fontSize: `${element.fontSize}px`,
                        fontWeight: element.isBold ? "bold" : "normal",
                        border: element.borderColor ? `2px solid ${element.borderColor}` : "none",
                        padding: element.borderColor ? "4px" : "0",
                        letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : "normal",
                        whiteSpace: "pre-wrap", // 줄바꿈 허용
                        wordBreak: "break-word", // 긴 단어 줄바꿈
                        overflow: "visible", // 영역 넘어가면 표시
                      }}
                    >
                      {element.exampleValue}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 선택된 요소 속성 편집 패널 */}
        {selectedElement && !editingElement && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              선택된 요소: {selectedElement.label}
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  폰트 크기 (px)
                </label>
                <input
                  type="number"
                  value={Math.round(selectedElement.fontSize)}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value) || 10;
                    setElements((prev) =>
                      prev.map((el) =>
                        el.fieldKey === selectedElement.fieldKey
                          ? { ...el, fontSize: newSize }
                          : el
                      )
                    );
                    setSelectedElement({ ...selectedElement, fontSize: newSize });
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  min="8"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  자간 (px)
                </label>
                <input
                  type="number"
                  value={selectedElement.letterSpacing || 0}
                  onChange={(e) => {
                    const newSpacing = parseInt(e.target.value) || 0;
                    setElements((prev) =>
                      prev.map((el) =>
                        el.fieldKey === selectedElement.fieldKey
                          ? { ...el, letterSpacing: newSpacing }
                          : el
                      )
                    );
                    setSelectedElement({ ...selectedElement, letterSpacing: newSpacing });
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  min="0"
                  max="30"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedElement.isBold}
                    onChange={(e) => {
                      const newBold = e.target.checked;
                      setElements((prev) =>
                        prev.map((el) =>
                          el.fieldKey === selectedElement.fieldKey
                            ? { ...el, isBold: newBold }
                            : el
                        )
                      );
                      setSelectedElement({ ...selectedElement, isBold: newBold });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">굵게</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  너비 (px)
                </label>
                <input
                  type="number"
                  value={Math.round(selectedElement.width)}
                  onChange={(e) => {
                    const newWidth = parseInt(e.target.value) || 20;
                    setElements((prev) =>
                      prev.map((el) =>
                        el.fieldKey === selectedElement.fieldKey
                          ? { ...el, width: newWidth }
                          : el
                      )
                    );
                    setSelectedElement({ ...selectedElement, width: newWidth });
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  min="20"
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              💡 폰트 크기, 자간, 굵기, 너비를 조절할 수 있습니다. 크기 조절은 우측 하단 녹색 핸들을 드래그하세요.
            </div>
          </div>
        )}

        {/* 저장 버튼 영역 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleBackgroundImageUpload(e.target.files[0]);
                  }
                }} disabled={isUploading} />
                {isUploading ? "업로드 중..." : "배경 이미지"}
              </label>
              {backgroundImageUrl && (
                <button
                  onClick={handleBackgroundImageRemove}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  disabled={isUploading}
                >
                  배경 제거
                </button>
              )}
            </div>
          </div>
          
          {/* 양식 관리 버튼들 */}
          <div className="flex gap-3 items-center border-t pt-4">
            <div className="flex gap-2">
              <button
                onClick={handleLoadDefaultLayout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                title="기본 양식으로 되돌리기"
              >
                <RotateCcw className="h-4 w-4" />
                기본 양식 불러오기
              </button>
              <button
                onClick={handleLoadSavedLayout}
                disabled={isLoadingLayout}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="저장된 양식 불러오기"
              >
                <Download className="h-4 w-4" />
                {isLoadingLayout ? "로딩 중..." : "저장된 양식 불러오기"}
              </button>
            </div>
            <div className="flex-1"></div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Save className="h-5 w-5" />
              레이아웃 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
