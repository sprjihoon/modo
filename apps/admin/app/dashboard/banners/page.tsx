"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Check, X, ArrowUp, ArrowDown, Image as ImageIcon, Upload, ExternalLink, Navigation, ShoppingCart } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  button_text: string;
  background_color: string;
  background_image_url: string | null;
  display_order: number;
  is_active: boolean;
  action_type: string;
  action_value: string | null;
  created_at: string;
  updated_at: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/banners");
      
      // 응답 본문을 먼저 텍스트로 읽어서 확인
      const responseText = await response.text();
      console.log("배너 API 응답 (raw):", responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("JSON 파싱 실패:", e);
        throw new Error(`서버 응답 파싱 실패: ${responseText.substring(0, 200)}`);
      }

      console.log("배너 API 응답 (parsed):", { status: response.status, result });

      if (!response.ok || !result.success) {
        const errorMsg = result.details || result.error || result.hint || `배너를 불러올 수 없습니다. (${response.status})`;
        console.error("배너 로드 실패:", {
          status: response.status,
          error: result.error,
          details: result.details,
          code: result.code,
          hint: result.hint,
          fullResponse: result,
        });
        throw new Error(errorMsg);
      }

      setBanners(result.data || []);
    } catch (error: any) {
      console.error("배너 로드 실패:", error);
      setError(error.message || "배너를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "상태 변경에 실패했습니다.");
      }

      loadBanners();
    } catch (error: any) {
      console.error("상태 변경 실패:", error);
      alert(error.message || "상태 변경에 실패했습니다.");
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "삭제에 실패했습니다.");
      }

      loadBanners();
    } catch (error: any) {
      console.error("삭제 실패:", error);
      alert(error.message || "삭제에 실패했습니다.");
    }
  };

  const moveOrder = async (id: string, direction: "up" | "down") => {
    const currentBanner = banners.find((b) => b.id === id);
    if (!currentBanner) return;

    const sortedBanners = [...banners].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sortedBanners.findIndex((b) => b.id === id);

    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === sortedBanners.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const targetBanner = sortedBanners[targetIndex];

    try {
      // 두 배너의 순서 교환
      await Promise.all([
        fetch(`/api/admin/banners/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: targetBanner.display_order }),
        }),
        fetch(`/api/admin/banners/${targetBanner.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: currentBanner.display_order }),
        }),
      ]);

      loadBanners();
    } catch (error: any) {
      console.error("순서 변경 실패:", error);
      alert("순서 변경에 실패했습니다.");
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
          <Button onClick={loadBanners} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  const sortedBanners = [...banners].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">배너 관리</h1>
          <p className="text-gray-600 mt-1">홈 화면 배너를 관리합니다</p>
        </div>
        <Button
          onClick={() => {
            setEditingBanner(null);
            setShowCreateModal(true);
          }}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          배너 추가
        </Button>
      </div>

      {sortedBanners.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500 mb-4">등록된 배너가 없습니다</p>
          <Button onClick={() => setShowCreateModal(true)}>첫 배너 만들기</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBanners.map((banner, index) => (
            <div
              key={banner.id}
              className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-6">
                {/* 배너 미리보기 */}
                <div
                  className="w-64 h-40 rounded-lg flex-shrink-0 relative overflow-hidden"
                  style={{
                    backgroundColor: banner.background_color,
                    backgroundImage: banner.background_image_url
                      ? `url(${banner.background_image_url})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {banner.background_image_url && (
                    <div className="absolute inset-0 bg-black/20" />
                  )}
                  <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                    <div className="text-xs bg-white/20 px-2 py-1 rounded w-fit">
                      서비스 이용
                    </div>
                    <div>
                      <div className="text-lg font-bold mb-2 whitespace-pre-line">
                        {banner.title}
                      </div>
                      <button
                        className="bg-[#00C896] text-white px-4 py-2 rounded-full text-sm font-bold"
                        disabled
                      >
                        {banner.button_text}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 배너 정보 */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{banner.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        버튼 텍스트: {banner.button_text}
                      </p>
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <span className="text-gray-500">클릭 시:</span>
                        {banner.action_type === 'url' && banner.action_value ? (
                          <span className="flex items-center gap-1 text-blue-600">
                            <ExternalLink className="h-3 w-3" />
                            <a 
                              href={banner.action_value} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline truncate max-w-md"
                            >
                              {banner.action_value}
                            </a>
                          </span>
                        ) : banner.action_type === 'navigate' && banner.action_value ? (
                          <span className="flex items-center gap-1 text-purple-600">
                            <Navigation className="h-3 w-3" />
                            앱 내 이동: {banner.action_value}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600">
                            <ShoppingCart className="h-3 w-3" />
                            수거신청 페이지 (기본)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>순서: {banner.display_order}</span>
                        <span>배경색: {banner.background_color}</span>
                        {banner.background_image_url && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4" />
                            이미지 있음
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(banner.id, banner.is_active)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          banner.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {banner.is_active ? (
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
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveOrder(banner.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveOrder(banner.id, "down")}
                      disabled={index === sortedBanners.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingBanner(banner);
                        setShowCreateModal(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBanner(banner.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <BannerModal
          banner={editingBanner}
          onClose={() => {
            setShowCreateModal(false);
            setEditingBanner(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingBanner(null);
            loadBanners();
          }}
        />
      )}
    </div>
  );
}

interface BannerModalProps {
  banner: Banner | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BannerModal({ banner, onClose, onSuccess }: BannerModalProps) {
  const [title, setTitle] = useState(banner?.title || "");
  const [buttonText, setButtonText] = useState(banner?.button_text || "");
  const [backgroundColor, setBackgroundColor] = useState(banner?.background_color || "#2D3E50");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(banner?.background_image_url || "");
  const [displayOrder, setDisplayOrder] = useState(banner?.display_order ?? 0);
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [actionType, setActionType] = useState(banner?.action_type || "navigate");
  const [actionValue, setActionValue] = useState(banner?.action_value || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setIsUploading(true);
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append("file", file);

      // API를 통해 이미지 업로드
      const response = await fetch("/api/admin/banners/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "이미지 업로드에 실패했습니다.");
      }

      setBackgroundImageUrl(result.url);
    } catch (error: any) {
      console.error("이미지 업로드 실패:", error);
      alert("이미지 업로드에 실패했습니다: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        title,
        button_text: buttonText,
        background_color: backgroundColor,
        background_image_url: backgroundImageUrl || null,
        display_order: displayOrder,
        is_active: isActive,
        action_type: actionType,
        action_value: actionValue || null,
      };

      const url = banner
        ? `/api/admin/banners/${banner.id}`
        : "/api/admin/banners";
      const method = banner ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "저장에 실패했습니다.");
      }

      onSuccess();
    } catch (error: any) {
      console.error("저장 실패:", error);
      alert(error.message || "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            {banner ? "배너 수정" : "배너 추가"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 미리보기 */}
          <div>
            <Label>미리보기</Label>
            <div
              className="mt-2 w-full h-48 rounded-lg relative overflow-hidden"
              style={{
                backgroundColor: backgroundColor,
                backgroundImage: backgroundImageUrl
                  ? `url(${backgroundImageUrl})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {backgroundImageUrl && (
                <div className="absolute inset-0 bg-black/20" />
              )}
              <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                <div className="text-xs bg-white/20 px-2 py-1 rounded w-fit">
                  서비스 이용
                </div>
                <div>
                  <div className="text-lg font-bold mb-2 whitespace-pre-line">
                    {title || "제목을 입력하세요"}
                  </div>
                  <button
                    className="bg-[#00C896] text-white px-4 py-2 rounded-full text-sm font-bold"
                    type="button"
                    disabled
                  >
                    {buttonText || "버튼 텍스트"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 제목 */}
          <div>
            <Label htmlFor="title">제목 *</Label>
            <Textarea
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="배너 제목 (줄바꿈 가능)"
              rows={2}
              required
              className="mt-1"
            />
          </div>

          {/* 버튼 텍스트 */}
          <div>
            <Label htmlFor="buttonText">버튼 텍스트 *</Label>
            <Input
              id="buttonText"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="예: 첫 수거신청 하기"
              required
              className="mt-1"
            />
          </div>

          {/* 배경 색상 */}
          <div>
            <Label htmlFor="backgroundColor">배경 색상 *</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input
                id="backgroundColor"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#2D3E50"
                className="flex-1"
              />
            </div>
          </div>

          {/* 배경 이미지 */}
          <div>
            <Label>배경 이미지 (선택사항)</Label>
            <div className="mt-1 space-y-2">
              {backgroundImageUrl && (
                <div className="relative">
                  <img
                    src={backgroundImageUrl}
                    alt="배경 이미지"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setBackgroundImageUrl("")}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="imageUpload"
                />
                <Label
                  htmlFor="imageUpload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "업로드 중..." : "이미지 업로드"}
                </Label>
              </div>
            </div>
          </div>

          {/* 클릭 시 동작 */}
          <div>
            <Label>클릭 시 동작</Label>
            <div className="mt-2 space-y-3">
              {/* 액션 타입 선택 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setActionType('order'); setActionValue(''); }}
                  className={`flex-1 p-3 rounded-lg border-2 text-left ${
                    actionType === 'order' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className={`h-4 w-4 ${actionType === 'order' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="font-medium">수거신청</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">기본 동작</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('navigate')}
                  className={`flex-1 p-3 rounded-lg border-2 text-left ${
                    actionType === 'navigate' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Navigation className={`h-4 w-4 ${actionType === 'navigate' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className="font-medium">앱 내 이동</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">다른 페이지로</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('url')}
                  className={`flex-1 p-3 rounded-lg border-2 text-left ${
                    actionType === 'url' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className={`h-4 w-4 ${actionType === 'url' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="font-medium">외부 URL</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">브라우저 열기</p>
                </button>
              </div>

              {/* 앱 내 페이지 선택 */}
              {actionType === 'navigate' && (
                <div>
                  <Label htmlFor="navigatePath">이동할 페이지</Label>
                  <select
                    id="navigatePath"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    className="mt-1 w-full p-2 border rounded-lg"
                  >
                    <option value="">페이지 선택...</option>
                    <option value="/orders">📋 주문 내역</option>
                    <option value="/profile">👤 마이페이지</option>
                    <option value="/notifications">🔔 알림</option>
                    <option value="/announcements">📢 공지사항</option>
                    <option value="/addresses">📍 배송지 관리</option>
                    <option value="/payment-history">💳 결제 내역</option>
                    <option value="/points-history">🎁 포인트 내역</option>
                    <option value="/invite-friends">👥 친구 초대</option>
                    <option value="/customer-service">💬 고객센터</option>
                    <option value="/app-settings">⚙️ 앱 설정</option>
                  </select>
                </div>
              )}

              {/* 외부 URL 입력 */}
              {actionType === 'url' && (
                <div>
                  <Label htmlFor="externalUrl">외부 URL</Label>
                  <Input
                    id="externalUrl"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 표시 순서 */}
          <div>
            <Label htmlFor="displayOrder">표시 순서</Label>
            <Input
              id="displayOrder"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              min="0"
              className="mt-1"
            />
          </div>

          {/* 활성화 여부 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              활성화
            </Label>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "저장 중..." : banner ? "수정" : "생성"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

