"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Edit, Trash2, Check, X, Truck, AlertCircle,
  Save, ToggleLeft, ToggleRight, Info
} from "lucide-react";

const DEFAULT_BASE_SHIPPING_FEE = 7000;
const DEFAULT_REMOTE_AREA_FEE = 400;
const DEFAULT_RETURN_SHIPPING_FEE = 7000;

interface ShippingSettings {
  id: number;
  base_shipping_fee: number;
  remote_area_fee: number;
  return_shipping_fee: number;
  updated_at: string;
}

type PromotionType = "FIRST_ORDER" | "FREE_ABOVE_AMOUNT" | "PERCENTAGE_OFF" | "FIXED_DISCOUNT";
type DiscountType = "PERCENTAGE" | "FIXED";

interface ShippingPromotion {
  id: string;
  name: string;
  type: PromotionType;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  description: string | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  FIRST_ORDER: "첫 주문 혜택",
  FREE_ABOVE_AMOUNT: "일정 금액 이상 무료",
  PERCENTAGE_OFF: "기간 할인 (%)",
  FIXED_DISCOUNT: "기간 할인 (고정액)",
};

const PROMOTION_TYPE_DESCS: Record<PromotionType, string> = {
  FIRST_ORDER: "첫 주문 고객에게 배송비 할인 제공",
  FREE_ABOVE_AMOUNT: "수선비가 설정 금액 이상이면 배송비 할인",
  PERCENTAGE_OFF: "설정 기간 동안 배송비 X% 할인",
  FIXED_DISCOUNT: "설정 기간 동안 배송비 고정 금액 할인",
};

const emptyForm = {
  name: "",
  type: "FIRST_ORDER" as PromotionType,
  discount_type: "PERCENTAGE" as DiscountType,
  discount_value: 100,
  min_order_amount: 0,
  max_discount_amount: "",
  description: "",
  is_active: true,
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: "",
};

export default function ShippingSettingsPage() {
  // 로그인 세션(쿠키)을 공유하는 SSR-aware 클라이언트.
  // 기존 lib/supabase의 단순 createClient는 세션을 localStorage에서만 찾기 때문에
  // 로그인된 admin이 anon으로 인식되어 RLS에 차단되는 문제가 있었음.
  const supabase = useMemo(() => createClient(), []);
  const [promotions, setPromotions] = useState<ShippingPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<ShippingPromotion | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // 글로벌 배송비 설정
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    base_shipping_fee: DEFAULT_BASE_SHIPPING_FEE,
    remote_area_fee: DEFAULT_REMOTE_AREA_FEE,
    return_shipping_fee: DEFAULT_RETURN_SHIPPING_FEE,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);

  // 현재 화면에서 사용할 기본 배송비 (할인% 미리보기 등)
  const baseShippingFee = settings?.base_shipping_fee ?? DEFAULT_BASE_SHIPPING_FEE;

  useEffect(() => {
    loadPromotions();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("shipping_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const row = data as unknown as ShippingSettings;
        setSettings(row);
        setSettingsForm({
          base_shipping_fee: row.base_shipping_fee,
          remote_area_fee: row.remote_area_fee,
          return_shipping_fee: row.return_shipping_fee,
        });
      }
    } catch (e) {
      console.warn("배송비 설정 불러오기 실패:", e);
    }
  };

  const handleSaveSettings = async () => {
    if (settingsForm.base_shipping_fee < 0 || settingsForm.remote_area_fee < 0 || settingsForm.return_shipping_fee < 0) {
      alert("0 이상의 값을 입력해주세요.");
      return;
    }
    setIsSavingSettings(true);
    try {
      const payload = {
        id: 1,
        base_shipping_fee: Math.round(settingsForm.base_shipping_fee),
        remote_area_fee: Math.round(settingsForm.remote_area_fee),
        return_shipping_fee: Math.round(settingsForm.return_shipping_fee),
      };
      const { data, error } = await (supabase
        .from("shipping_settings") as any)
        .upsert(payload, { onConflict: "id" })
        .select();
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error("권한이 없거나 RLS 정책에 의해 차단되었습니다 (0행 변경)");
      }
      setSettingsSavedAt(Date.now());
      await loadSettings();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "저장 실패";
      console.error("[shipping_settings save] failed:", e);
      alert(`설정 저장 실패: ${msg}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const loadPromotions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("shipping_promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPromotions(data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "불러오기 실패";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPromotion(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (promo: ShippingPromotion) => {
    setEditingPromotion(promo);
    setFormData({
      name: promo.name,
      type: promo.type,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_order_amount: promo.min_order_amount,
      max_discount_amount: promo.max_discount_amount?.toString() ?? "",
      description: promo.description ?? "",
      is_active: promo.is_active,
      valid_from: promo.valid_from.slice(0, 16),
      valid_until: promo.valid_until ? promo.valid_until.slice(0, 16) : "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { alert("이름을 입력해주세요."); return; }
    if (formData.discount_value < 0) { alert("할인값을 확인해주세요."); return; }
    if (formData.discount_type === "PERCENTAGE" && formData.discount_value > 100) {
      alert("비율 할인은 0~100% 사이여야 합니다."); return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_order_amount: Number(formData.min_order_amount) || 0,
        max_discount_amount: formData.max_discount_amount
          ? Number(formData.max_discount_amount)
          : null,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until
          ? new Date(formData.valid_until).toISOString()
          : null,
      };

      if (editingPromotion) {
        const { data, error } = await supabase
          .from("shipping_promotions")
          .update(payload)
          .eq("id", editingPromotion.id)
          .select();
        if (error) throw error;
        if (!data || (Array.isArray(data) && data.length === 0)) {
          throw new Error("권한이 없거나 RLS 정책에 의해 차단되었습니다 (0행 변경)");
        }
      } else {
        const { data, error } = await supabase
          .from("shipping_promotions")
          .insert(payload)
          .select();
        if (error) throw error;
        if (!data || (Array.isArray(data) && data.length === 0)) {
          throw new Error("권한이 없거나 RLS 정책에 의해 차단되었습니다 (0행 변경)");
        }
      }

      setShowModal(false);
      await loadPromotions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "저장 실패";
      console.error("[shipping_promotions save] failed:", e);
      alert(`저장 실패: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { data, error } = await supabase
        .from("shipping_promotions")
        .update({ is_active: !current })
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error("권한이 없거나 RLS 정책에 의해 차단되었습니다 (0행 변경)");
      }
      await loadPromotions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "상태 변경 실패";
      console.error("[shipping_promotions toggle] failed:", e);
      alert(`상태 변경 실패: ${msg}`);
    }
  };

  const deletePromotion = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      const { data, error } = await supabase
        .from("shipping_promotions")
        .delete()
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error("권한이 없거나 RLS 정책에 의해 차단되었습니다 (0행 변경)");
      }
      await loadPromotions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "삭제 실패";
      console.error("[shipping_promotions delete] failed:", e);
      alert(`삭제 실패: ${msg}`);
    }
  };

  const formatDiscount = (promo: ShippingPromotion) => {
    const base = baseShippingFee;
    if (promo.discount_type === "PERCENTAGE") {
      const discountAmt = Math.round(base * promo.discount_value / 100);
      return `${promo.discount_value}% 할인 (${discountAmt.toLocaleString()}원↓)`;
    }
    return `${promo.discount_value.toLocaleString()}원 할인`;
  };

  const formatValidity = (promo: ShippingPromotion) => {
    const from = new Date(promo.valid_from).toLocaleDateString("ko-KR");
    if (!promo.valid_until) return `${from} ~`;
    return `${from} ~ ${new Date(promo.valid_until).toLocaleDateString("ko-KR")}`;
  };

  const activeCount = promotions.filter((p) => p.is_active).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">배송비 관리</h1>
            <p className="text-sm text-gray-500 mt-0.5">왕복배송비 기본 정책 및 프로모션 설정</p>
          </div>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          프로모션 추가
        </Button>
      </div>

      {/* 기본 배송비 정책 카드 (편집 가능) */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            기본 배송비 정책
          </CardTitle>
          <CardDescription>
            여기서 변경한 값이 웹/모바일의 주문 화면, 결제 페이지, 도서산간 추가비 계산에 즉시 반영됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">왕복배송비 (기본)</Label>
              <div className="flex items-center gap-1 mt-1">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={settingsForm.base_shipping_fee}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, base_shipping_fee: Number(e.target.value) }))
                  }
                />
                <span className="text-sm text-gray-500 shrink-0">원</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">도서산간 추가배송비 (편도 단가)</Label>
              <div className="flex items-center gap-1 mt-1">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={settingsForm.remote_area_fee}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, remote_area_fee: Number(e.target.value) }))
                  }
                />
                <span className="text-sm text-gray-500 shrink-0">원</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                우체국 편도 기준 단가를 입력하세요. 시스템은 항상 왕복(× 2)으로 부과/차감합니다.
                <br />
                예: 400원 입력 → 결제 시 800원 추가, 취소 시 800원 차감.
              </p>
            </div>
            <div>
              <Label className="text-xs">반송 차감 배송비</Label>
              <div className="flex items-center gap-1 mt-1">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={settingsForm.return_shipping_fee}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, return_shipping_fee: Number(e.target.value) }))
                  }
                />
                <span className="text-sm text-gray-500 shrink-0">원</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {settings?.updated_at && (
                <>마지막 수정: {new Date(settings.updated_at).toLocaleString("ko-KR")}</>
              )}
              {settingsSavedAt && Date.now() - settingsSavedAt < 3000 && (
                <span className="ml-2 text-green-600 font-medium">✓ 저장 완료</span>
              )}
            </p>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSavingSettings ? "저장 중..." : "기본 설정 저장"}
            </Button>
          </div>
          <div className="flex items-start gap-2 pt-2 border-t border-blue-100">
            <span className="text-lg">💡</span>
            <p className="text-sm text-gray-600 leading-relaxed">
              왕복배송비({baseShippingFee.toLocaleString()}원)는 수량과 관계없이 1회 동일하게 부과됩니다.
              <strong>
                {" "}도서산간(편도 {settingsForm.remote_area_fee.toLocaleString()}원
                → 왕복 {(settingsForm.remote_area_fee * 2).toLocaleString()}원
                추가)은 우체국 지정 우편번호일 때 자동 합산됩니다.
              </strong>
            </p>
          </div>
          <div className="bg-blue-100 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-700">
              현재 활성 프로모션: <strong>{activeCount}개</strong>
              {activeCount > 0 && " — 고객 주문 시 자동으로 최적 할인이 적용됩니다."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 에러 */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 프로모션 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">배송비 프로모션 목록</CardTitle>
          <CardDescription>
            활성화된 프로모션은 고객 주문 시 자동 적용됩니다. 여러 프로모션이 중복 적용 가능한 경우 최대 할인이 적용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">등록된 프로모션이 없습니다</p>
              <p className="text-xs mt-1">상단 &apos;프로모션 추가&apos; 버튼을 눌러 첫 프로모션을 만들어보세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className={`border rounded-xl p-4 transition-all ${
                    promo.is_active
                      ? "border-green-200 bg-green-50/30"
                      : "border-gray-200 bg-gray-50/50 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900">{promo.name}</span>
                        <Badge variant={promo.is_active ? "default" : "secondary"} className="text-xs">
                          {promo.is_active ? "활성" : "비활성"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {PROMOTION_TYPE_LABELS[promo.type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700 font-medium">{formatDiscount(promo)}</p>
                      {promo.min_order_amount > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          수선비 {promo.min_order_amount.toLocaleString()}원 이상 적용
                        </p>
                      )}
                      {promo.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{promo.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">유효기간: {formatValidity(promo)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={promo.is_active ? "비활성화" : "활성화"}
                      >
                        {promo.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(promo)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => deletePromotion(promo.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 프로모션 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">
                {editingPromotion ? "프로모션 수정" : "배송비 프로모션 추가"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 이름 */}
              <div>
                <Label>프로모션 이름 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="예: 첫 주문 배송비 무료"
                  className="mt-1"
                />
              </div>

              {/* 유형 */}
              <div>
                <Label>프로모션 유형 *</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(Object.keys(PROMOTION_TYPE_LABELS) as PromotionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, type: t }))}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        formData.type === t
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-800">
                        {PROMOTION_TYPE_LABELS[t]}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{PROMOTION_TYPE_DESCS[t]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 할인 방식 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>할인 방식 *</Label>
                  <div className="flex gap-2 mt-1">
                    {(["PERCENTAGE", "FIXED"] as DiscountType[]).map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setFormData((p) => ({
                          ...p,
                          discount_type: dt,
                          discount_value: dt === "PERCENTAGE" ? 100 : baseShippingFee,
                        }))}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          formData.discount_type === dt
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600"
                        }`}
                      >
                        {dt === "PERCENTAGE" ? "비율 (%)" : "고정 (원)"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>할인 값 *</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, discount_value: Number(e.target.value) }))
                      }
                      min={0}
                      max={formData.discount_type === "PERCENTAGE" ? 100 : undefined}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500 shrink-0">
                      {formData.discount_type === "PERCENTAGE" ? "%" : "원"}
                    </span>
                  </div>
                  {formData.discount_type === "PERCENTAGE" && (
                    <p className="text-xs text-gray-400 mt-1">
                      실제 할인: {Math.round(baseShippingFee * formData.discount_value / 100).toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>

              {/* 최소 수선비 */}
              {formData.type === "FREE_ABOVE_AMOUNT" && (
                <div>
                  <Label>최소 수선비 (이상일 때 적용)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, min_order_amount: Number(e.target.value) }))
                      }
                      min={0}
                      step={1000}
                      className="flex-1"
                      placeholder="예: 50000"
                    />
                    <span className="text-sm text-gray-500 shrink-0">원 이상</span>
                  </div>
                </div>
              )}

              {/* 최대 할인 금액 */}
              {formData.discount_type === "PERCENTAGE" && formData.discount_value < 100 && (
                <div>
                  <Label>최대 할인 금액 (선택)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, max_discount_amount: e.target.value }))
                      }
                      min={0}
                      className="flex-1"
                      placeholder="비워두면 제한 없음"
                    />
                    <span className="text-sm text-gray-500 shrink-0">원</span>
                  </div>
                </div>
              )}

              {/* 유효기간 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>시작일 *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.valid_from}
                    onChange={(e) => setFormData((p) => ({ ...p, valid_from: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>종료일 (선택)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.valid_until}
                    onChange={(e) => setFormData((p) => ({ ...p, valid_until: e.target.value }))}
                    className="mt-1"
                    placeholder="비워두면 무기한"
                  />
                </div>
              </div>

              {/* 설명 */}
              <div>
                <Label>설명 (선택)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="내부 메모용 설명"
                  className="mt-1"
                />
              </div>

              {/* 활성 여부 */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, is_active: !p.is_active }))}
                  className="flex items-center gap-2"
                >
                  {formData.is_active ? (
                    <ToggleRight className="w-6 h-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {formData.is_active ? "활성 상태 (즉시 적용)" : "비활성 상태"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  "저장 중..."
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingPromotion ? "수정 완료" : "프로모션 추가"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
