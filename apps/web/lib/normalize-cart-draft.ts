import type {
  ClothingItem,
  ImageWithPins,
  OrderDraft,
  RepairItem,
} from "@/components/order/OrderNewClient";
import { repairItemDetail } from "./repair-parts";

/**
 * Supabase 에 저장된 draft_data 를 신규 OrderDraft (items[]) 형태로 정규화한다.
 *
 * 지원하는 입력 포맷:
 * 1. 신규: items: ClothingItem[] (비어 있으면 2·3으로 넘어감)
 * 2. 웹 단일: 최상위에 clothingType / repairItems / imagesWithPins
 * 3. 옛 모바일: 최상위에 repairItem 단일 맵
 */
export function normalizeStoredDraft(raw: Record<string, unknown>): OrderDraft {
  const pickup: Partial<OrderDraft> = {
    pickupAddress: raw.pickupAddress as string | undefined,
    pickupAddressDetail: raw.pickupAddressDetail as string | undefined,
    pickupZipcode: raw.pickupZipcode as string | undefined,
    pickupPhone: raw.pickupPhone as string | undefined,
    pickupDate: raw.pickupDate as string | undefined,
    notes: raw.notes as string | undefined,
    deliveryAddress: raw.deliveryAddress as string | undefined,
    deliveryAddressDetail: raw.deliveryAddressDetail as string | undefined,
    deliveryZipcode: raw.deliveryZipcode as string | undefined,
    deliveryPhone: raw.deliveryPhone as string | undefined,
    agreedToExtraCharge: raw.agreedToExtraCharge as boolean | undefined,
    remoteAreaFee: raw.remoteAreaFee as number | undefined,
  };

  const itemsList = Array.isArray(raw.items) ? (raw.items as unknown[]) : [];
  if (itemsList.length > 0) {
    const items = itemsList.map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const ci: ClothingItem = {
        clothingType: (o.clothingType as string) ?? "",
        clothingCategoryId: o.clothingCategoryId as string | undefined,
        repairItems: Array.isArray(o.repairItems)
          ? (o.repairItems as RepairItem[])
          : [],
        imagesWithPins: Array.isArray(o.imagesWithPins)
          ? (o.imagesWithPins as ImageWithPins[])
          : [],
      };
      return ci;
    });
    return { items, ...pickup };
  }

  if (!Array.isArray(raw.repairItems) && raw.repairItem) {
    const ri = raw.repairItem as Record<string, unknown>;
    const single: ClothingItem = {
      clothingType: (raw.clothingType as string) ?? "",
      repairItems: [{
        name: (ri.repairPart as string) ?? (ri.name as string) ?? "",
        price: typeof ri.price === "number" ? ri.price : 0,
        priceRange: (ri.priceRange as string) ?? "",
        quantity: 1,
        detail: repairItemDetail(ri),
      }],
      imagesWithPins: [],
    };
    return { items: [single], ...pickup };
  }

  const single: ClothingItem = {
    clothingType: (raw.clothingType as string) ?? "",
    clothingCategoryId: raw.clothingCategoryId as string | undefined,
    repairItems: Array.isArray(raw.repairItems)
      ? (raw.repairItems as RepairItem[])
      : [],
    imagesWithPins: Array.isArray(raw.imagesWithPins)
      ? (raw.imagesWithPins as ImageWithPins[])
      : [],
  };
  const hasContent =
    single.clothingType ||
    single.repairItems.length > 0 ||
    single.imagesWithPins.length > 0;
  return { items: hasContent ? [single] : [], ...pickup };
}
