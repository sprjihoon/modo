"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Upload, X, Image, FolderOpen, Folder } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

interface RepairCategory {
  id: string;
  name: string;
  display_order: number;
  icon_name?: string;
  is_active: boolean;
  parent_category_id?: string | null;
  // 직접 가격/치수 필드 (소카테고리가 수선 항목 역할을 겸할 때 사용)
  price?: number | null;
  price_range?: string | null;
  requires_measurement?: boolean;
  input_count?: number;
  input_labels?: string[] | null;
  description?: string | null;
  sub_selection_label?: string | null;
  repair_types?: RepairType[];
  sub_categories?: RepairCategory[];
}

interface RepairType {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  icon_name?: string;
  price: number;
  display_order: number;
  is_active: boolean;
  requires_measurement?: boolean;
  requires_multiple_inputs?: boolean;
  input_count?: number;
  input_labels?: string[];
  has_sub_parts?: boolean;
  allow_multiple_sub_parts?: boolean;
  sub_parts_title?: string;
}

export default function RepairMenuPage() {
  const [mainCategories, setMainCategories] = useState<RepairCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<RepairCategory[]>([]);
  const [isHierarchical, setIsHierarchical] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // 카테고리 및 수선 종류 로드
  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/repair-menu');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '데이터 조회 실패');
      }

      if (result.hierarchical) {
        setIsHierarchical(true);
        setMainCategories(result.mainCategories || []);
        setFlatCategories(result.data || []);
      } else {
        setIsHierarchical(false);
        setMainCategories([]);
        setFlatCategories(result.data || []);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      alert('데이터 로드 실패: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 카테고리 펼치기/접기
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 카테고리 순서 변경 (대카테고리/소카테고리/flat 모두 처리)
  const moveCategoryOrder = async (categoryId: string, direction: 'up' | 'down') => {
    // 전체 카테고리 목록에서 찾기 (대카테고리 → 소카테고리 → flat 순)
    const allFlat: RepairCategory[] = [
      ...mainCategories,
      ...mainCategories.flatMap(m => m.sub_categories || []),
      ...flatCategories,
    ];
    const currentIndex = allFlat.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;

    // 같은 레벨의 카테고리만 상대로 순서 변경
    const current = allFlat[currentIndex];
    const sameLevel = allFlat.filter(c =>
      (c as any).parent_category_id === (current as any).parent_category_id
    );
    const levelIndex = sameLevel.findIndex(c => c.id === categoryId);
    const targetIndex = direction === 'up' ? levelIndex - 1 : levelIndex + 1;
    if (targetIndex < 0 || targetIndex >= sameLevel.length) return;

    const target = sameLevel[targetIndex];

    try {

      const response = await fetch('/api/admin/repair-menu/categories/order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: [
            { id: current.id, display_order: target.display_order },
            { id: target.id, display_order: current.display_order },
          ],
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '순서 변경 실패');
      }

      await loadData();
    } catch (error: any) {
      console.error('순서 변경 실패:', error);
      alert('순서 변경 실패: ' + (error.message || error.toString()));
    }
  };

  // 카테고리 삭제
  const deleteCategory = async (categoryId: string) => {
    if (!confirm('이 카테고리와 하위 수선 항목을 모두 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/repair-menu/categories?id=${categoryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '카테고리 삭제 실패');
      }

      await loadData();
    } catch (error: any) {
      alert('삭제 실패: ' + (error.message || error.toString()));
    }
  };

  // 수선 항목 삭제
  const deleteRepairType = async (typeId: string) => {
    if (!confirm('이 수선 항목을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/repair-menu/types?id=${typeId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '수선 항목 삭제 실패');
      }

      await loadData();
    } catch (error: any) {
      alert('삭제 실패: ' + (error.message || error.toString()));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  const hasNoData = mainCategories.length === 0 && flatCategories.length === 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">수선 메뉴 관리</h1>
          <p className="text-muted-foreground mt-2">
            대카테고리(상의/하의 등) → 세부항목(가격+치수) 2단계 구조로 구성합니다
          </p>
        </div>
        <div className="flex gap-2">
          {/* 대카테고리 추가 */}
          <AddCategoryDialog onAdded={loadData} isMainCategory label="+ 대카테고리 추가" />
          {/* 소카테고리 추가 (대카테고리가 없으면 기존 방식) */}
          {!isHierarchical && <AddCategoryDialog onAdded={loadData} />}
        </div>
      </div>

      {/* 안내 배너 (대카테고리 없을 때) */}
      {!isHierarchical && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>💡 계층 구조 사용하기:</strong> 상단의 &ldquo;+ 대카테고리 추가&rdquo;로 상의·하의·공통사항 등
          대분류를 먼저 만들면, 기존 카테고리를 그 아래에 묶어 관리할 수 있습니다.
        </div>
      )}

      {hasNoData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">등록된 카테고리가 없습니다</p>
            <AddCategoryDialog onAdded={loadData} isMainCategory label="대카테고리 추가하기">
              <Button className="mt-4">시작하기</Button>
            </AddCategoryDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">

          {/* ── 대카테고리 섹션 ── */}
          {mainCategories.map((main, mainIdx) => (
            <div key={main.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
              {/* 대카테고리 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <div>
                    <span className="text-lg font-bold">{main.name}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      세부항목 {main.sub_categories?.length || 0}개
                    </span>
                  </div>
                  {!main.is_active && <Badge variant="secondary">비활성</Badge>}
                </div>
                <div className="flex gap-2">
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => moveCategoryOrder(main.id, 'up')} disabled={mainIdx === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => moveCategoryOrder(main.id, 'down')} disabled={mainIdx === mainCategories.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <EditCategoryDialog category={main} onUpdated={loadData} />
                  {/* 세부항목 추가 */}
                  <AddCategoryDialog
                    onAdded={loadData}
                    parentCategoryId={main.id}
                    label="+ 세부항목"
                  />
                  <Button variant="outline" size="sm" onClick={() => deleteCategory(main.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 세부항목/소카테고리 목록 */}
              <div className="p-4 bg-white">
                {(main.sub_categories || []).length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                    세부항목이 없습니다. &ldquo;+ 세부항목&rdquo; 버튼으로 가격·치수 항목을 추가하세요.
                  </div>
                ) : (() => {
                  const subs = main.sub_categories || [];
                  const directItems = subs.filter(s => s.price != null);
                  const legacySubs = subs.filter(s => s.price == null);
                  return (
                    <div className="space-y-2">
                      {/* 직접가격 세부항목 (2단계 구조) */}
                      {directItems.length > 0 && (
                        <div className="space-y-2">
                          {directItems.map((sub, subIdx) => (
                            <DirectItemCard
                              key={sub.id}
                              category={sub}
                              index={subIdx}
                              total={directItems.length}
                              onMoveUp={() => moveCategoryOrder(sub.id, 'up')}
                              onMoveDown={() => moveCategoryOrder(sub.id, 'down')}
                              onDelete={() => deleteCategory(sub.id)}
                              onReload={loadData}
                            />
                          ))}
                        </div>
                      )}
                      {/* 레거시 소카테고리 (3단계 구조) */}
                      {legacySubs.length > 0 && (
                        <div className="space-y-2">
                          {directItems.length > 0 && (
                            <p className="text-xs text-muted-foreground px-1 pt-2">── 레거시 소카테고리 (수선항목 테이블 연결)</p>
                          )}
                          {legacySubs.map((sub, subIdx) => (
                            <SubCategoryCard
                              key={sub.id}
                              category={sub}
                              index={subIdx}
                              total={legacySubs.length}
                              expanded={expandedCategories.has(sub.id)}
                              onToggle={() => toggleCategory(sub.id)}
                              onMoveUp={() => moveCategoryOrder(sub.id, 'up')}
                              onMoveDown={() => moveCategoryOrder(sub.id, 'down')}
                              onDelete={() => deleteCategory(sub.id)}
                              onDeleteType={deleteRepairType}
                              onReload={loadData}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {/* ── 소카테고리 미분류 / 기존 flat 카테고리 ── */}
          {flatCategories.length > 0 && (
            <div>
              {isHierarchical && (
                <p className="text-sm text-muted-foreground mb-3 px-1">
                  📁 대카테고리에 속하지 않은 기존 카테고리
                </p>
              )}
              <div className="space-y-3">
                {flatCategories.map((category, index) => (
                  <SubCategoryCard
                    key={category.id}
                    category={category}
                    index={index}
                    total={flatCategories.length}
                    expanded={expandedCategories.has(category.id)}
                    onToggle={() => toggleCategory(category.id)}
                    onMoveUp={() => moveCategoryOrder(category.id, 'up')}
                    onMoveDown={() => moveCategoryOrder(category.id, 'down')}
                    onDelete={() => deleteCategory(category.id)}
                    onDeleteType={deleteRepairType}
                    onReload={loadData}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 세부항목(직접가격) 카드 ──
function DirectItemCard({
  category,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  onReload,
}: {
  category: RepairCategory;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onReload: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{category.name}</span>
            {category.price != null && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                {category.price_range || `${category.price.toLocaleString()}원`}
              </span>
            )}
            {category.requires_measurement && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                치수 입력
              </span>
            )}
            {!category.is_active && <Badge variant="secondary">비활성</Badge>}
          </div>
          {category.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{category.description}</p>
          )}
          {category.requires_measurement && category.input_labels && category.input_labels.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              입력: {Array.isArray(category.input_labels) ? category.input_labels.join(", ") : category.input_labels}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="outline" size="sm" onClick={onMoveUp} disabled={index === 0}>
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={onMoveDown} disabled={index === total - 1}>
          <ArrowDown className="h-3 w-3" />
        </Button>
        <EditCategoryDialog category={category} onUpdated={onReload} />
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── 소카테고리 카드 컴포넌트 (레거시 3단계 구조용) ──
function SubCategoryCard({
  category,
  index,
  total,
  expanded,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDeleteType,
  onReload,
}: {
  category: RepairCategory;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDeleteType: (id: string) => Promise<void>;
  onReload: () => void;
}) {
  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggle} className="h-7 w-7 p-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Folder className="h-4 w-4 text-gray-400" />
            <div>
              <span className="font-semibold text-base">{category.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {category.repair_types?.length || 0}개 항목
              </span>
              {category.price != null && (
                <span className="ml-2 text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                  직접가격 {category.price.toLocaleString()}원
                  {category.requires_measurement && " · 수치입력"}
                </span>
              )}
            </div>
            {!category.is_active && <Badge variant="secondary">비활성</Badge>}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onMoveUp} disabled={index === 0}>
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={onMoveDown} disabled={index === total - 1}>
              <ArrowDown className="h-3 w-3" />
            </Button>
            <EditCategoryDialog category={category} onUpdated={onReload} />
            {/* 직접가격 세부항목에는 repair_types 불필요 */}
            {category.price == null && (
              <AddRepairTypeDialog categoryId={category.id} categoryName={category.name} onAdded={onReload} />
            )}
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-3 px-4">
          {category.repair_types && category.repair_types.length > 0 ? (
            <div className="space-y-2 mt-1">
              {category.repair_types.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{type.name}</p>
                        {type.requires_measurement === false && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">선택만</Badge>
                        )}
                        {type.requires_multiple_inputs && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">입력×2</Badge>
                        )}
                        {type.has_sub_parts && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">세부부위</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{type.price.toLocaleString()}원</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!type.is_active && <Badge variant="secondary">비활성</Badge>}
                    <EditRepairTypeDialog repairType={type} categoryName={category.name} onUpdated={onReload} />
                    <Button variant="ghost" size="sm" onClick={() => onDeleteType(type.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg mt-1">
              <p>등록된 수선 항목이 없습니다</p>
              <AddRepairTypeDialog categoryId={category.id} categoryName={category.name} onAdded={onReload}>
                <Button variant="outline" size="sm" className="mt-2">첫 항목 추가하기</Button>
              </AddRepairTypeDialog>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// SVG 미리보기 컴포넌트
function SvgPreview({ url, size = 64 }: { url: string; size?: number }) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    
    setLoading(true);
    fetch(url)
      .then(res => res.text())
      .then(text => {
        if (text.includes('<svg')) {
          // SVG에 width/height 속성을 100%로 설정하여 컨테이너에 맞게 조정
          const modifiedSvg = text
            .replace(/<svg([^>]*)width="[^"]*"/, '<svg$1width="100%"')
            .replace(/<svg([^>]*)height="[^"]*"/, '<svg$1height="100%"')
            .replace(/<svg(?![^>]*width)/, '<svg width="100%" height="100%"');
          setSvgContent(modifiedSvg);
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div 
        className="bg-gray-100 rounded-lg flex items-center justify-center animate-pulse"
        style={{ width: size, height: size }}
      >
        <div className="w-6 h-6 bg-gray-300 rounded" />
      </div>
    );
  }

  if (error || !svgContent) {
    return (
      <div 
        className="bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Image className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div 
      className="bg-white border rounded-lg flex items-center justify-center p-2 overflow-hidden [&>svg]:w-full [&>svg]:h-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

// 카테고리 수정 Dialog
function EditCategoryDialog({
  category,
  onUpdated,
}: {
  category: RepairCategory;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [iconName, setIconName] = useState(category.icon_name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 직접 가격/치수 필드 (소카테고리용)
  const isSubCategory = !!category.parent_category_id;
  const [price, setPrice] = useState(category.price != null ? String(category.price) : "");
  const [priceRange, setPriceRange] = useState(category.price_range || "");
  const [description, setDescription] = useState(category.description || "");
  const [requiresMeasurement, setRequiresMeasurement] = useState(category.requires_measurement ?? false);
  const [inputCount, setInputCount] = useState(category.input_count ?? 1);
  const [inputLabels, setInputLabels] = useState<string[]>(
    category.input_labels && category.input_labels.length > 0
      ? category.input_labels
      : ["치수 (cm)"]
  );
  const [hasDirectPrice, setHasDirectPrice] = useState(category.price != null);
  const [subSelectionLabel, setSubSelectionLabel] = useState(category.sub_selection_label || "");

  // icon_name이 URL인지 확인
  const isIconUrl = iconName.startsWith("http");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'category-icons');

      const response = await fetch('/api/admin/upload/svg', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '업로드 실패');
      }

      // 업로드된 URL을 icon_name에 저장
      setIconName(result.data.url);
    } catch (error: any) {
      console.error('SVG 업로드 실패:', error);
      alert(`SVG 업로드 실패: ${error.message}`);
    } finally {
      setIsUploading(false);
      // input 초기화
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!name) return;

    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        id: category.id,
        name,
        icon_name: iconName || null,
      };

      if (isSubCategory) {
        body.sub_selection_label = subSelectionLabel || null;
        if (hasDirectPrice) {
          body.price = price ? parseInt(price) : null;
          body.price_range = priceRange || null;
          body.description = description || null;
          body.requires_measurement = requiresMeasurement;
          if (requiresMeasurement) {
            body.input_count = inputCount;
            body.input_labels = inputLabels.filter(Boolean);
          } else {
            body.input_count = 1;
            body.input_labels = null;
          }
        } else {
          body.price = null;
          body.price_range = null;
          body.description = description || null;
          body.requires_measurement = false;
          body.input_count = 1;
          body.input_labels = null;
        }
      }

      const response = await fetch("/api/admin/repair-menu/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '카테고리 수정 실패');
      }

      setOpen(false);
      onUpdated();
    } catch (error: any) {
      console.error('Edit category error:', error);
      alert(`카테고리 수정 실패:\n${error.message || error.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>카테고리 수정</DialogTitle>
          <DialogDescription>
            카테고리 정보를 수정합니다
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-cat-name">카테고리명 *</Label>
            <Input
              id="edit-cat-name"
              placeholder="예: 아우터"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          {/* SVG 아이콘 업로드 */}
          <div className="space-y-3">
            <Label>아이콘 (SVG)</Label>
            
            {/* 현재 아이콘 미리보기 */}
            {iconName && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {isIconUrl ? (
                  <SvgPreview url={iconName} size={64} />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isIconUrl ? 'SVG 업로드됨' : iconName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isIconUrl ? iconName : '로컬 아이콘 (앱에 포함된 파일)'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIconName('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* 업로드 버튼 */}
            <div className="flex gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? '업로드 중...' : 'SVG 파일 업로드'}
                  </span>
                </Button>
              </label>
            </div>
            
            {/* 수동 입력 (로컬 아이콘용) */}
            <div>
              <Label htmlFor="edit-cat-icon-manual" className="text-xs text-muted-foreground">
                또는 로컬 아이콘명 직접 입력
              </Label>
              <Input
                id="edit-cat-icon-manual"
                placeholder="예: outer (앱에 포함된 SVG)"
                value={isIconUrl ? '' : iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* 소카테고리 전용 설정 */}
          {isSubCategory && (
            <div className="space-y-4 pt-2 border-t">
              <div>
                <Label htmlFor="edit-sub-selection-label">세부항목 선택 안내 문구 (선택)</Label>
                <Input
                  id="edit-sub-selection-label"
                  placeholder="예: 들이고자 하는 단면 사이즈를 입력해주세요."
                  value={subSelectionLabel}
                  onChange={(e) => setSubSelectionLabel(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  이 카테고리 선택 후 세부항목이 있을 때 표시되는 안내 문구입니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-has-direct-price"
                  checked={hasDirectPrice}
                  onChange={(e) => setHasDirectPrice(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-has-direct-price" className="cursor-pointer font-semibold">
                  직접 가격 설정 (이 카테고리 선택 시 바로 주문 항목으로 추가)
                </Label>
              </div>
              {hasDirectPrice && (
                <div className="space-y-3 pl-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-cat-price">가격 (원) *</Label>
                      <Input
                        id="edit-cat-price"
                        type="number"
                        placeholder="예: 15000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-cat-price-range">가격 표시 텍스트 (선택)</Label>
                      <Input
                        id="edit-cat-price-range"
                        placeholder="예: 15,000원~"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-cat-description">설명 (선택)</Label>
                    <Input
                      id="edit-cat-description"
                      placeholder="예: 줄이고자 하는 단면 치수를 입력해주세요."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-requires-measurement"
                      checked={requiresMeasurement}
                      onChange={(e) => {
                        setRequiresMeasurement(e.target.checked);
                        if (e.target.checked && inputLabels.length === 0) {
                          setInputLabels(["치수 (cm)"]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="edit-requires-measurement" className="cursor-pointer">
                      수치 입력 필요
                    </Label>
                  </div>
                  {requiresMeasurement && (
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-multi-input"
                          checked={inputCount >= 2}
                          onChange={(e) => {
                            const count = e.target.checked ? 2 : 1;
                            setInputCount(count);
                            const newLabels = Array.from({ length: count }, (_, i) =>
                              inputLabels[i] || `치수 ${i + 1} (cm)`
                            );
                            setInputLabels(newLabels);
                          }}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="edit-multi-input" className="cursor-pointer">
                          입력값 2개 필요
                        </Label>
                      </div>
                      {Array.from({ length: inputCount }).map((_, i) => (
                        <Input
                          key={i}
                          placeholder={i === 0 ? "예: 왼쪽어깨" : "예: 오른쪽어깨"}
                          value={inputLabels[i] || ""}
                          onChange={(e) => {
                            const next = [...inputLabels];
                            next[i] = e.target.value;
                            setInputLabels(next);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* 설명은 직접가격 여부 무관하게 설정 가능 */}
              {!hasDirectPrice && (
                <div>
                  <Label htmlFor="edit-cat-desc-only">설명 (선택)</Label>
                  <Input
                    id="edit-cat-desc-only"
                    placeholder="예: 카테고리 안내 문구"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isLoading}>
            {isLoading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 카테고리 추가 Dialog
function AddCategoryDialog({
  onAdded,
  children,
  isMainCategory,
  parentCategoryId,
  label,
}: {
  onAdded: () => void;
  children?: React.ReactNode;
  isMainCategory?: boolean;
  parentCategoryId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 직접 가격/치수 (소카테고리에만 표시)
  const isSubCat = !isMainCategory;
  // 대카테고리 하위 추가 시 직접가격이 기본값 (세부항목 구조)
  const [hasDirectPrice, setHasDirectPrice] = useState(!!parentCategoryId);
  const [price, setPrice] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [description, setDescription] = useState("");
  const [subSelectionLabel, setSubSelectionLabel] = useState("");
  const [requiresMeasurement, setRequiresMeasurement] = useState(!!parentCategoryId);
  const [inputCount, setInputCount] = useState(1);
  const [inputLabels, setInputLabels] = useState<string[]>(["치수 (cm)"]);

  // icon_name이 URL인지 확인
  const isIconUrl = iconName.startsWith("http");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'category-icons');

      const response = await fetch('/api/admin/upload/svg', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '업로드 실패');
      }

      // 업로드된 URL을 icon_name에 저장
      setIconName(result.data.url);
    } catch (error: any) {
      console.error('SVG 업로드 실패:', error);
      alert(`SVG 업로드 실패: ${error.message}`);
    } finally {
      setIsUploading(false);
      // input 초기화
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!name) return;

    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        name,
        icon_name: iconName || null,
        display_order: 999,
        parent_category_id: parentCategoryId || null,
      };

      if (isSubCat && !parentCategoryId) {
        body.sub_selection_label = subSelectionLabel || null;
      }
      if (isSubCat && hasDirectPrice) {
        body.price = price ? parseInt(price) : null;
        body.price_range = priceRange || null;
        body.description = description || null;
        body.requires_measurement = requiresMeasurement;
        if (requiresMeasurement) {
          body.input_count = inputCount;
          body.input_labels = inputLabels.filter(Boolean);
        }
      } else if (isSubCat && description) {
        body.description = description;
      }

      const response = await fetch("/api/admin/repair-menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '카테고리 추가 실패');
      }

      setOpen(false);
      setName("");
      setIconName("");
      setHasDirectPrice(!!parentCategoryId);
      setPrice("");
      setPriceRange("");
      setDescription("");
      setSubSelectionLabel("");
      setRequiresMeasurement(!!parentCategoryId);
      setInputCount(1);
      setInputLabels(["치수 (cm)"]);
      onAdded();
    } catch (error: any) {
      console.error('Add category error:', error);
      alert(`카테고리 추가 실패:\n${error.message || error.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const dialogTitle = isMainCategory ? '대카테고리 추가' : parentCategoryId ? '세부항목 추가' : '카테고리 추가';
  const dialogDesc = isMainCategory
    ? '상의·하의 등 대분류를 추가합니다'
    : parentCategoryId
    ? '선택 시 가격과 치수를 직접 입력받는 세부항목을 추가합니다'
    : '새로운 카테고리를 추가합니다';
  const placeholder = isMainCategory ? '예: 상의, 하의, 원피스' : '예: 어깨줄임, 소매기장, 밑단줄임';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={isMainCategory ? 'default' : 'outline'} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {label || (isMainCategory ? '대카테고리 추가' : parentCategoryId ? '소카테고리 추가' : '카테고리 추가')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">카테고리명 *</Label>
            <Input
              id="name"
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          {/* SVG 아이콘 업로드 */}
          <div className="space-y-3">
            <Label>아이콘 (SVG)</Label>
            
            {/* 현재 아이콘 미리보기 */}
            {iconName && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {isIconUrl ? (
                  <SvgPreview url={iconName} size={64} />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isIconUrl ? 'SVG 업로드됨' : iconName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isIconUrl ? iconName : '로컬 아이콘 (앱에 포함된 파일)'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIconName('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* 업로드 버튼 */}
            <div className="flex gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? '업로드 중...' : 'SVG 파일 업로드'}
                  </span>
                </Button>
              </label>
            </div>
            
            {/* 수동 입력 (로컬 아이콘용) */}
            <div>
              <Label htmlFor="icon-manual" className="text-xs text-muted-foreground">
                또는 로컬 아이콘명 직접 입력
              </Label>
              <Input
                id="icon-manual"
                placeholder="예: outer (앱에 포함된 SVG)"
                value={isIconUrl ? '' : iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* 세부항목 설정 (대카테고리 하위 추가 시 항상 표시) */}
          {isSubCat && (
            <div className="space-y-4 pt-2 border-t">
              {/* 대카테고리 하위(세부항목)가 아닌 경우에만 선택 체크박스 표시 */}
              {!parentCategoryId && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="add-has-direct-price"
                    checked={hasDirectPrice}
                    onChange={(e) => setHasDirectPrice(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="add-has-direct-price" className="cursor-pointer font-semibold">
                    직접 가격 설정 (이 카테고리 선택 시 바로 주문 항목으로 추가)
                  </Label>
                </div>
              )}
              {hasDirectPrice && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-cat-price">가격 (원) *</Label>
                      <Input
                        id="add-cat-price"
                        type="number"
                        placeholder="예: 15000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-cat-price-range">가격 표시 텍스트 (선택)</Label>
                      <Input
                        id="add-cat-price-range"
                        placeholder="예: 15,000원~"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="add-cat-desc">설명 (선택)</Label>
                    <Input
                      id="add-cat-desc"
                      placeholder="예: 줄이고자 하는 단면 치수를 입력해주세요."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="add-requires-measurement"
                      checked={requiresMeasurement}
                      onChange={(e) => {
                        setRequiresMeasurement(e.target.checked);
                        if (e.target.checked && inputLabels.length === 0) {
                          setInputLabels(["치수 (cm)"]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="add-requires-measurement" className="cursor-pointer">
                      치수 입력 필요
                    </Label>
                  </div>
                  {requiresMeasurement && (
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="add-multi-input"
                          checked={inputCount >= 2}
                          onChange={(e) => {
                            const count = e.target.checked ? 2 : 1;
                            setInputCount(count);
                            const newLabels = Array.from({ length: count }, (_, i) =>
                              inputLabels[i] || `치수 ${i + 1} (cm)`
                            );
                            setInputLabels(newLabels);
                          }}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="add-multi-input" className="cursor-pointer">
                          입력값 2개 필요
                        </Label>
                      </div>
                      {Array.from({ length: inputCount }).map((_, i) => (
                        <Input
                          key={i}
                          placeholder={i === 0 ? "예: 왼쪽어깨" : "예: 오른쪽어깨"}
                          value={inputLabels[i] || ""}
                          onChange={(e) => {
                            const next = [...inputLabels];
                            next[i] = e.target.value;
                            setInputLabels(next);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* 레거시 소카테고리 전용 (대카테고리 하위가 아닌 경우) */}
              {!parentCategoryId && (
                <div>
                  <Label htmlFor="add-sub-selection-label">세부항목 선택 안내 문구 (선택)</Label>
                  <Input
                    id="add-sub-selection-label"
                    placeholder="예: 들이고자 하는 단면 사이즈를 입력해주세요."
                    value={subSelectionLabel}
                    onChange={(e) => setSubSelectionLabel(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isLoading}>
            {isLoading ? "추가 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 수선 항목 수정 Dialog
function EditRepairTypeDialog({
  repairType,
  categoryName,
  onUpdated,
}: {
  repairType: RepairType;
  categoryName: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(repairType.name);
  const [iconName, setIconName] = useState(repairType.icon_name || "");
  const [description, setDescription] = useState(repairType.description || "");
  const [price, setPrice] = useState(repairType.price.toString());
  const [requiresMeasurement, setRequiresMeasurement] = useState(repairType.requires_measurement ?? true);
  const [requiresMultipleInputs, setRequiresMultipleInputs] = useState(repairType.requires_multiple_inputs || false);
  const [inputLabel1, setInputLabel1] = useState(repairType.input_labels?.[0] || "");
  const [inputLabel2, setInputLabel2] = useState(repairType.input_labels?.[1] || "");
  const [hasSubParts, setHasSubParts] = useState(repairType.has_sub_parts || false);
  const [allowMultipleSubParts, setAllowMultipleSubParts] = useState(repairType.allow_multiple_sub_parts || false);
  const [subPartsTitle, setSubPartsTitle] = useState(repairType.sub_parts_title || "");
  const [subParts, setSubParts] = useState<Array<{id?: string, name: string, icon?: string, price?: number}>>([]);
  const [newSubPartName, setNewSubPartName] = useState("");
  const [newSubPartIcon, setNewSubPartIcon] = useState("");
  const [newSubPartPrice, setNewSubPartPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubParts, setIsLoadingSubParts] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingSubPartIcon, setIsUploadingSubPartIcon] = useState(false);

  // icon_name이 URL인지 확인
  const isIconUrl = iconName.startsWith('http');

  // 세부 부위 아이콘 업로드
  const handleSubPartIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSubPartIcon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'sub-part-icons');

      const response = await fetch('/api/admin/upload/svg', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '업로드 실패');
      }

      setNewSubPartIcon(result.data.url);
    } catch (error: any) {
      console.error('세부 부위 아이콘 업로드 실패:', error);
      alert(`아이콘 업로드 실패: ${error.message}`);
    } finally {
      setIsUploadingSubPartIcon(false);
      e.target.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'repair-type-icons');

      const response = await fetch('/api/admin/upload/svg', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '업로드 실패');
      }

      // #region agent log
      console.log('[DEBUG:UPLOAD] SVG uploaded successfully, URL:', result.data.url);
      // #endregion
      setIconName(result.data.url);
    } catch (error: any) {
      console.error('SVG 업로드 실패:', error);
      alert(`SVG 업로드 실패: ${error.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // 기존 세부 부위 로드
  useEffect(() => {
    if (hasSubParts && open) {
      loadExistingSubParts();
    }
  }, [hasSubParts, open]);

  const loadExistingSubParts = async () => {
    setIsLoadingSubParts(true);
    try {
      const { data, error } = await supabase
        .from('repair_sub_parts')
        .select('*')
        .eq('repair_type_id', repairType.id)
        .eq('part_type', 'sub_part')
        .order('display_order');

      if (!error && data) {
        setSubParts((data as any[]).map(part => ({
          id: part.id,
          name: part.name,
          icon: part.icon_name,
          price: part.price
        })));
      }
    } catch (error) {
      console.error('세부 부위 로드 실패:', error);
    } finally {
      setIsLoadingSubParts(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !price) {
      alert('필수 항목을 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      const inputLabels = requiresMultipleInputs 
        ? [inputLabel1 || '첫 번째 입력', inputLabel2 || '두 번째 입력']
        : ['치수 (cm)'];

      // #region agent log
      console.log('[DEBUG:SUBMIT] EditRepairType - iconName:', iconName);
      console.log('[DEBUG:SUBMIT] EditRepairType - sending icon_name:', iconName || null);
      // #endregion

      const response = await fetch('/api/admin/repair-menu/types', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: repairType.id,
          name,
          icon_name: iconName || null,
          description: description || null,
          price: parseInt(price),
          requires_measurement: requiresMeasurement,
          requires_multiple_inputs: requiresMeasurement ? requiresMultipleInputs : false,
          input_count: (requiresMeasurement && requiresMultipleInputs) ? 2 : 1,
          input_labels: inputLabels,
          has_sub_parts: hasSubParts,
          allow_multiple_sub_parts: hasSubParts ? allowMultipleSubParts : false,
          sub_parts_title: hasSubParts && subPartsTitle ? subPartsTitle : null,
          sub_parts: subParts,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '수선 항목 수정 실패');
      }

      setOpen(false);
      onUpdated();
    } catch (error: any) {
      console.error('Edit repair type error:', error);
      alert(`수선 항목 수정 실패:\n${error.message || error.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4 text-blue-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{categoryName} - 수선 항목 수정</DialogTitle>
          <DialogDescription>
            수선 항목 정보를 수정합니다
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div>
            <Label htmlFor="edit-repair-name">수선명 *</Label>
            <Input
              id="edit-repair-name"
              placeholder="예: 소매기장 줄임"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* SVG 아이콘 업로드 */}
          <div className="space-y-3">
            <Label>아이콘 (SVG)</Label>
            
            {iconName && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {isIconUrl ? (
                  <SvgPreview url={iconName} size={64} />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isIconUrl ? 'SVG 업로드됨' : iconName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isIconUrl ? iconName : '로컬 아이콘'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIconName('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? '업로드 중...' : 'SVG 파일 업로드'}
                  </span>
                </Button>
              </label>
            </div>
            
            <div>
              <Label htmlFor="edit-icon-manual" className="text-xs text-muted-foreground">
                또는 로컬 아이콘명 직접 입력
              </Label>
              <Input
                id="edit-icon-manual"
                placeholder="예: scissors (앱에 포함된 SVG)"
                value={isIconUrl ? '' : iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-description">설명 (선택)</Label>
            <Input
              id="edit-description"
              placeholder="예: 소매 또는 총장 기장 줄임"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-price">가격 *</Label>
            <Input
              id="edit-price"
              type="number"
              placeholder="15000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* 고급 옵션 */}
          <div className="space-y-3 pt-3 border-t">
            <p className="text-sm font-medium">고급 옵션</p>
            
            {/* 수치 입력 필요 여부 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-requires-measurement"
                checked={requiresMeasurement}
                onChange={(e) => setRequiresMeasurement(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-requires-measurement" className="text-sm font-normal cursor-pointer">
                수치 입력 필요 (체크 해제 시 선택만으로 완료)
              </Label>
            </div>
            
            {/* 입력값 2개 */}
            {requiresMeasurement && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-multiple-inputs"
                    checked={requiresMultipleInputs}
                    onChange={(e) => setRequiresMultipleInputs(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="edit-multiple-inputs" className="text-sm font-normal cursor-pointer">
                    입력값 2개 필요
                  </Label>
                </div>

                {requiresMultipleInputs && (
                  <div className="pl-6 space-y-2 bg-blue-50 p-3 rounded-lg">
                    <Input
                      placeholder="첫 번째 힌트 (예: 왼쪽어깨)"
                      value={inputLabel1}
                      onChange={(e) => setInputLabel1(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      placeholder="두 번째 힌트 (예: 오른쪽어깨)"
                      value={inputLabel2}
                      onChange={(e) => setInputLabel2(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 세부 부위 선택 */}
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-has-sub-parts"
                    checked={hasSubParts}
                    onChange={(e) => setHasSubParts(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="edit-has-sub-parts" className="text-sm font-normal cursor-pointer">
                    세부 부위 선택 필요 (예: 앞섶, 뒤판, 왼팔, 오른팔)
                  </Label>
                </div>
                
                {/* 세부 항목 선택 화면 제목 */}
                {hasSubParts && (
                  <div className="pl-6 space-y-2 bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit-allow-multiple-sub-parts"
                        checked={allowMultipleSubParts}
                        onChange={(e) => setAllowMultipleSubParts(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="edit-allow-multiple-sub-parts" className="text-sm font-normal cursor-pointer">
                        세부 부위 다중 선택 허용
                      </Label>
                    </div>
                    <div>
                      <Label htmlFor="edit-sub-parts-title" className="text-xs">
                        선택 화면 제목 (선택)
                      </Label>
                      <Input
                        id="edit-sub-parts-title"
                        placeholder="예: 소매 모양을 선택하세요"
                        value={subPartsTitle}
                        onChange={(e) => setSubPartsTitle(e.target.value)}
                        className="h-9 text-sm mt-1"
                      />
                      <p className="text-xs text-purple-700 mt-1">
                        미입력 시 기본값: &quot;상세 수선 부위를 선택해주세요&quot;
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 세부 부위 목록 */}
              {hasSubParts && (
                <div className="pl-6 space-y-3 bg-amber-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-amber-900 mb-2">
                    🎯 세부 부위 목록 (예: 앞섶, 뒤판, 왼팔, 오른팔)
                  </p>
                  <p className="text-[11px] text-amber-800 -mt-1 mb-2">
                    ※ 부위 가격은 상위 항목 가격에 더해지지 않고, 그 자체가 결제 단가가 됩니다 (0원이면 상위 항목 가격으로 폴백).
                  </p>

                  {isLoadingSubParts && (
                    <p className="text-xs text-gray-500">로딩 중...</p>
                  )}
                  
                  {/* 세부 부위 추가 입력 */}
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Input
                        placeholder="부위명 (예: 앞섶)"
                        value={newSubPartName}
                        onChange={(e) => setNewSubPartName(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Input
                            placeholder="아이콘 URL 또는 파일명"
                            value={newSubPartIcon}
                            onChange={(e) => setNewSubPartIcon(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <label>
                          <input
                            type="file"
                            accept=".svg,image/svg+xml"
                            onChange={handleSubPartIconUpload}
                            className="hidden"
                            disabled={isUploadingSubPartIcon}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isUploadingSubPartIcon}
                            asChild
                          >
                            <span className="cursor-pointer">
                              <Upload className="h-4 w-4" />
                            </span>
                          </Button>
                        </label>
                        {newSubPartIcon && newSubPartIcon.startsWith('http') && (
                          <div className="w-8 h-8 border rounded flex items-center justify-center bg-gray-50">
                            <SvgPreview url={newSubPartIcon} size={24} />
                          </div>
                        )}
                      </div>
                      <Input
                        placeholder="결제 단가 (예: 10000, 0이면 상위 항목 가격 사용)"
                        type="number"
                        value={newSubPartPrice}
                        onChange={(e) => setNewSubPartPrice(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (newSubPartName.trim()) {
                          setSubParts([
                            ...subParts,
                            {
                              name: newSubPartName.trim(),
                              icon: newSubPartIcon.trim() || undefined,
                              price: newSubPartPrice ? parseInt(newSubPartPrice) : 0
                            }
                          ]);
                          setNewSubPartName("");
                          setNewSubPartIcon("");
                          setNewSubPartPrice("");
                        }
                      }}
                    >
                      + 세부 부위 추가
                    </Button>
                  </div>

                  {/* 추가된 세부 부위 목록 */}
                  {subParts.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        추가된 부위 ({subParts.length}개)
                      </p>
                      {subParts.map((part, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {part.icon && part.icon.startsWith('http') && (
                              <div className="w-8 h-8 border rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
                                <SvgPreview url={part.icon} size={24} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{part.name}</p>
                              {part.icon && !part.icon.startsWith('http') && (
                                <span className="text-xs text-gray-500">
                                  {part.icon}
                                </span>
                              )}
                              {part.price && part.price > 0 && (
                                <p className="text-xs font-medium text-green-600">
                                  {part.price.toLocaleString()}원 (최종 단가)
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSubParts(subParts.filter((_, i) => i !== index));
                            }}
                            className="h-7 w-7 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !price || isLoading}>
            {isLoading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 수선 항목 추가 Dialog
function AddRepairTypeDialog({
  categoryId,
  categoryName,
  onAdded,
  children,
}: {
  categoryId: string;
  categoryName: string;
  onAdded: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [requiresMeasurement, setRequiresMeasurement] = useState(true);
  const [requiresMultipleInputs, setRequiresMultipleInputs] = useState(false);
  const [inputCount, setInputCount] = useState("1");
  const [inputLabel1, setInputLabel1] = useState("");
  const [inputLabel2, setInputLabel2] = useState("");
  
  // 세부 부위 (예: 앞섶, 뒤판, 왼팔, 오른팔)
  const [hasSubParts, setHasSubParts] = useState(false);
  const [allowMultipleSubParts, setAllowMultipleSubParts] = useState(false);
  const [subPartsTitle, setSubPartsTitle] = useState("");
  const [subParts, setSubParts] = useState<Array<{name: string, icon?: string, price?: number}>>([]);
  const [newSubPartName, setNewSubPartName] = useState("");
  const [newSubPartIcon, setNewSubPartIcon] = useState("");
  const [newSubPartPrice, setNewSubPartPrice] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingSubPartIcon, setIsUploadingSubPartIcon] = useState(false);

  // icon_name이 URL인지 확인
  const isIconUrl = iconName.startsWith('http');

  // 세부 부위 아이콘 업로드
  const handleSubPartIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSubPartIcon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'sub-part-icons');

      const response = await fetch('/api/admin/upload/svg', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '업로드 실패');
      }

      setNewSubPartIcon(result.data.url);
    } catch (error: any) {
      console.error('세부 부위 아이콘 업로드 실패:', error);
      alert(`아이콘 업로드 실패: ${error.message}`);
    } finally {
      setIsUploadingSubPartIcon(false);
      e.target.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'repair-type-icons');

      const response = await fetch('/api/admin/upload/svg', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '업로드 실패');
      }

      setIconName(result.data.url);
    } catch (error: any) {
      console.error('SVG 업로드 실패:', error);
      alert(`SVG 업로드 실패: ${error.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!name || !price) {
      alert('필수 항목을 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      const inputLabels = requiresMultipleInputs 
        ? [inputLabel1 || '첫 번째 입력', inputLabel2 || '두 번째 입력']
        : ['치수 (cm)'];

      const response = await fetch('/api/admin/repair-menu/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          name,
          icon_name: iconName || null,
          description: description || null,
          price: parseInt(price),
          display_order: 999,
          requires_measurement: requiresMeasurement,
          requires_multiple_inputs: requiresMeasurement ? requiresMultipleInputs : false,
          input_count: (requiresMeasurement && requiresMultipleInputs) ? parseInt(inputCount) : 1,
          input_labels: inputLabels,
          has_sub_parts: hasSubParts,
          allow_multiple_sub_parts: hasSubParts ? allowMultipleSubParts : false,
          sub_parts_title: hasSubParts && subPartsTitle ? subPartsTitle : null,
          sub_parts: subParts,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '수선 항목 추가 실패');
      }

      setOpen(false);
      setName("");
      setIconName("");
      setDescription("");
      setPrice("");
      setRequiresMeasurement(true);
      setRequiresMultipleInputs(false);
      setInputCount("1");
      setInputLabel1("");
      setInputLabel2("");
      setHasSubParts(false);
      setAllowMultipleSubParts(false);
      setSubPartsTitle("");
      setSubParts([]);
      setNewSubPartName("");
      setNewSubPartIcon("");
      setNewSubPartPrice("");
      onAdded();
    } catch (error: any) {
      console.error('Add repair type error:', error);
      alert(`수선 항목 추가 실패:\n${error.message || error.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            항목 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{categoryName} - 수선 항목 추가</DialogTitle>
          <DialogDescription>
            새로운 수선 항목을 추가합니다
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div>
            <Label htmlFor="repair-name">수선명 *</Label>
            <Input
              id="repair-name"
              placeholder="예: 소매기장 줄임"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              그리드에 표시될 메인 메뉴명입니다
            </p>
          </div>

          {/* SVG 아이콘 업로드 */}
          <div className="space-y-3">
            <Label>아이콘 (SVG)</Label>
            
            {iconName && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {isIconUrl ? (
                  <SvgPreview url={iconName} size={64} />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isIconUrl ? 'SVG 업로드됨' : iconName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isIconUrl ? iconName : '로컬 아이콘'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIconName('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? '업로드 중...' : 'SVG 파일 업로드'}
                  </span>
                </Button>
              </label>
            </div>
            
            <div>
              <Label htmlFor="add-icon-manual" className="text-xs text-muted-foreground">
                또는 로컬 아이콘명 직접 입력
              </Label>
              <Input
                id="add-icon-manual"
                placeholder="예: scissors (앱에 포함된 SVG)"
                value={isIconUrl ? '' : iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">설명 (선택)</Label>
            <Input
              id="description"
              placeholder="예: 소매 또는 총장 기장 줄임"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="price">가격 *</Label>
            <Input
              id="price"
              type="number"
              placeholder="15000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              단위: 원
            </p>
          </div>

          {/* 고급 옵션 */}
          <div className="space-y-4 pt-4 border-t">
            <p className="text-sm font-medium">고급 옵션</p>
            
            {/* 수치 입력 필요 여부 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requires-measurement"
                checked={requiresMeasurement}
                onChange={(e) => setRequiresMeasurement(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="requires-measurement" className="text-sm font-normal cursor-pointer">
                수치 입력 필요 (체크 해제 시 선택만으로 완료)
              </Label>
            </div>
            
            {/* 입력값 2개 필요 */}
            {requiresMeasurement && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="multiple-inputs"
                    checked={requiresMultipleInputs}
                    onChange={(e) => {
                      setRequiresMultipleInputs(e.target.checked);
                      if (e.target.checked) {
                        setInputCount("2");
                      } else {
                        setInputCount("1");
                        setInputLabel1("");
                        setInputLabel2("");
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="multiple-inputs" className="text-sm font-normal cursor-pointer">
                    입력값 2개 필요
                  </Label>
                </div>

              {/* 입력 라벨 설정 */}
              {requiresMultipleInputs && (
                <div className="pl-6 space-y-2 bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-blue-900 mb-2">
                    📝 입력창 힌트 텍스트 설정
                  </p>
                  <div>
                    <Label htmlFor="input-label-1" className="text-xs">
                      첫 번째 입력창 힌트
                    </Label>
                    <Input
                      id="input-label-1"
                      placeholder="예: 왼쪽어깨"
                      value={inputLabel1}
                      onChange={(e) => setInputLabel1(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="input-label-2" className="text-xs">
                      두 번째 입력창 힌트
                    </Label>
                    <Input
                      id="input-label-2"
                      placeholder="예: 오른쪽어깨"
                      value={inputLabel2}
                      onChange={(e) => setInputLabel2(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
              </div>
            )}

            {/* 세부 부위 선택 */}
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="has-sub-parts"
                    checked={hasSubParts}
                    onChange={(e) => setHasSubParts(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="has-sub-parts" className="text-sm font-normal cursor-pointer">
                    세부 부위 선택 필요 (예: 앞섶, 뒤판, 왼팔, 오른팔)
                  </Label>
                </div>
              
              {/* 세부 항목 선택 화면 제목 */}
              {hasSubParts && (
                  <div className="pl-6 space-y-2 bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="allow-multiple-sub-parts"
                        checked={allowMultipleSubParts}
                        onChange={(e) => setAllowMultipleSubParts(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="allow-multiple-sub-parts" className="text-sm font-normal cursor-pointer">
                        세부 부위 다중 선택 허용
                      </Label>
                    </div>
                    <div>
                      <Label htmlFor="sub-parts-title" className="text-xs">
                        선택 화면 제목 (선택)
                      </Label>
                      <Input
                        id="sub-parts-title"
                        placeholder="예: 소매 모양을 선택하세요"
                        value={subPartsTitle}
                        onChange={(e) => setSubPartsTitle(e.target.value)}
                        className="h-9 text-sm mt-1"
                      />
                      <p className="text-xs text-purple-700 mt-1">
                        미입력 시 기본값: &quot;상세 수선 부위를 선택해주세요&quot;
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 세부 부위 목록 */}
              {hasSubParts && (
                <div className="pl-6 space-y-3 bg-amber-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-amber-900 mb-2">
                    🎯 세부 부위 목록 (예: 앞섶, 뒤판, 왼팔, 오른팔)
                  </p>
                  <p className="text-[11px] text-amber-800 -mt-1 mb-2">
                    ※ 부위 가격은 상위 항목 가격에 더해지지 않고, 그 자체가 결제 단가가 됩니다 (0원이면 상위 항목 가격으로 폴백).
                  </p>

                  {/* 세부 부위 추가 입력 */}
                  <div className="space-y-2">
                    <Input
                      placeholder="부위명 (예: 앞섶)"
                      value={newSubPartName}
                      onChange={(e) => setNewSubPartName(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          placeholder="아이콘 URL 또는 파일명"
                          value={newSubPartIcon}
                          onChange={(e) => setNewSubPartIcon(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <label>
                        <input
                          type="file"
                          accept=".svg,image/svg+xml"
                          onChange={handleSubPartIconUpload}
                          className="hidden"
                          disabled={isUploadingSubPartIcon}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingSubPartIcon}
                          asChild
                        >
                          <span className="cursor-pointer">
                            <Upload className="h-4 w-4" />
                          </span>
                        </Button>
                      </label>
                      {newSubPartIcon && newSubPartIcon.startsWith('http') && (
                        <div className="w-8 h-8 border rounded flex items-center justify-center bg-gray-50">
                          <SvgPreview url={newSubPartIcon} size={24} />
                        </div>
                      )}
                    </div>
                    <Input
                      placeholder="결제 단가 (예: 10000, 0이면 상위 항목 가격 사용)"
                      type="number"
                      value={newSubPartPrice}
                      onChange={(e) => setNewSubPartPrice(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (newSubPartName.trim()) {
                          setSubParts([
                            ...subParts, 
                            { 
                              name: newSubPartName.trim(),
                              icon: newSubPartIcon.trim() || undefined,
                              price: newSubPartPrice ? parseInt(newSubPartPrice) : 0
                            }
                          ]);
                          setNewSubPartName("");
                          setNewSubPartIcon("");
                          setNewSubPartPrice("");
                        }
                      }}
                    >
                      + 세부 부위 추가
                    </Button>
                  </div>

                  {/* 추가된 세부 부위 목록 */}
                  {subParts.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        추가된 부위 ({subParts.length}개)
                      </p>
                      {subParts.map((part, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {part.icon && part.icon.startsWith('http') && (
                              <div className="w-8 h-8 border rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
                                <SvgPreview url={part.icon} size={24} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{part.name}</p>
                              {part.icon && !part.icon.startsWith('http') && (
                                <span className="text-xs text-gray-500">
                                  {part.icon}
                                </span>
                              )}
                              {part.price && part.price > 0 && (
                                <p className="text-xs font-medium text-green-600">
                                  {part.price.toLocaleString()}원 (최종 단가)
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSubParts(subParts.filter((_, i) => i !== index));
                            }}
                            className="h-7 w-7 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !price || isLoading}>
            {isLoading ? "추가 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


