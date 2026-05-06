"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  AlertTriangle,
  RefreshCw,
  Send,
  Trash2,
  Package,
  TruckIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AddressSearchButton } from "@/components/ui/address-search-button";

interface AddressForm {
  name: string;
  zipcode: string;
  address: string;
  address_detail: string;
  phone: string;
}

interface TestLog {
  id: string;
  created_at: string;
  cancelled_at: string | null;
  sender_name: string;
  sender_zipcode: string;
  sender_address: string;
  sender_address_detail: string | null;
  sender_phone: string;
  receiver_name: string;
  receiver_zipcode: string;
  receiver_address: string;
  receiver_address_detail: string | null;
  receiver_phone: string;
  shipment_type: "pickup" | "delivery";
  pay_type: string;
  goods_name: string | null;
  weight_kg: number | null;
  volume_cm: number | null;
  micro_yn: string | null;
  size_preset: string | null;
  delivery_message: string | null;
  status: "BOOKED" | "CANCELLED" | "CANCEL_FAILED" | "BOOK_FAILED";
  tracking_no: string | null;
  req_no: string | null;
  res_no: string | null;
  regi_po_nm: string | null;
  res_date: string | null;
  price: string | null;
  note: string | null;
}

type SizePreset = "custom" | "micro" | "small" | "medium" | "large" | "xlarge";

interface SizeOption {
  id: SizePreset;
  label: string;
  description: string;
  weight: number; // 기본 중량(kg)
  volume: number; // 기본 크기(cm, 가로+세로+높이)
  microYn: "Y" | "N";
}

const SIZE_PRESETS: SizeOption[] = [
  {
    id: "micro",
    label: "극소형",
    description: "세 변 합 80cm 이하 / 2kg 이하",
    weight: 2,
    volume: 80,
    microYn: "Y",
  },
  {
    id: "small",
    label: "소형",
    description: "세 변 합 100cm 이하 / 5kg 이하",
    weight: 5,
    volume: 100,
    microYn: "N",
  },
  {
    id: "medium",
    label: "중형",
    description: "세 변 합 120cm 이하 / 10kg 이하",
    weight: 10,
    volume: 120,
    microYn: "N",
  },
  {
    id: "large",
    label: "대형",
    description: "세 변 합 140cm 이하 / 20kg 이하",
    weight: 20,
    volume: 140,
    microYn: "N",
  },
  {
    id: "xlarge",
    label: "특대형",
    description: "세 변 합 160cm 이하 / 30kg 이하",
    weight: 30,
    volume: 160,
    microYn: "N",
  },
  {
    id: "custom",
    label: "직접 입력",
    description: "중량/크기를 직접 지정",
    weight: 2,
    volume: 60,
    microYn: "N",
  },
];

const EMPTY_ADDR: AddressForm = {
  name: "",
  zipcode: "",
  address: "",
  address_detail: "",
  phone: "",
};

const STATUS_BADGE: Record<TestLog["status"], { label: string; className: string }> = {
  BOOKED: { label: "예약완료", className: "bg-green-100 text-green-800" },
  CANCELLED: { label: "취소됨", className: "bg-gray-200 text-gray-700" },
  CANCEL_FAILED: { label: "취소실패", className: "bg-red-100 text-red-800" },
  BOOK_FAILED: { label: "발행실패", className: "bg-red-100 text-red-800" },
};

function formatDateTime(s: string | null) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function formatResDate(s: string | null) {
  if (!s) return "-";
  if (s.length >= 8) {
    const y = s.substring(0, 4);
    const m = s.substring(4, 6);
    const d = s.substring(6, 8);
    return `${y}-${m}-${d}`;
  }
  return s;
}

export default function EpostTestPage() {
  const [sender, setSender] = useState<AddressForm>({ ...EMPTY_ADDR });
  const [receiver, setReceiver] = useState<AddressForm>({ ...EMPTY_ADDR });
  const [shipmentType, setShipmentType] = useState<"pickup" | "delivery">("pickup");
  const [goodsName, setGoodsName] = useState("의류 수선 (테스트)");
  const [sizePreset, setSizePreset] = useState<SizePreset>("small");
  const [weight, setWeight] = useState<number>(5);
  const [volume, setVolume] = useState<number>(100);
  const [microYn, setMicroYn] = useState<"Y" | "N">("N");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [note, setNote] = useState("");

  const onSelectSizePreset = useCallback((id: SizePreset) => {
    setSizePreset(id);
    const opt = SIZE_PRESETS.find((s) => s.id === id);
    if (!opt) return;
    if (id !== "custom") {
      setWeight(opt.weight);
      setVolume(opt.volume);
      setMicroYn(opt.microYn);
    }
  }, []);

  const [confirmAck, setConfirmAck] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [logs, setLogs] = useState<TestLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<TestLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/epost-test/list?limit=50", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (e) {
      console.error("로그 조회 실패:", e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const validate = (): string | null => {
    const fields: { label: string; value: string }[] = [
      { label: "보내는 사람 이름", value: sender.name },
      { label: "보내는 사람 우편번호", value: sender.zipcode },
      { label: "보내는 사람 주소", value: sender.address },
      { label: "보내는 사람 전화번호", value: sender.phone },
      { label: "받는 사람 이름", value: receiver.name },
      { label: "받는 사람 우편번호", value: receiver.zipcode },
      { label: "받는 사람 주소", value: receiver.address },
      { label: "받는 사람 전화번호", value: receiver.phone },
    ];
    for (const f of fields) {
      if (!f.value || !f.value.trim()) return `${f.label}을(를) 입력하세요.`;
    }
    if (!/^\d{5}$/.test(sender.zipcode.replace(/[-\s]/g, ""))) {
      return "보내는 사람 우편번호는 5자리 숫자여야 합니다.";
    }
    if (!/^\d{5}$/.test(receiver.zipcode.replace(/[-\s]/g, ""))) {
      return "받는 사람 우편번호는 5자리 숫자여야 합니다.";
    }
    return null;
  };

  const onClickSubmit = () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    if (!confirmAck) {
      alert(
        "⚠️ 실제 우체국 수거기사가 출동합니다. 동의 체크박스를 먼저 선택하세요."
      );
      return;
    }
    setShowConfirm(true);
  };

  const submitNow = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const payload = {
        sender_name: sender.name.trim(),
        sender_zipcode: sender.zipcode.replace(/[-\s]/g, ""),
        sender_address: sender.address.trim(),
        sender_address_detail: sender.address_detail.trim() || undefined,
        sender_phone: sender.phone.trim(),
        receiver_name: receiver.name.trim(),
        receiver_zipcode: receiver.zipcode.replace(/[-\s]/g, ""),
        receiver_address: receiver.address.trim(),
        receiver_address_detail: receiver.address_detail.trim() || undefined,
        receiver_phone: receiver.phone.trim(),
        shipment_type: shipmentType,
        goods_name: goodsName || undefined,
        weight,
        volume,
        micro_yn: microYn,
        size_preset: sizePreset,
        delivery_message: deliveryMessage || undefined,
        note: note || undefined,
      };

      const res = await fetch("/api/epost-test/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(`발행 실패\n${data?.error || "알 수 없는 오류"}`);
      } else {
        alert(
          `✅ 송장 발행 완료\n\n송장번호: ${
            data.data?.tracking_no || "-"
          }\n접수우체국: ${data.data?.epost?.regiPoNm || "-"}\n예약일시: ${
            data.data?.epost?.resDate || "-"
          }\n예상요금: ${data.data?.epost?.price || "-"}`
        );
        setConfirmAck(false);
        await loadLogs();
      }
    } catch (e: any) {
      alert(`오류: ${e?.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelLog = async (log: TestLog) => {
    setShowCancelConfirm(null);
    setCancellingId(log.id);
    try {
      const res = await fetch("/api/epost-test/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_id: log.id, delete_after_cancel: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(`취소 실패\n${data?.error || "알 수 없는 오류"}`);
      } else {
        alert("✅ 송장이 취소되었습니다.");
        await loadLogs();
      }
    } catch (e: any) {
      alert(`오류: ${e?.message || e}`);
    } finally {
      setCancellingId(null);
    }
  };

  const renderAddressCard = (
    title: string,
    state: AddressForm,
    setState: (s: AddressForm) => void,
    color: string
  ) => (
    <Card className={`border-2 ${color}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">이름 / 회사명</Label>
          <Input
            value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })}
            placeholder="홍길동"
          />
        </div>
        <div>
          <Label className="text-xs">전화번호</Label>
          <Input
            value={state.phone}
            onChange={(e) => setState({ ...state, phone: e.target.value })}
            placeholder="010-1234-5678"
          />
        </div>
        <div>
          <Label className="text-xs">우편번호</Label>
          <div className="flex gap-2">
            <Input
              value={state.zipcode}
              onChange={(e) => setState({ ...state, zipcode: e.target.value })}
              placeholder="12345"
              maxLength={5}
            />
            <AddressSearchButton
              label="주소 검색"
              onSelect={(zipcode, address) =>
                setState({ ...state, zipcode, address })
              }
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">주소</Label>
          <Input
            value={state.address}
            onChange={(e) => setState({ ...state, address: e.target.value })}
            placeholder="서울시 강남구 ..."
          />
        </div>
        <div>
          <Label className="text-xs">상세주소</Label>
          <Input
            value={state.address_detail}
            onChange={(e) => setState({ ...state, address_detail: e.target.value })}
            placeholder="동/호수 등"
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">우체국 자유 수거/발송 테스트</h1>
          <p className="text-muted-foreground mt-1">
            임의의 보내는 주소 → 받는 주소로 우체국 API를 호출합니다.{" "}
            <span className="text-red-600 font-semibold">실제 수거기사가 출동합니다.</span>
          </p>
        </div>
      </div>

      {/* 경고 배너 */}
      <Card className="border-2 border-red-300 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            실제 수거기사 출동 경고
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-red-800">
          <p>• 본 페이지는 <strong>실제 우체국 운영 서버</strong>로 송장을 발행합니다.</p>
          <p>• 발행 즉시 <strong>실제 수거기사가 입력한 주소로 출동</strong>합니다.</p>
          <p>• 잘못 발행한 경우 가능한 한 즉시 <strong>&ldquo;취소&rdquo; 버튼</strong>으로 취소하세요. (집하 완료 후엔 취소 불가)</p>
          <p>• 본 테스트는 <code className="bg-red-100 px-1 rounded">epost_test_logs</code> 테이블에만 저장되며, 일반 주문/배송과는 무관합니다.</p>
        </CardContent>
      </Card>

      {/* 입력 폼 */}
      <div className="grid gap-4 md:grid-cols-2">
        {renderAddressCard("📤 보내는 사람", sender, setSender, "border-blue-200")}
        {renderAddressCard("📥 받는 사람", receiver, setReceiver, "border-orange-200")}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">소포 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">소포 유형</Label>
            <Select
              value={shipmentType}
              onValueChange={(v) => setShipmentType(v as "pickup" | "delivery")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">반품소포 (수거 / 착불 / 송장 7로 시작)</SelectItem>
                <SelectItem value="delivery">일반소포 (발송 / 선불 / 송장 6으로 시작)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-2 block">소포 규격</Label>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
              {SIZE_PRESETS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectSizePreset(opt.id)}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${
                    sizePreset === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{opt.label}</div>
                    {opt.microYn === "Y" && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        microYn=Y
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs">
                중량 (kg) {sizePreset !== "custom" && <span className="text-muted-foreground">- 규격 자동</span>}
              </Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 2)}
                disabled={sizePreset !== "custom"}
              />
            </div>
            <div>
              <Label className="text-xs">
                크기 (cm, 세 변 합) {sizePreset !== "custom" && <span className="text-muted-foreground">- 규격 자동</span>}
              </Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value) || 60)}
                disabled={sizePreset !== "custom"}
              />
            </div>
            <div>
              <Label className="text-xs">초소형 여부 (microYn)</Label>
              <Select
                value={microYn}
                onValueChange={(v) => setMicroYn(v as "Y" | "N")}
                disabled={sizePreset !== "custom"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">N (일반)</SelectItem>
                  <SelectItem value="Y">Y (초소형)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">상품명</Label>
            <Input
              value={goodsName}
              onChange={(e) => setGoodsName(e.target.value)}
              placeholder="의류 수선 (테스트)"
            />
          </div>
          <div>
            <Label className="text-xs">배송 메시지 (delivMsg)</Label>
            <Textarea
              value={deliveryMessage}
              onChange={(e) => setDeliveryMessage(e.target.value)}
              placeholder="문 앞에 놔주세요 등"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">메모 (관리자용 / DB 만 저장)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: A→B 직배송 가능여부 테스트"
            />
          </div>
        </CardContent>
      </Card>

      {/* 동의 + 발행 */}
      <Card className="border-2 border-red-300">
        <CardContent className="pt-6 space-y-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={confirmAck}
              onChange={(e) => setConfirmAck(e.target.checked)}
            />
            <span className="text-sm">
              <strong className="text-red-700">실제 수거기사가 출동</strong>한다는 점을 이해했으며,
              입력한 보내는 사람 / 받는 사람 주소가 맞는지 확인했습니다.
            </span>
          </label>
          <Button
            type="button"
            size="lg"
            disabled={!confirmAck || submitting}
            onClick={onClickSubmit}
            className="bg-red-600 hover:bg-red-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "발행 중..." : "송장 발행 (실제 호출)"}
          </Button>
        </CardContent>
      </Card>

      {/* 결과 / 이력 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">테스트 이력 (최근 50건)</h2>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingLogs ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              아직 테스트 이력이 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const badge = STATUS_BADGE[log.status];
              const canCancel = log.status === "BOOKED" && !!log.tracking_no;
              return (
                <Card key={log.id} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={badge.className}>{badge.label}</Badge>
                        <Badge variant="outline">
                          {log.shipment_type === "pickup" ? (
                            <>
                              <Package className="h-3 w-3 mr-1" />
                              반품소포(수거)
                            </>
                          ) : (
                            <>
                              <TruckIcon className="h-3 w-3 mr-1" />
                              일반소포(발송)
                            </>
                          )}
                        </Badge>
                        {log.tracking_no && (
                          <span className="text-sm font-mono">송장: {log.tracking_no}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </span>
                        {canCancel && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={cancellingId === log.id}
                            onClick={() => setShowCancelConfirm(log)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {cancellingId === log.id ? "취소 중..." : "취소"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold text-blue-700 mb-1">
                          📤 보내는 사람
                        </div>
                        <div className="text-sm">
                          <div>{log.sender_name} ({log.sender_phone})</div>
                          <div className="text-muted-foreground">
                            ({log.sender_zipcode}) {log.sender_address}{" "}
                            {log.sender_address_detail || ""}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-orange-700 mb-1">
                          📥 받는 사람
                        </div>
                        <div className="text-sm">
                          <div>{log.receiver_name} ({log.receiver_phone})</div>
                          <div className="text-muted-foreground">
                            ({log.receiver_zipcode}) {log.receiver_address}{" "}
                            {log.receiver_address_detail || ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-4 text-sm border-t pt-3">
                      <div>
                        <div className="text-xs text-muted-foreground">접수 우체국</div>
                        <div>{log.regi_po_nm || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">예약일</div>
                        <div>{formatResDate(log.res_date)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">예상요금</div>
                        <div>{log.price ? `${parseInt(log.price).toLocaleString()}원` : "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">규격 / 중량 / 크기</div>
                        <div>
                          {log.size_preset
                            ? SIZE_PRESETS.find((s) => s.id === log.size_preset)?.label || log.size_preset
                            : "-"}
                          {" · "}
                          {log.weight_kg || "-"}kg / {log.volume_cm || "-"}cm
                          {log.micro_yn === "Y" && (
                            <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
                              micro
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {log.delivery_message && (
                      <div className="mt-3 text-sm">
                        <span className="text-xs text-muted-foreground">배송메시지: </span>
                        {log.delivery_message}
                      </div>
                    )}
                    {log.note && (
                      <div className="mt-1 text-sm">
                        <span className="text-xs text-muted-foreground">메모: </span>
                        {log.note}
                      </div>
                    )}

                    {log.cancelled_at && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        취소 처리: {formatDateTime(log.cancelled_at)}
                      </div>
                    )}
                    {log.status === "BOOK_FAILED" && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                        <XCircle className="h-3.5 w-3.5" />
                        발행 실패
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 발행 최종 확인 다이얼로그 */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">
              ⚠️ 실제 수거기사 출동 - 최종 확인
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 pt-2">
                <div className="text-sm">
                  아래 정보로 <strong>실제 우체국에 송장을 발행</strong>합니다.
                </div>
                <div className="rounded border p-3 bg-gray-50 text-sm space-y-1">
                  <div>
                    <strong>유형:</strong>{" "}
                    {shipmentType === "pickup" ? "반품소포 (수거)" : "일반소포 (발송)"}
                  </div>
                  <div>
                    <strong>📤 보내는 사람:</strong> {sender.name} / ({sender.zipcode}){" "}
                    {sender.address} {sender.address_detail}
                  </div>
                  <div>
                    <strong>📥 받는 사람:</strong> {receiver.name} / ({receiver.zipcode}){" "}
                    {receiver.address} {receiver.address_detail}
                  </div>
                </div>
                <div className="text-sm text-red-600 font-semibold">
                  발행하시겠습니까?
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitNow}
              className="bg-red-600 hover:bg-red-700"
            >
              발행 (실제 호출)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 취소 확인 다이얼로그 */}
      <AlertDialog
        open={!!showCancelConfirm}
        onOpenChange={(open) => !open && setShowCancelConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>송장 취소</AlertDialogTitle>
            <AlertDialogDescription>
              송장번호 <strong>{showCancelConfirm?.tracking_no}</strong>를 우체국에서 취소하고
              완전 삭제합니다. 이미 집하 완료된 경우 취소되지 않을 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showCancelConfirm && cancelLog(showCancelConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              취소 실행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
