"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Edit, Trash2, Phone, Mail, Calendar } from "lucide-react";

type StaffMember = {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  phone: string;
  role: "MANAGER" | "WORKER";
  created_at: string;
  updated_at: string;
};

type CreateStaffData = {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: "MANAGER" | "WORKER";
};

type UpdateStaffData = {
  name: string;
  phone: string;
  role: "MANAGER" | "WORKER";
  password?: string;
};

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // 직원 목록 로드
  const loadStaffList = async () => {
    setIsLoading(true);
    try {
      const url = roleFilter !== "ALL" 
        ? `/api/admin/staff?role=${roleFilter}` 
        : "/api/admin/staff";
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setStaffList(result.data || []);
      } else {
        alert(`오류: ${result.error || "직원 목록을 불러오는데 실패했습니다."}`);
      }
    } catch (error) {
      console.error("직원 목록 로드 실패:", error);
      alert("오류: 직원 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffList();
  }, [roleFilter]);

  // 직원 생성
  const handleCreateStaff = async (data: CreateStaffData) => {
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ 직원 계정이 생성되었습니다.");
        setIsCreateDialogOpen(false);
        loadStaffList();
      } else {
        alert(`❌ 오류: ${result.error || "직원 계정 생성에 실패했습니다."}`);
      }
    } catch (error) {
      console.error("직원 생성 실패:", error);
      alert("❌ 오류: 직원 계정 생성에 실패했습니다.");
    }
  };

  // 직원 정보 수정
  const handleUpdateStaff = async (id: string, data: UpdateStaffData) => {
    try {
      const response = await fetch(`/api/admin/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ 직원 정보가 수정되었습니다.");
        setIsEditDialogOpen(false);
        setSelectedStaff(null);
        loadStaffList();
      } else {
        alert(`❌ 오류: ${result.error || "직원 정보 수정에 실패했습니다."}`);
      }
    } catch (error) {
      console.error("직원 정보 수정 실패:", error);
      alert("❌ 오류: 직원 정보 수정에 실패했습니다.");
    }
  };

  // 직원 삭제
  const handleDeleteStaff = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/staff/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ 직원 계정이 삭제되었습니다.");
        setIsDeleteDialogOpen(false);
        setSelectedStaff(null);
        loadStaffList();
      } else {
        alert(`❌ 오류: ${result.error || "직원 계정 삭제에 실패했습니다."}`);
      }
    } catch (error) {
      console.error("직원 삭제 실패:", error);
      alert("❌ 오류: 직원 계정 삭제에 실패했습니다.");
    }
  };

  // 역할 표시 텍스트
  const getRoleText = (role: string) => {
    return role === "MANAGER" ? "입출고 관리자" : "작업자";
  };

  // 전화번호 포맷팅
  const formatPhoneNumber = (phone: string) => {
    // 숫자만 추출
    const numbers = phone.replace(/[^\d]/g, "");
    
    // 010-1234-5678 형식으로 포맷팅
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length === 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
    return phone;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            직원 계정 관리
          </h1>
          <p className="text-muted-foreground mt-1">
            입출고 관리자 및 작업자 계정을 관리합니다
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          직원 등록
        </Button>
      </div>

      {/* 필터 및 통계 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체 직원</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffList.length}명</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">입출고 관리자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffList.filter((s) => s.role === "MANAGER").length}명
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">작업자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffList.filter((s) => s.role === "WORKER").length}명
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">역할 필터</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="MANAGER">입출고 관리자</SelectItem>
                <SelectItem value="WORKER">작업자</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* 직원 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>직원 목록</CardTitle>
          <CardDescription>
            등록된 직원 계정을 확인하고 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 직원이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {staffList.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{staff.name}</h3>
                      <Badge variant={staff.role === "MANAGER" ? "default" : "secondary"}>
                        {getRoleText(staff.role)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {staff.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {/* 전화번호 클릭 시 전화 걸기 (주석 처리) */}
                        {/* <a href={`tel:${staff.phone}`} className="hover:text-primary hover:underline"> */}
                          {formatPhoneNumber(staff.phone)}
                        {/* </a> */}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        입사일: {formatDate(staff.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 직원 등록 다이얼로그 */}
      <CreateStaffDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateStaff}
      />

      {/* 직원 수정 다이얼로그 */}
      {selectedStaff && (
        <EditStaffDialog
          open={isEditDialogOpen}
          staff={selectedStaff}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedStaff(null);
          }}
          onUpdate={(data) => handleUpdateStaff(selectedStaff.id, data)}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>직원 계정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <strong>{selectedStaff?.name}</strong> 직원의 계정을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedStaff(null)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedStaff && handleDeleteStaff(selectedStaff.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================
// 직원 등록 다이얼로그 컴포넌트
// ============================================
function CreateStaffDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateStaffData) => void;
}) {
  const [formData, setFormData] = useState<CreateStaffData>({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "WORKER",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (formData.password.length < 6) {
      alert("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setIsSubmitting(true);
    await onCreate(formData);
    setIsSubmitting(false);
    
    // 폼 초기화
    setFormData({
      email: "",
      password: "",
      name: "",
      phone: "",
      role: "WORKER",
    });
  };

  // 전화번호 자동 포맷팅
  const handlePhoneChange = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, "");
    
    // 최대 11자리
    if (numbers.length > 11) return;
    
    // 자동 하이픈 추가
    let formatted = numbers;
    if (numbers.length > 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length > 3) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }
    
    setFormData({ ...formData, phone: formatted });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>직원 계정 등록</DialogTitle>
          <DialogDescription>
            새로운 직원 계정을 생성합니다. 생성된 계정은 즉시 로그인 가능합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="홍길동"
                required
              />
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호 *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="010-1234-5678"
                required
              />
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일 (ID) *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@example.com"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="최소 6자 이상"
                minLength={6}
                required
              />
            </div>

            {/* 권한 선택 */}
            <div className="space-y-2">
              <Label htmlFor="role">권한 *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "MANAGER" | "WORKER") =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">입출고 관리자</SelectItem>
                  <SelectItem value="WORKER">작업자</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.role === "MANAGER"
                  ? "입출고 작업 및 관리 권한"
                  : "수선 작업 권한"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "생성 중..." : "계정 생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// 직원 수정 다이얼로그 컴포넌트
// ============================================
function EditStaffDialog({
  open,
  staff,
  onClose,
  onUpdate,
}: {
  open: boolean;
  staff: StaffMember;
  onClose: () => void;
  onUpdate: (data: UpdateStaffData) => void;
}) {
  const [formData, setFormData] = useState<UpdateStaffData>({
    name: staff.name,
    phone: staff.phone,
    role: staff.role,
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.name || !formData.phone) {
      alert("이름과 전화번호를 입력해주세요.");
      return;
    }

    if (formData.password && formData.password.length < 6) {
      alert("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setIsSubmitting(true);
    
    // 비밀번호가 입력되지 않았으면 제외
    const updateData = { ...formData };
    if (!updateData.password) {
      delete updateData.password;
    }
    
    await onUpdate(updateData);
    setIsSubmitting(false);
  };

  // 전화번호 자동 포맷팅
  const handlePhoneChange = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length > 11) return;
    
    let formatted = numbers;
    if (numbers.length > 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length > 3) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }
    
    setFormData({ ...formData, phone: formatted });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>직원 정보 수정</DialogTitle>
          <DialogDescription>
            {staff.name} 직원의 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 이메일 (수정 불가) */}
            <div className="space-y-2">
              <Label>이메일 (ID)</Label>
              <Input value={staff.email} disabled className="bg-gray-100 dark:bg-gray-800" />
              <p className="text-xs text-muted-foreground">이메일은 변경할 수 없습니다.</p>
            </div>

            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">이름 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="edit-phone">전화번호 *</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="010-1234-5678"
                required
              />
            </div>

            {/* 권한 선택 */}
            <div className="space-y-2">
              <Label htmlFor="edit-role">권한 *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "MANAGER" | "WORKER") =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">입출고 관리자</SelectItem>
                  <SelectItem value="WORKER">작업자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 비밀번호 변경 (선택) */}
            <div className="space-y-2">
              <Label htmlFor="edit-password">새 비밀번호 (선택)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="변경하지 않으려면 비워두세요"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                비밀번호를 변경하려면 최소 6자 이상 입력하세요.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "수정 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

