const kMaxOrderImages = 5;
const kMaxPinsPerImage = 5;

class OrderImageUploadPlan {
  final int acceptedCount;
  final int remainingSlots;
  final int rejectedExtra;

  const OrderImageUploadPlan({
    required this.acceptedCount,
    required this.remainingSlots,
    required this.rejectedExtra,
  });
}

OrderImageUploadPlan planOrderImageUpload({
  required int pickedCount,
  required int currentCount,
  int reservedCount = 0,
  int max = kMaxOrderImages,
}) {
  final remainingSlots = (max - currentCount - reservedCount).clamp(0, max);
  if (remainingSlots <= 0) {
    return OrderImageUploadPlan(
      acceptedCount: 0,
      remainingSlots: 0,
      rejectedExtra: pickedCount < 0 ? 0 : pickedCount,
    );
  }
  final accepted = pickedCount < remainingSlots ? pickedCount : remainingSlots;
  return OrderImageUploadPlan(
    acceptedCount: accepted,
    remainingSlots: remainingSlots,
    rejectedExtra: pickedCount - accepted,
  );
}
