"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";

const statusMap = {
  BOOKED: { label: "수거예약", color: "bg-blue-100 text-blue-800" },
  INBOUND: { label: "입고완료", color: "bg-orange-100 text-orange-800" },
  PROCESSING: { label: "수선중", color: "bg-purple-100 text-purple-800" },
  READY_TO_SHIP: { label: "출고완료", color: "bg-green-100 text-green-800" },
  DELIVERED: { label: "배송완료", color: "bg-gray-100 text-gray-800" },
};

export default function OrdersPage() {
  const [search, setSearch] = useState("");

  // Mock data
  const orders = Array.from({ length: 20 }, (_, i) => ({
    id: `ORDER-2024-${(i + 1).toString().padStart(4, "0")}`,
    customerName: `고객${i + 1}`,
    item: `청바지 기장 수선 ${i + 1}`,
    trackingNo: `123456789${i}`,
    status: Object.keys(statusMap)[i % 5] as keyof typeof statusMap,
    amount: (i + 1) * 15000,
    createdAt: `2024.01.${((i % 28) + 1).toString().padStart(2, "0")}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">주문 관리</h1>
          <p className="text-muted-foreground">전체 수선 주문을 관리합니다</p>
        </div>
        <Button>
          <Filter className="mr-2 h-4 w-4" />
          필터
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="주문번호, 송장번호, 고객명으로 검색..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>총 {orders.length}개의 주문</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {orders.map((order) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{order.item}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.id} • {order.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        송장: {order.trackingNo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={statusMap[order.status].color}>
                      {statusMap[order.status].label}
                    </Badge>
                    <div className="text-right">
                      <p className="font-medium">₩{order.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{order.createdAt}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

