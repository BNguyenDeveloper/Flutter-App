class LotteryStation {
  final String area;
  final String province;
  final String code;
  final String displayName;

  const LotteryStation({
    required this.area,
    required this.province,
    required this.code,
    required this.displayName,
  });

  factory LotteryStation.fromJson(Map<String, dynamic> json) {
    final provinceValue = json['province'] ?? json['name'] ?? '';
    final province = '$provinceValue'.trim();

    final codeValue = json['code'] ?? '';
    final code = '$codeValue'.trim().toUpperCase();

    final areaValue = json['area'] ?? 'mien_bac';
    final area = '$areaValue'.trim();

    final displayNameValue = json['displayName'] ?? province;
    final displayName = '$displayNameValue'.trim();

    return LotteryStation(
      area: area,
      province: province.isEmpty ? code : province,
      code: code,
      displayName: displayName.isEmpty ? province : displayName,
    );
  }
}
