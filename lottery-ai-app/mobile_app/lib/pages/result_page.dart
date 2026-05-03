import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../state/app_state.dart';
import '../utils/lottery_utils.dart';
import '../widgets/app_card.dart';
import '../widgets/page_header.dart';
import '../widgets/station_selector.dart';

class ResultPage extends StatefulWidget {
  const ResultPage({super.key});

  @override
  State<ResultPage> createState() => _ResultPageState();
}

class _ResultPageState extends State<ResultPage> {
  Map<String, dynamic>? result;
  bool loading = true;

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

    setState(() => loading = true);

    try {
      final data = await ApiClient.fetchLatestResult(station.code);
      if (!mounted) return;
      setState(() {
        result = data;
        loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        result = null;
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final prizes = result?['prizes'] is Map
        ? Map<String, dynamic>.from(result!['prizes'])
        : <String, dynamic>{};
    final dbList = prizes['db'] is List ? prizes['db'] as List : const [];
    final special = result?['special'] ?? (dbList.isNotEmpty ? dbList.first : '-');
    final last2 = extractLast2FromPrizes(prizes);
    final drawDateValue = result == null ? '' : result!['drawDate'] ?? '';
    final date = result?['date'] ?? '$drawDateValue'.split('T').first;
    final resultProvinceLabel = result == null
        ? appState.selectedProvince
        : result!['province'] ?? appState.selectedProvince;
    final resultAreaValue = result == null
        ? appState.selectedArea
        : result!['area'] ?? appState.selectedArea;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const PageHeader(
              title: 'Kết quả xổ số',
              subtitle: 'Xem kết quả gần nhất theo từng đài.',
            ),
            const SizedBox(height: 18),
            const StationSelector(),
            if (loading)
              const Center(child: CircularProgressIndicator())
            else if (result == null)
              const AppCard(child: Text('Chưa có dữ liệu kết quả cho đài này.'))
            else ...[
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Đài: $resultProvinceLabel', style: const TextStyle(fontSize: 18)),
                    const SizedBox(height: 8),
                    Text('Miền: ${areaLabel(resultAreaValue)}', style: const TextStyle(fontSize: 18)),
                    const SizedBox(height: 8),
                    Text('Ngày: $date', style: const TextStyle(fontSize: 18)),
                  ],
                ),
              ),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Giải đặc biệt', style: TextStyle(fontSize: 18)),
                    const SizedBox(height: 10),
                    Text('$special', style: const TextStyle(fontSize: 34, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bảng giải', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    ...prizes.entries.map((entry) {
                      final values = entry.value is List ? entry.value : [entry.value];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: 110,
                              child: Text(
                                formatPrizeName(entry.key),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                            Expanded(
                              child: Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: values.map<Widget>((n) => Chip(label: Text('$n'))).toList(),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Lô tô 2 số cuối', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: last2.map<Widget>((n) => Chip(label: Text(n))).toList(),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
