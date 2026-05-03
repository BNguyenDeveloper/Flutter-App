import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/lottery_station.dart';
import 'constants.dart';

class ApiClient {
  static Uri uri(String path, [Map<String, String>? query]) {
    return Uri.parse('$apiBase$path').replace(queryParameters: query);
  }

  static Future<List<LotteryStation>> fetchProvinces(String area) async {
    final response = await http.get(uri('/api/provinces', {'area': area}));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không tải được danh sách đài');
    }

    final decoded = jsonDecode(response.body);
    final list = decoded is List ? decoded : decoded['data'];

    if (list is! List) return [];

    return list
        .whereType<Map>()
        .map((item) => LotteryStation.fromJson(Map<String, dynamic>.from(item)))
        .where((station) => station.code.isNotEmpty)
        .toList();
  }

  static Future<Map<String, dynamic>?> fetchLatestResult(String code) async {
    final response = await http.get(uri('/api/results/latest', {'code': code}));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không tải được kết quả');
    }

    final decoded = jsonDecode(response.body);

    if (decoded['data'] is Map) {
      return Map<String, dynamic>.from(decoded['data']);
    }

    if (decoded['result'] is Map) {
      return Map<String, dynamic>.from(decoded['result']);
    }

    if (decoded is Map) {
      return Map<String, dynamic>.from(decoded);
    }

    return null;
  }

  static Future<List<dynamic>> fetchTopFrequency(String code, String type) async {
    final response = await http.get(
      uri('/api/stats/top-frequency', {'code': code, 'type': type}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không tải được thống kê tần suất');
    }

    final decoded = jsonDecode(response.body);
    final data = decoded['data'];
    return data is List ? data : [];
  }

  static Future<List<dynamic>> fetchLongestMissing(String code, String type) async {
    final response = await http.get(
      uri('/api/stats/longest-missing', {'code': code, 'type': type}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không tải được thống kê gan');
    }

    final decoded = jsonDecode(response.body);
    final data = decoded['data'];
    return data is List ? data : [];
  }

  static Future<List<dynamic>> fetchSpecialFrequency(String code, String type) async {
    final response = await http.get(
      uri('/api/stats/special-frequency', {'code': code, 'type': type}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không tải được thống kê giải đặc biệt');
    }

    final decoded = jsonDecode(response.body);
    final data = decoded['data'];
    return data is List ? data : [];
  }


  static Future<List<dynamic>> fetchTodayPrediction({
    required String area,
    required String province,
    required String code,
    int topK = 5,
  }) async {
    final response = await http
        .get(
          uri('/api/predictions/today', {
            'area': area,
            'province': province,
            'code': code,
          }),
        )
        .timeout(const Duration(seconds: 5));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không tải được gợi ý hôm nay');
    }

    final decoded = jsonDecode(response.body);
    final data = decoded['data'];

    if (data is Map && data['numbers'] is List) {
      return List<dynamic>.from(data['numbers']).take(topK).toList();
    }

    if (data is Map && data['predictions'] is List) {
      return List<dynamic>.from(data['predictions']).take(topK).toList();
    }

    if (decoded['numbers'] is List) {
      return List<dynamic>.from(decoded['numbers']).take(topK).toList();
    }

    if (decoded['prediction'] is Map && decoded['prediction']['numbers'] is List) {
      return List<dynamic>.from(decoded['prediction']['numbers']).take(topK).toList();
    }

    return [];
  }

  static Future<List<dynamic>> generatePrediction({
    required String area,
    required String province,
    required String code,
    int topK = 10,
  }) async {
    final response = await http
        .post(
          uri('/api/predictions/generate'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'area': area,
            'province': province,
            'code': code,
            'topK': topK,
          }),
        )
        .timeout(const Duration(seconds: 12));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Không tạo được dự đoán: ${response.body}');
    }

    final decoded = jsonDecode(response.body);
    final data = decoded['data'];

    if (data is Map && data['predictions'] is List) {
      return List<dynamic>.from(data['predictions']);
    }

    if (data is Map && data['numbers'] is List) {
      return List<dynamic>.from(data['numbers']);
    }

    if (decoded['numbers'] is List) {
      return List<dynamic>.from(decoded['numbers']);
    }

    if (decoded['prediction'] is Map && decoded['prediction']['numbers'] is List) {
      return List<dynamic>.from(decoded['prediction']['numbers']);
    }

    if (data is List) {
      return List<dynamic>.from(data);
    }

    return [];
  }
}
