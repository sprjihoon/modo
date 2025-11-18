"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

interface RepairCategory {
  id: string;
  name: string;
  display_order: number;
  icon_name?: string;
  is_active: boolean;
  repair_types?: RepairType[];
}

interface RepairType {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  display_order: number;
  is_active: boolean;
  requires_multiple_inputs?: boolean;
  input_count?: number;
  input_labels?: string[];
  has_sub_types?: boolean;    // 세부 타입 선택 필요 (기본형, 단추구멍형...)
  has_sub_parts?: boolean;    // 세부 부위 선택 필요 (앞섶, 뒤판...)
}

export default function RepairMenuPage() {
  const [categories, setCategories] = useState<RepairCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // 카테고리 및 수선 종류 로드
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 카테고리 조회
      const { data: categoriesData, error: catError } = await supabase
        .from('repair_categories')
        .select('*')
        .order('display_order');

      if (catError) throw catError;

      // 각 카테고리별 수선 종류 조회
      const categoriesWithTypes = await Promise.all(
        (categoriesData || []).map(async (cat) => {
          const { data: typesData } = await supabase
            .from('repair_types')
            .select('*')
            .eq('category_id', cat.id)
            .order('display_order');

          return {
            ...cat,
            repair_types: typesData || [],
          };
        })
      );

      setCategories(categoriesWithTypes);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
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

  // 카테고리 삭제
  const deleteCategory = async (categoryId: string) => {
    if (!confirm('이 카테고리와 하위 수선 항목을 모두 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('repair_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      alert('삭제 실패: ' + error);
    }
  };

  // 수선 항목 삭제
  const deleteRepairType = async (typeId: string) => {
    if (!confirm('이 수선 항목을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('repair_types')
        .delete()
        .eq('id', typeId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      alert('삭제 실패: ' + error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">수선 메뉴 관리</h1>
          <p className="text-muted-foreground mt-2">
            수선 카테고리 및 항목을 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          <AddCategoryDialog onAdded={loadData} />
        </div>
      </div>

      {/* 카테고리 목록 */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">등록된 카테고리가 없습니다</p>
              <AddCategoryDialog onAdded={loadData}>
                <Button className="mt-4">첫 카테고리 추가하기</Button>
              </AddCategoryDialog>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </Button>
                    <div>
                      <CardTitle className="text-xl">{category.name}</CardTitle>
                      <CardDescription>
                        {category.repair_types?.length || 0}개 항목
                      </CardDescription>
                    </div>
                    {!category.is_active && (
                      <Badge variant="secondary">비활성</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <EditCategoryDialog
                      category={category}
                      onUpdated={loadData}
                    />
                    <AddRepairTypeDialog
                      categoryId={category.id}
                      categoryName={category.name}
                      onAdded={loadData}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* 수선 항목 리스트 */}
              {expandedCategories.has(category.id) && (
                <CardContent>
                  {category.repair_types && category.repair_types.length > 0 ? (
                    <div className="space-y-2">
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
                                {type.requires_multiple_inputs && (
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                    입력×2
                                  </Badge>
                                )}
                                {type.has_sub_types && (
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                    세부타입
                                  </Badge>
                                )}
                                {type.has_sub_parts && (
                                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                    세부부위
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {type.price.toLocaleString()}원
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!type.is_active && (
                              <Badge variant="secondary">비활성</Badge>
                            )}
                            <EditRepairTypeDialog
                              repairType={type}
                              categoryName={category.name}
                              onUpdated={loadData}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRepairType(type.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>등록된 수선 항목이 없습니다</p>
                      <AddRepairTypeDialog
                        categoryId={category.id}
                        categoryName={category.name}
                        onAdded={loadData}
                      >
                        <Button variant="outline" size="sm" className="mt-3">
                          첫 항목 추가하기
                        </Button>
                      </AddRepairTypeDialog>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
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

  const handleSubmit = async () => {
    if (!name) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('repair_categories')
        .update({
          name,
          icon_name: iconName || null,
        })
        .eq('id', category.id);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || error.hint || '카테고리 수정 실패');
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
          <div>
            <Label htmlFor="edit-cat-icon">아이콘명 (선택)</Label>
            <Input
              id="edit-cat-icon"
              placeholder="예: outer"
              value={iconName}
              onChange={(e) => setIconName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              SVG 파일명 (확장자 제외)
            </p>
          </div>
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
function AddCategoryDialog({ onAdded, children }: { onAdded: () => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('repair_categories')
        .insert({
          name,
          icon_name: iconName || null,
          display_order: 999, // 마지막에 추가
        });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || error.hint || '카테고리 추가 실패');
      }

      setOpen(false);
      setName("");
      setIconName("");
      onAdded();
    } catch (error: any) {
      console.error('Add category error:', error);
      alert(`카테고리 추가 실패:\n${error.message || error.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            카테고리 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>카테고리 추가</DialogTitle>
          <DialogDescription>
            새로운 의류 카테고리를 추가합니다
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">카테고리명 *</Label>
            <Input
              id="name"
              placeholder="예: 아우터"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="icon">아이콘명 (선택)</Label>
            <Input
              id="icon"
              placeholder="예: outer"
              value={iconName}
              onChange={(e) => setIconName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              SVG 파일명 (확장자 제외)
            </p>
          </div>
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
  const [subType, setSubType] = useState(repairType.sub_type || "");
  const [description, setDescription] = useState(repairType.description || "");
  const [price, setPrice] = useState(repairType.price.toString());
  const [requiresMultipleInputs, setRequiresMultipleInputs] = useState(repairType.requires_multiple_inputs || false);
  const [inputLabel1, setInputLabel1] = useState(repairType.input_labels?.[0] || "");
  const [inputLabel2, setInputLabel2] = useState(repairType.input_labels?.[1] || "");
  const [hasSubParts, setHasSubParts] = useState(repairType.has_sub_parts || false);
  const [isLoading, setIsLoading] = useState(false);

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

      const { error } = await supabase
        .from('repair_types')
        .update({
          name,
          sub_type: subType || null,
          description: description || null,
          price: parseInt(price),
          requires_multiple_inputs: requiresMultipleInputs,
          input_count: requiresMultipleInputs ? 2 : 1,
          input_labels: inputLabels,
          has_sub_parts: hasSubParts,
        })
        .eq('id', repairType.id);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || error.hint || '수선 항목 수정 실패');
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
          <div>
            <Label htmlFor="edit-sub-type">세부 타입 (선택)</Label>
            <Input
              id="edit-sub-type"
              placeholder="예: 기본형, 단추구멍형"
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
            />
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
            
            {/* 입력값 2개 */}
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

            {/* 세부 부위 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-has-sub-parts"
                checked={hasSubParts}
                onChange={(e) => setHasSubParts(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-has-sub-parts" className="text-sm font-normal cursor-pointer">
                세부 부위 선택 필요
              </Label>
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
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [requiresMultipleInputs, setRequiresMultipleInputs] = useState(false);
  const [inputCount, setInputCount] = useState("1");
  const [inputLabel1, setInputLabel1] = useState("");
  const [inputLabel2, setInputLabel2] = useState("");
  
  // 세부 타입 (예: 기본형, 단추구멍형, 지퍼형)
  const [hasSubTypes, setHasSubTypes] = useState(false);
  const [subTypes, setSubTypes] = useState<Array<{name: string, price?: number}>>([]);
  const [newSubTypeName, setNewSubTypeName] = useState("");
  const [newSubTypePrice, setNewSubTypePrice] = useState("");
  
  // 세부 부위 (예: 앞섶, 뒤판, 왼팔, 오른팔)
  const [hasSubParts, setHasSubParts] = useState(false);
  const [subParts, setSubParts] = useState<Array<{name: string, icon?: string, price?: number}>>([]);
  const [newSubPartName, setNewSubPartName] = useState("");
  const [newSubPartIcon, setNewSubPartIcon] = useState("");
  const [newSubPartPrice, setNewSubPartPrice] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);

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

      // 1. 수선 종류 추가
      const { data: repairTypeData, error } = await supabase
        .from('repair_types')
        .insert({
          category_id: categoryId,
          name,
          description: description || null,
          price: parseInt(price),
          display_order: 999,
          requires_multiple_inputs: requiresMultipleInputs,
          input_count: requiresMultipleInputs ? parseInt(inputCount) : 1,
          input_labels: inputLabels,
          has_sub_types: hasSubTypes,
          has_sub_parts: hasSubParts,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || error.hint || '수선 항목 추가 실패');
      }

      // 2. 세부 타입 추가 (있는 경우)
      if (hasSubTypes && subTypes.length > 0 && repairTypeData) {
        const subTypesData = subTypes.map((type, index) => ({
          repair_type_id: repairTypeData.id,
          name: type.name,
          part_type: 'sub_type',
          price: type.price || 0,
          display_order: index + 1,
        }));

        const { error: subTypesError } = await supabase
          .from('repair_sub_parts')
          .insert(subTypesData);

        if (subTypesError) {
          console.error('Sub types insert error:', subTypesError);
        }
      }

      // 3. 세부 부위 추가 (있는 경우)
      if (hasSubParts && subParts.length > 0 && repairTypeData) {
        const subPartsData = subParts.map((part, index) => ({
          repair_type_id: repairTypeData.id,
          name: part.name,
          part_type: 'sub_part',
          icon_name: part.icon || null,
          price: part.price || 0,
          display_order: index + 1,
        }));

        const { error: subPartsError } = await supabase
          .from('repair_sub_parts')
          .insert(subPartsData);

        if (subPartsError) {
          console.error('Sub parts insert error:', subPartsError);
        }
      }

      setOpen(false);
      setName("");
      setDescription("");
      setPrice("");
      setRequiresMultipleInputs(false);
      setInputCount("1");
      setInputLabel1("");
      setInputLabel2("");
      setHasSubTypes(false);
      setSubTypes([]);
      setNewSubTypeName("");
      setNewSubTypePrice("");
      setHasSubParts(false);
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
            
            {/* 입력값 2개 필요 */}
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

            {/* 세부 타입 선택 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has-sub-types"
                  checked={hasSubTypes}
                  onChange={(e) => setHasSubTypes(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="has-sub-types" className="text-sm font-normal cursor-pointer">
                  세부 타입 선택 필요 (예: 기본형, 단추구멍형, 지퍼형)
                </Label>
              </div>

              {/* 세부 타입 목록 */}
              {hasSubTypes && (
                <div className="pl-6 space-y-3 bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-purple-900 mb-2">
                    🏷️ 세부 타입 목록 (그리드 클릭 후 선택 화면)
                  </p>
                  
                  {/* 세부 타입 추가 입력 */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="타입명 (예: 기본형)"
                        value={newSubTypeName}
                        onChange={(e) => setNewSubTypeName(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <Input
                        placeholder="가격 (15000)"
                        type="number"
                        value={newSubTypePrice}
                        onChange={(e) => setNewSubTypePrice(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (newSubTypeName.trim()) {
                          setSubTypes([
                            ...subTypes,
                            {
                              name: newSubTypeName.trim(),
                              price: newSubTypePrice ? parseInt(newSubTypePrice) : 0
                            }
                          ]);
                          setNewSubTypeName("");
                          setNewSubTypePrice("");
                        }
                      }}
                    >
                      + 세부 타입 추가
                    </Button>
                  </div>

                  {/* 추가된 세부 타입 목록 */}
                  {subTypes.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        추가된 타입 ({subTypes.length}개)
                      </p>
                      {subTypes.map((type, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{type.name}</p>
                            {type.price && type.price > 0 && (
                              <p className="text-xs font-medium text-green-600">
                                {type.price.toLocaleString()}원
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSubTypes(subTypes.filter((_, i) => i !== index));
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

            {/* 세부 부위 선택 */}
            <div className="space-y-3">
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

              {/* 세부 부위 목록 */}
              {hasSubParts && (
                <div className="pl-6 space-y-3 bg-amber-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-amber-900 mb-2">
                    🎯 세부 부위 목록 (예: 앞섶, 뒤판, 왼팔, 오른팔)
                  </p>
                  
                  {/* 세부 부위 추가 입력 */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Input
                          placeholder="부위명 (예: 앞섶)"
                          value={newSubPartName}
                          onChange={(e) => setNewSubPartName(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="아이콘 (front.svg)"
                          value={newSubPartIcon}
                          onChange={(e) => setNewSubPartIcon(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="가격 (10000)"
                          type="number"
                          value={newSubPartPrice}
                          onChange={(e) => setNewSubPartPrice(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
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
                          <div className="flex-1">
                            <p className="text-sm font-medium">{part.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {part.icon && (
                                <p className="text-xs text-muted-foreground">
                                  📎 {part.icon}
                                </p>
                              )}
                              {part.price && part.price > 0 && (
                                <p className="text-xs font-medium text-green-600">
                                  +{part.price.toLocaleString()}원
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


