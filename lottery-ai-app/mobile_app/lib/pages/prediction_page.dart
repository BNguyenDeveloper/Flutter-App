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
  String predictionDate = '';
  String validUntil = '';
  int horizonDays = 7;
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

  String _displayDate(String value) {
    final parts = value.split('-');
    if (parts.length == 3) return '${parts[2]}/${parts[1]}/${parts[0]}';
    return value;
  }

  bool _isTemporaryPrediction() {
    if (predictionDate.isEmpty) return false;
    final parsed = DateTime.tryParse(predictionDate);
    if (parsed == null) return false;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(parsed.year, parsed.month, parsed.day);
    return date.isAfter(today);
  }

  Widget _predictionDateBadge() {
    if (predictionDate.isEmpty) return const SizedBox.shrink();

    final color = Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.event_available, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            _displayDate(predictionDate),
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> load() async {
    final station = appState.selectedStation;
    if (station == null) return;

    setState(() {
      loading = true;
      error = '';
      numbers = [];
      predictionDate = '';
      validUntil = '';
      horizonDays = 7;
    });

    try {
      final result = await ApiClient.fetchTodayPredictionDetail(
        area: station.area,
        province: station.province,
        code: station.code,
        topK: 5,
      );
      final resultNumbers = result['numbers'] is List ? result['numbers'] as List : [];
      final resultDate = result['date'] == null ? '' : '${result['date']}';
      final resultValidUntil = result['validUntil'] == null ? '' : '${result['validUntil']}';
      final resultHorizonDays = int.tryParse('${result['horizonDays'] ?? 7}') ?? 7;

      if (!mounted) return;
      setState(() {
        numbers = resultNumbers.take(5).toList();
        predictionDate = resultDate;
        validUntil = resultValidUntil;
        horizonDays = resultHorizonDays;
        loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        error = 'Không thể tải dự đoán. Vui lòng thử lại sau.';
        numbers = [];
        predictionDate = '';
        validUntil = '';
        horizonDays = 7;
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
              title: 'Dự đoán thống kê',
              subtitle: 'Gợi ý số tham khảo dựa trên dữ liệu lịch sử và mô hình thống kê.',
            ),
            const SizedBox(height: 18),
            const StationSelector(predictionOnly: true),
            FilledButton.icon(
              onPressed: loading ? null : load,
              icon: const Icon(Icons.refresh),
              label: const Text('Làm mới gợi ý'),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (predictionDate.isNotEmpty) ...[
                      Wrap(
                        spacing: 10,
                        runSpacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            'Kỳ dự đoán',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          _predictionDateBadge(),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        validUntil.isEmpty
                            ? '5 cặp ưu tiên có khả năng cao trong $horizonDays ngày.'
                            : '5 cặp ưu tiên có khả năng cao từ ${_displayDate(predictionDate)} đến ${_displayDate(validUntil)}.',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_isTemporaryPrediction()) ...[
                        Text(
                          'Dự đoán tạm thời. Ngày hôm sau cần chờ kết quả các miền chạy theo thứ tự Nam → Trung → Bắc để cập nhật chính xác hơn.',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.tertiary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                    ],
                    Wrap(
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
                  ],
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
