class AreaOption {
  final String label;
  final String value;

  const AreaOption({required this.label, required this.value});
}

const List<AreaOption> areaOptions = [
  AreaOption(label: 'Miền Bắc', value: 'mien_bac'),
  AreaOption(label: 'Miền Trung', value: 'mien_trung'),
  AreaOption(label: 'Miền Nam', value: 'mien_nam'),
];

String areaLabel(String value) {
  return areaOptions
      .firstWhere(
        (item) => item.value == value,
        orElse: () => const AreaOption(label: 'Miền Bắc', value: 'mien_bac'),
      )
      .label;
}

String formatPrizeName(String key) {
  const names = {
    'db': 'Giải đặc biệt',
    'g1': 'Giải nhất',
    'g2': 'Giải nhì',
    'g3': 'Giải ba',
    'g4': 'Giải tư',
    'g5': 'Giải năm',
    'g6': 'Giải sáu',
    'g7': 'Giải bảy',
    'g8': 'Giải tám',
  };

  return names[key] ?? key.toUpperCase();
}

List<String> extractLast2FromPrizes(Map prizes) {
  final numbers = <String>[];

  for (final value in prizes.values) {
    if (value is List) {
      for (final item in value) {
        final text = '$item';
        if (text.length >= 2) numbers.add(text.substring(text.length - 2));
      }
    }
  }

  return numbers;
}

String percent(dynamic score) {
  final value = score is num ? score.toDouble() : 0.0;
  return '${(value * 100).toStringAsFixed(1)}%';
}

String valueOf(Map item, List<String> keys, String fallback) {
  for (final key in keys) {
    final value = item[key];
    if (value != null) return '$value';
  }
  return fallback;
}
