"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";

interface PromotionCode {
  id: string;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  valid_from: string;
  valid_until: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionCode | null>(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('promotion_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Loaded promotions:', data);
      setPromotions(data || []);
    } catch (error: any) {
      console.error('프로모션 코드 로드 실패:', error);
      setError(error.message || '프로모션 코드를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promotion_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadPromotions();
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const deletePromotion = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('promotion_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadPromotions();
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '무기한';
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
          <p className="text-red-600">{error}</p>
          <Button onClick={loadPromotions} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">프로모션 코드 관리</h1>
          <p className="text-gray-600 mt-1">이벤트 및 할인 쿠폰을 관리합니다</p>
        </div>
        <Button
          onClick={() => {
            setEditingPromotion(null);
            setShowCreateModal(true);
          }}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          프로모션 코드 생성
        </Button>
      </div>

      {promotions.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500 mb-4">등록된 프로모션 코드가 없습니다</p>
          <Button onClick={() => setShowCreateModal(true)}>
            첫 프로모션 코드 만들기
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    코드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    할인 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용 현황
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유효기간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-mono font-bold text-primary">{promo.code}</div>
                        {promo.description && (
                          <div className="text-sm text-gray-500 mt-1">{promo.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-semibold">
                          {promo.discount_type === 'PERCENTAGE'
                            ? `${promo.discount_value}% 할인`
                            : `${promo.discount_value.toLocaleString()}원 할인`}
                        </div>
                        {promo.min_order_amount > 0 && (
                          <div className="text-xs text-gray-500">
                            최소 주문: {promo.min_order_amount.toLocaleString()}원
                          </div>
                        )}
                        {promo.max_discount_amount && (
                          <div className="text-xs text-gray-500">
                            최대 할인: {promo.max_discount_amount.toLocaleString()}원
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {promo.used_count} / {promo.max_uses || '무제한'}
                        <div className="text-xs text-gray-500">
                          (사용자당 {promo.max_uses_per_user}회)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div>{formatDate(promo.valid_from)}</div>
                        <div className="text-gray-500">
                          ~ {formatDate(promo.valid_until)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          promo.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {promo.is_active ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            활성
                          </>
                        ) : (
                          <>
                            <X className="mr-1 h-3 w-3" />
                            비활성
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPromotion(promo);
                            setShowCreateModal(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePromotion(promo.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <PromotionCodeModal
          promotion={editingPromotion}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPromotion(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingPromotion(null);
            loadPromotions();
          }}
        />
      )}
    </div>
  );
}

interface PromotionCodeModalProps {
  promotion: PromotionCode | null;
  onClose: () => void;
  onSuccess: () => void;
}

function PromotionCodeModal({ promotion, onClose, onSuccess }: PromotionCodeModalProps) {
  const [formData, setFormData] = useState({
    code: promotion?.code || '',
    discount_type: promotion?.discount_type || 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discount_value: promotion?.discount_value || 10,
    max_uses: promotion?.max_uses?.toString() || '',
    max_uses_per_user: promotion?.max_uses_per_user || 1,
    min_order_amount: promotion?.min_order_amount || 0,
    max_discount_amount: promotion?.max_discount_amount?.toString() || '',
    valid_from: promotion?.valid_from 
      ? new Date(promotion.valid_from).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    valid_until: promotion?.valid_until 
      ? new Date(promotion.valid_until).toISOString().slice(0, 16)
      : '',
    description: promotion?.description || '',
    is_active: promotion?.is_active ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: any = {
        code: formData.code.toUpperCase().trim(),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        max_uses_per_user: Number(formData.max_uses_per_user),
        min_order_amount: Number(formData.min_order_amount),
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      let error;
      if (promotion) {
        const result = await supabase
          .from('promotion_codes')
          .update(data)
          .eq('id', promotion.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('promotion_codes')
          .insert(data);
        error = result.error;
      }

      if (error) throw error;

      alert(promotion ? '프로모션 코드가 수정되었습니다.' : '프로모션 코드가 생성되었습니다.');
      onSuccess();
    } catch (error: any) {
      console.error('저장 실패:', error);
      alert(`저장 실패: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {promotion ? '프로모션 코드 수정' : '프로모션 코드 생성'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              프로모션 코드 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="예: WELCOME2024"
              className="w-full px-3 py-2 border rounded-lg uppercase font-mono"
              disabled={!!promotion}
            />
            <p className="text-xs text-gray-500 mt-1">영문, 숫자만 가능 (자동으로 대문자로 변환됩니다)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              할인 타입 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="discount_type"
                  value="PERCENTAGE"
                  checked={formData.discount_type === 'PERCENTAGE'}
                  onChange={() => setFormData({ ...formData, discount_type: 'PERCENTAGE' })}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">퍼센트 할인 (%)</div>
                  <div className="text-xs text-gray-500">예: 10% 할인</div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="discount_type"
                  value="FIXED"
                  checked={formData.discount_type === 'FIXED'}
                  onChange={() => setFormData({ ...formData, discount_type: 'FIXED' })}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">고정 금액 할인 (원)</div>
                  <div className="text-xs text-gray-500">예: 5,000원 할인</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              할인 값 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                max={formData.discount_type === 'PERCENTAGE' ? 100 : undefined}
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg pr-12"
              />
              <div className="absolute right-3 top-2.5 text-gray-500">
                {formData.discount_type === 'PERCENTAGE' ? '%' : '원'}
              </div>
            </div>
            {formData.discount_type === 'PERCENTAGE' && formData.discount_value === 100 && (
              <p className="text-xs text-green-600 mt-1">✅ 100% 할인 = 무료로 사용 가능</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">최소 주문 금액 (원)</label>
              <input
                type="number"
                min="0"
                value={formData.min_order_amount}
                onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">최대 할인 금액 (원)</label>
              <input
                type="number"
                min="0"
                value={formData.max_discount_amount}
                onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="무제한"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">최대 사용 횟수</label>
              <input
                type="number"
                min="1"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="무제한"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                사용자당 최대 사용 횟수 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.max_uses_per_user}
                onChange={(e) => setFormData({ ...formData, max_uses_per_user: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                시작일시 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">종료일시</label>
              <input
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">비워두면 무기한</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="예: 신규 가입 고객 10% 할인"
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-3"
            />
            <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
              즉시 활성화
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? '저장 중...' : (promotion ? '수정하기' : '생성하기')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
