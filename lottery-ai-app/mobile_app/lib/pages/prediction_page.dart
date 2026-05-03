import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../state/app_state.dart';
import '../utils/lottery_utils.dart';
import '../widgets/app_card.dart';
import '../widgets/number_chip.dart';
import '../widgets/page_header.dart';
import '../widgets/station_selector.dart';

class PredictionPage extends StatefulWidget {
  const PredictionPage({super.key});

  @override
  State<PredictionPage> createState() => _PredictionPageState();
}

class _PredictionPageState extends State<PredictionPage> {
  List numbers = [];
  bool loading = false;
  String error = '';

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

    setState(() {
      loading = true;
      error = '';
      numbers = [];
    });

    try {
      final result = await ApiClient.fetchTodayPrediction(
        area: station.area,
        province: station.province,
        code: station.code,
        topK: 10,
      );

      if (!mounted) return;
      setState(() {
        numbers = result;
        loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        error = 'Không thể tạo dự đoán. Vui lòng thử lại sau.';
        numbers = [];
        loading = false;
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
              title: 'Dự đoán AI',
              subtitle: 'Gợi ý số tham khảo dựa trên thống kê và AI.',
            ),
            const SizedBox(height: 18),
            const StationSelector(),
            FilledButton.icon(
              onPressed: loading ? null : load,
              icon: const Icon(Icons.auto_awesome),
              label: const Text('Phân tích ngay'),
            ),
            const SizedBox(height: 18),
            if (loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: SizedBox(width: 36, height: 36, child: CircularProgressIndicator()),
                ),
              ),
            if (error.isNotEmpty)
              AppCard(child: Text(error, style: const TextStyle(color: Colors.red))),
            if (!loading && numbers.isNotEmpty) ...[
              AppCard(
                child: Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: numbers.map((e) {
                    final item = e is Map ? Map<String, dynamic>.from(e) : null;
                    final itemNumber = item == null ? e : item['number'] ?? '';
                    final number = '$itemNumber';
                    final score = item == null ? null : item['score'];
                    return NumberChip(
                      number: number,
                      note: score == null ? null : percent(score),
                    );
                  }).toList(),
                ),
              ),
              ...numbers.map((e) {
                final item = e is Map ? Map<String, dynamic>.from(e) : null;
                final itemNumber = item == null ? e : item['number'] ?? '';
                final number = '$itemNumber';
                final rawReason = item == null ? null : item['reason'];
                final reason = rawReason == null ? 'Điểm thống kê phù hợp' : '$rawReason';
                final score = item == null ? null : item['score'];

                return Card(
                  child: ListTile(
                    leading: CircleAvatar(child: Text(number)),
                    title: Text('Số $number'),
                    subtitle: Text('Lý do: $reason'),
                    trailing: score == null
                        ? null
                        : Text(percent(score), style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }
}
