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
  sub_type?: string;
  description?: string;
  price: number;
  display_order: number;
  is_active: boolean;
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
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{type.name}</p>
                                {type.sub_type && (
                                  <Badge variant="outline" className="text-xs">
                                    {type.sub_type}
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
      const { error } = await supabase
        .from('repair_categories')
        .insert({
          name,
          icon_name: iconName || null,
          display_order: 999, // 마지막에 추가
        });

      if (error) throw error;

      setOpen(false);
      setName("");
      setIconName("");
      onAdded();
    } catch (error) {
      alert('카테고리 추가 실패: ' + error);
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
  const [subType, setSubType] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !price) {
      alert('필수 항목을 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('repair_types')
        .insert({
          category_id: categoryId,
          name,
          sub_type: subType || null,
          description: description || null,
          price: parseInt(price),
          display_order: 999,
        });

      if (error) throw error;

      setOpen(false);
      setName("");
      setSubType("");
      setDescription("");
      setPrice("");
      onAdded();
    } catch (error) {
      alert('수선 항목 추가 실패: ' + error);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{categoryName} - 수선 항목 추가</DialogTitle>
          <DialogDescription>
            새로운 수선 항목을 추가합니다
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="repair-name">수선명 *</Label>
            <Input
              id="repair-name"
              placeholder="예: 소매기장 줄임"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sub-type">세부 타입 (선택)</Label>
            <Input
              id="sub-type"
              placeholder="예: 기본형, 단추구멍형, 지퍼형"
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
            />
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


