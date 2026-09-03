const kCartTtlDays = 5;

bool isCartExpired(DateTime addedAt, [DateTime? now]) {
  final at = now ?? DateTime.now();
  return !at.difference(addedAt).isNegative &&
      at.difference(addedAt) >= const Duration(days: kCartTtlDays);
}
