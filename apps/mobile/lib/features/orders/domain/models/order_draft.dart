class PinData {
  final String id;
  final double relativeX;
  final double relativeY;
  final String memo;

  const PinData({
    required this.id,
    required this.relativeX,
    required this.relativeY,
    this.memo = '',
  });

  PinData copyWith({
    String? id,
    double? relativeX,
    double? relativeY,
    String? memo,
  }) {
    return PinData(
      id: id ?? this.id,
      relativeX: relativeX ?? this.relativeX,
      relativeY: relativeY ?? this.relativeY,
      memo: memo ?? this.memo,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'relative_x': relativeX,
        'relative_y': relativeY,
        'memo': memo,
      };

  factory PinData.fromJson(Map<String, dynamic> json) => PinData(
        id: json['id'] as String,
        relativeX: (json['relative_x'] as num).toDouble(),
        relativeY: (json['relative_y'] as num).toDouble(),
        memo: json['memo'] as String? ?? '',
      );
}

class ImageWithPins {
  final String imageUrl;
  final List<PinData> pins;

  const ImageWithPins({
    required this.imageUrl,
    this.pins = const [],
  });

  ImageWithPins copyWith({
    String? imageUrl,
    List<PinData>? pins,
  }) {
    return ImageWithPins(
      imageUrl: imageUrl ?? this.imageUrl,
      pins: pins ?? this.pins,
    );
  }

  Map<String, dynamic> toJson() => {
        'imageUrl': imageUrl,
        'pins': pins.map((p) => p.toJson()).toList(),
      };

  factory ImageWithPins.fromJson(Map<String, dynamic> json) => ImageWithPins(
        imageUrl: json['imageUrl'] as String,
        pins: (json['pins'] as List<dynamic>?)
                ?.map((p) => PinData.fromJson(p as Map<String, dynamic>))
                .toList() ??
            [],
      );
}

class RepairItem {
  final String name;
  final int price;
  final String priceRange;
  final int quantity;
  final String? detail;

  const RepairItem({
    required this.name,
    this.price = 0,
    this.priceRange = '',
    this.quantity = 1,
    this.detail,
  });

  RepairItem copyWith({
    String? name,
    int? price,
    String? priceRange,
    int? quantity,
    String? detail,
  }) {
    return RepairItem(
      name: name ?? this.name,
      price: price ?? this.price,
      priceRange: priceRange ?? this.priceRange,
      quantity: quantity ?? this.quantity,
      detail: detail ?? this.detail,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'price': price,
        'priceRange': priceRange,
        'quantity': quantity,
        if (detail != null) 'detail': detail,
      };

  factory RepairItem.fromJson(Map<String, dynamic> json) => RepairItem(
        name: json['name'] as String,
        price: (json['price'] as num).toInt(),
        priceRange: json['priceRange'] as String? ?? '',
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        detail: json['detail'] as String?,
      );
}

class ClothingItem {
  final String clothingType;
  final String? clothingCategoryId;
  final String? iconName;
  final List<RepairItem> repairItems;
  final List<ImageWithPins> imagesWithPins;

  const ClothingItem({
    required this.clothingType,
    this.clothingCategoryId,
    this.iconName,
    this.repairItems = const [],
    this.imagesWithPins = const [],
  });

  ClothingItem copyWith({
    String? clothingType,
    String? clothingCategoryId,
    String? iconName,
    List<RepairItem>? repairItems,
    List<ImageWithPins>? imagesWithPins,
  }) {
    return ClothingItem(
      clothingType: clothingType ?? this.clothingType,
      clothingCategoryId: clothingCategoryId ?? this.clothingCategoryId,
      iconName: iconName ?? this.iconName,
      repairItems: repairItems ?? this.repairItems,
      imagesWithPins: imagesWithPins ?? this.imagesWithPins,
    );
  }

  Map<String, dynamic> toJson() => {
        'clothingType': clothingType,
        if (clothingCategoryId != null) 'clothingCategoryId': clothingCategoryId,
        if (iconName != null) 'iconName': iconName,
        'repairItems': repairItems.map((r) => r.toJson()).toList(),
        'imagesWithPins': imagesWithPins.map((i) => i.toJson()).toList(),
      };

  factory ClothingItem.fromJson(Map<String, dynamic> json) => ClothingItem(
        clothingType: json['clothingType'] as String,
        clothingCategoryId: json['clothingCategoryId'] as String?,
        iconName: json['iconName'] as String?,
        repairItems: (json['repairItems'] as List<dynamic>?)
                ?.map((r) => RepairItem.fromJson(r as Map<String, dynamic>))
                .toList() ??
            [],
        imagesWithPins: (json['imagesWithPins'] as List<dynamic>?)
                ?.map((i) => ImageWithPins.fromJson(i as Map<String, dynamic>))
                .toList() ??
            [],
      );
}

class OrderDraft {
  final List<ClothingItem> items;
  final String? pickupAddress;
  final String? pickupAddressDetail;
  final String? pickupZipcode;
  final String? pickupPhone;
  final String? pickupDate;
  final String? notes;
  final String? deliveryAddress;
  final String? deliveryAddressDetail;
  final String? deliveryZipcode;
  final String? deliveryPhone;
  final bool? agreedToExtraCharge;
  final int? remoteAreaFee;

  const OrderDraft({
    this.items = const [],
    this.pickupAddress,
    this.pickupAddressDetail,
    this.pickupZipcode,
    this.pickupPhone,
    this.pickupDate,
    this.notes,
    this.deliveryAddress,
    this.deliveryAddressDetail,
    this.deliveryZipcode,
    this.deliveryPhone,
    this.agreedToExtraCharge,
    this.remoteAreaFee,
  });

  OrderDraft copyWith({
    List<ClothingItem>? items,
    String? pickupAddress,
    String? pickupAddressDetail,
    String? pickupZipcode,
    String? pickupPhone,
    String? pickupDate,
    String? notes,
    String? deliveryAddress,
    String? deliveryAddressDetail,
    String? deliveryZipcode,
    String? deliveryPhone,
    bool? agreedToExtraCharge,
    int? remoteAreaFee,
  }) {
    return OrderDraft(
      items: items ?? this.items,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      pickupAddressDetail: pickupAddressDetail ?? this.pickupAddressDetail,
      pickupZipcode: pickupZipcode ?? this.pickupZipcode,
      pickupPhone: pickupPhone ?? this.pickupPhone,
      pickupDate: pickupDate ?? this.pickupDate,
      notes: notes ?? this.notes,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      deliveryAddressDetail: deliveryAddressDetail ?? this.deliveryAddressDetail,
      deliveryZipcode: deliveryZipcode ?? this.deliveryZipcode,
      deliveryPhone: deliveryPhone ?? this.deliveryPhone,
      agreedToExtraCharge: agreedToExtraCharge ?? this.agreedToExtraCharge,
      remoteAreaFee: remoteAreaFee ?? this.remoteAreaFee,
    );
  }

  Map<String, dynamic> toJson() => {
        'items': items.map((i) => i.toJson()).toList(),
        if (pickupAddress != null) 'pickupAddress': pickupAddress,
        if (pickupAddressDetail != null) 'pickupAddressDetail': pickupAddressDetail,
        if (pickupZipcode != null) 'pickupZipcode': pickupZipcode,
        if (pickupPhone != null) 'pickupPhone': pickupPhone,
        if (pickupDate != null) 'pickupDate': pickupDate,
        if (notes != null) 'notes': notes,
        if (deliveryAddress != null) 'deliveryAddress': deliveryAddress,
        if (deliveryAddressDetail != null) 'deliveryAddressDetail': deliveryAddressDetail,
        if (deliveryZipcode != null) 'deliveryZipcode': deliveryZipcode,
        if (deliveryPhone != null) 'deliveryPhone': deliveryPhone,
        if (agreedToExtraCharge != null) 'agreedToExtraCharge': agreedToExtraCharge,
        if (remoteAreaFee != null) 'remoteAreaFee': remoteAreaFee,
      };

  factory OrderDraft.fromJson(Map<String, dynamic> json) => OrderDraft(
        items: (json['items'] as List<dynamic>?)
                ?.map((i) => ClothingItem.fromJson(i as Map<String, dynamic>))
                .toList() ??
            [],
        pickupAddress: json['pickupAddress'] as String?,
        pickupAddressDetail: json['pickupAddressDetail'] as String?,
        pickupZipcode: json['pickupZipcode'] as String?,
        pickupPhone: json['pickupPhone'] as String?,
        pickupDate: json['pickupDate'] as String?,
        notes: json['notes'] as String?,
        deliveryAddress: json['deliveryAddress'] as String?,
        deliveryAddressDetail: json['deliveryAddressDetail'] as String?,
        deliveryZipcode: json['deliveryZipcode'] as String?,
        deliveryPhone: json['deliveryPhone'] as String?,
        agreedToExtraCharge: json['agreedToExtraCharge'] as bool?,
        remoteAreaFee: (json['remoteAreaFee'] as num?)?.toInt(),
      );
}
