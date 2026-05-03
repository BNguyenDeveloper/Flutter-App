import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../state/app_state.dart';
import '../widgets/app_card.dart';
import '../widgets/number_chip.dart';
import '../widgets/page_header.dart';
import '../widgets/station_selector.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String latest = 'Đang tải...';
  List quickNumbers = [];
  bool loadingLatest = false;
  bool loadingPrediction = false;
  int _loadToken = 0;

  @override
  void initState() {
    super.initState();
    appState.addListener(load);
    load();
  }

  @override
  void dispose() {
    appState.removeListener(load);
    super.dispose();
  }

  Future<void> load() async {
    final station = appState.selectedStation;
    if (station == null) return;

    final token = ++_loadToken;

    setState(() {
      loadingLatest = true;
      loadingPrediction = true;
      latest = 'Đang tải...';
      quickNumbers = [];
    });

    await Future.wait([
      loadLatestOnly(token),
      loadQuickPredictionOnly(token),
    ]);
  }

  bool _isCurrentLoad(int token) {
    return mounted && token == _loadToken;
  }

  Future<void> loadLatestOnly(int token) async {
    final station = appState.selectedStation;
    if (station == null) return;

    try {
      final result = await ApiClient.fetchLatestResult(station.code);
      final prizes = result?['prizes'] is Map
          ? Map<String, dynamic>.from(result!['prizes'])
          : <String, dynamic>{};
      final dbList = prizes['db'] is List ? prizes['db'] as List : const [];
      final special = result?['special'] ?? (dbList.isNotEmpty ? dbList.first : '-');
      final drawDateValue = result == null ? '' : result['drawDate'] ?? '';
      final date = result?['date'] ?? '$drawDateValue'.split('T').first;

      if (!_isCurrentLoad(token)) return;
      setState(() {
        latest = result == null
            ? 'Chưa có dữ liệu cho đài này'
            : '$date - Giải đặc biệt: $special';
        loadingLatest = false;
      });
    } catch (_) {
      if (!_isCurrentLoad(token)) return;
      setState(() {
        latest = 'Không kết nối được máy chủ';
        loadingLatest = false;
      });
    }
  }

  Future<void> loadQuickPredictionOnly(int token) async {
    final station = appState.selectedStation;
    if (station == null) return;

    try {
      var predictionNumbers = await ApiClient.fetchTodayPrediction(
        area: station.area,
        province: station.province,
        code: station.code,
        topK: 5,
      );

      if (!_isCurrentLoad(token)) return;
      setState(() {
        quickNumbers = predictionNumbers;
        loadingPrediction = false;
      });
    } catch (_) {
      if (!_isCurrentLoad(token)) return;
      setState(() {
        quickNumbers = [];
        loadingPrediction = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const PageHeader(
              title: 'Dự đoán Xổ số AI',
              subtitle: 'Phân tích dữ liệu cũ và đưa ra gợi ý tham khảo.',
            ),
            const SizedBox(height: 18),
            const StationSelector(),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Kết quả gần nhất',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  loadingLatest
                      ? const Center(child: CircularProgressIndicator())
                      : Text(
                          latest,
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                        ),
                ],
              ),
            ),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Gợi ý nhanh',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  if (loadingPrediction)
                    const Center(child: CircularProgressIndicator())
                  else if (quickNumbers.isEmpty)
                    const Text('Chưa có gợi ý phù hợp cho đài này. Kéo xuống để thử lại.')
                  else
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: quickNumbers.map((e) {
                        final numberValue = e is Map ? e['number'] ?? e : e;
                        return NumberChip(number: '$numberValue');
                      }).toList(),
                    ),
                ],
              ),
            ),
            const AppCard(
              child: Text(
                'Lưu ý: Kết quả chỉ mang tính tham khảo, không cam kết trúng thưởng.',
                style: TextStyle(fontSize: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
