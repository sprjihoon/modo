
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ExtraChargeRequest {
  id: string;
  worker_reason: string;
  requested_at: string;
  status: string;
  amount?: number;
  admin_note?: string;
  worker_name?: string;
}

interface ExtraChargeReviewDialogProps {
  orderId: string;
  requests: ExtraChargeRequest[];
  onReviewed: () => void;
}

export function ExtraChargeReviewDialog({ orderId, requests, onReviewed }: ExtraChargeReviewDialogProps) {
  const [selectedRequest, setSelectedRequest] = useState<ExtraChargeRequest | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [adminNote, setAdminNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const pendingRequests = requests.filter(r => r.status === "PENDING");

  const handleReview = async (action: "APPROVE" | "REJECT") => {
    if (!selectedRequest) return;
    if (action === "APPROVE" && (!amount || parseInt(amount) <= 0)) {
      alert("청구할 금액을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/extra-charge`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          amount: action === "APPROVE" ? parseInt(amount) : 0,
          adminNote
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      alert(action === "APPROVE" ? "✅ 고객에게 추가 결제 요청을 보냈습니다." : "반려되었습니다.");
      setIsOpen(false);
      setAmount("");
      setAdminNote("");
      setSelectedRequest(null);
      onReviewed();
    } catch (error: any) {
      console.error("Review failed:", error);
      alert(`처리 실패: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingRequests.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <AlertCircle className="h-4 w-4" />
          추가 비용 검토 ({pendingRequests.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>추가 비용 요청 검토</DialogTitle>
          <DialogDescription>
            작업자가 요청한 추가 비용 건입니다. 검토 후 고객에게 청구하거나 반려하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {pendingRequests.map(request => (
            <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm">요청자: {request.worker_name || "작업자"}</span>
                <span className="text-xs text-gray-500">{new Date(request.requested_at).toLocaleString()}</span>
              </div>
              <div className="bg-white p-3 rounded border text-sm mb-4">
                {request.worker_reason}
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>청구 금액 (원)</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>고객 안내 메시지 (선택)</Label>
                  <Textarea 
                    placeholder="고객에게 전달할 상세 내용을 입력하세요."
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700" 
                    onClick={() => {
                      setSelectedRequest(request);
                      handleReview("APPROVE");
                    }}
                    disabled={isSubmitting}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    승인 및 청구
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setSelectedRequest(request);
                      handleReview("REJECT");
                    }}
                    disabled={isSubmitting}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    반려
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

