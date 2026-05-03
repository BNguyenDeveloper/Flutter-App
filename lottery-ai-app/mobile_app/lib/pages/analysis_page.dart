import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../state/app_state.dart';
import '../utils/lottery_utils.dart';
import '../widgets/app_card.dart';
import '../widgets/page_header.dart';
import '../widgets/station_selector.dart';

class AnalysisPage extends StatefulWidget {
  const AnalysisPage({super.key});

  @override
  State<AnalysisPage> createState() => _AnalysisPageState();
}

class _AnalysisPageState extends State<AnalysisPage> {
  List topLast2 = [];
  List missingLast2 = [];
  List specialLast2 = [];
  List topLast3 = [];
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
      final responses = await Future.wait([
        ApiClient.fetchTopFrequency(station.code, 'last2'),
        ApiClient.fetchLongestMissing(station.code, 'last2'),
        ApiClient.fetchSpecialFrequency(station.code, 'last2'),
        ApiClient.fetchTopFrequency(station.code, 'last3'),
      ]);

      if (!mounted) return;
      setState(() {
        topLast2 = responses[0].take(20).toList();
        missingLast2 = responses[1].take(20).toList();
        specialLast2 = responses[2].take(20).toList();
        topLast3 = responses[3].take(20).toList();
        loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        topLast2 = [];
        missingLast2 = [];
        specialLast2 = [];
        topLast3 = [];
        loading = false;
      });
    }
  }

  Widget buildStatList({
    required String title,
    required String subtitle,
    required List items,
    required List<String> valueKeys,
    required String suffix,
  }) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(subtitle),
          const SizedBox(height: 12),
          if (items.isEmpty)
            const Text('Chưa có dữ liệu.')
          else
            ...items.map((raw) {
              final item = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
              final numberValue = item['number'] ?? '-';
              final number = '$numberValue';
              final value = valueOf(item, valueKeys, '-');

              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(child: Text(number)),
                title: Text('Số $number'),
                trailing: Text('$value $suffix', style: const TextStyle(fontWeight: FontWeight.bold)),
              );
            }),
        ],
      ),
    );
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
              title: 'Thống kê',
              subtitle: 'Số ra nhiều, số lâu chưa ra và giải đặc biệt.',
            ),
            const SizedBox(height: 18),
            const StationSelector(),
            if (loading)
              const Center(child: CircularProgressIndicator())
            else ...[
              buildStatList(
                title: 'Số 2 chân ra nhiều nhất',
                subtitle: 'Tính theo toàn bộ dữ liệu đã seed của đài đang chọn.',
                items: topLast2,
                valueKeys: const ['count', 'totalAppear'],
                suffix: 'lần',
              ),
              buildStatList(
                title: 'Số 2 chân lâu chưa ra',
                subtitle: 'Ưu tiên số có số ngày chưa xuất hiện cao nhất.',
                items: missingLast2,
                valueKeys: const ['daysSinceLastSeen', 'missingDays', 'gap', 'count'],
                suffix: 'ngày',
              ),
              buildStatList(
                title: 'Giải đặc biệt 2 số cuối ra nhiều',
                subtitle: 'Tần suất 2 số cuối của giải đặc biệt.',
                items: specialLast2,
                valueKeys: const ['count', 'specialAppear'],
                suffix: 'lần',
              ),
              buildStatList(
                title: 'Số 3 chân ra nhiều nhất',
                subtitle: 'Tần suất 3 số cuối trong tất cả giải.',
                items: topLast3,
                valueKeys: const ['count', 'totalAppear'],
                suffix: 'lần',
              ),
            ],
          ],
        ),
      ),
    );
  }
}
