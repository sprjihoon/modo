import 'package:flutter/material.dart';

/// 수거신청 플로우 4단계 진행률 표시
enum OrderFlowStepMode {
  list,
  addClothing,
  addSubCategory,
  addPhoto,
  addMeasurement,
  addRepair,
  pickup,
}

enum OrderFlowSubCategoryPhase { pre, post }

const orderFlowStepLabels = [
  '의류 선택',
  '사진 촬영',
  '수선 항목',
  '수거 정보',
];

int getOrderFlowStepIndex({
  required OrderFlowStepMode mode,
  OrderFlowSubCategoryPhase subCategoryPhase = OrderFlowSubCategoryPhase.pre,
}) {
  switch (mode) {
    case OrderFlowStepMode.addClothing:
      return 0;
    case OrderFlowStepMode.addSubCategory:
      return subCategoryPhase == OrderFlowSubCategoryPhase.pre ? 0 : 2;
    case OrderFlowStepMode.addPhoto:
      return 1;
    case OrderFlowStepMode.addMeasurement:
    case OrderFlowStepMode.addRepair:
      return 2;
    case OrderFlowStepMode.list:
      return 2;
    case OrderFlowStepMode.pickup:
      return 3;
  }
}

class OrderFlowProgress extends StatelessWidget {
  final int currentStep;

  static const _brandColor = Color(0xFF00C896);

  const OrderFlowProgress({
    required this.currentStep,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final clampedStep = currentStep.clamp(0, orderFlowStepLabels.length - 1);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade100),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: List.generate(orderFlowStepLabels.length, (idx) {
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: idx == 0 ? 0 : 2,
                    right: idx == orderFlowStepLabels.length - 1 ? 0 : 2,
                  ),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    height: 6,
                    decoration: BoxDecoration(
                      color: idx <= clampedStep
                          ? _brandColor
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          Row(
            children: List.generate(orderFlowStepLabels.length, (idx) {
              final isActive = idx == clampedStep;
              final isCompleted = idx < clampedStep;
              return Expanded(
                child: Text(
                  orderFlowStepLabels[idx],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 10,
                    height: 1.2,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                    color: isActive
                        ? _brandColor
                        : isCompleted
                            ? Colors.grey.shade600
                            : Colors.grey.shade300,
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
