import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../models/lottery_station.dart';
import '../state/app_state.dart';
import '../utils/lottery_utils.dart';
import 'app_card.dart';

class StationSelector extends StatefulWidget {
  const StationSelector({super.key});

  @override
  State<StationSelector> createState() => _StationSelectorState();
}

class _StationSelectorState extends State<StationSelector> {
  List<LotteryStation> stations = [];
  bool loading = true;
  String error = '';

  @override
  void initState() {
    super.initState();
    loadStations(appState.selectedArea);
  }

  Future<void> loadStations(String area) async {
    setState(() {
      loading = true;
      error = '';
      stations = [];
    });

    try {
      final loaded = await ApiClient.fetchProvinces(area);

      if (!mounted) return;

      setState(() {
        stations = loaded;
        loading = false;
      });

      if (loaded.isNotEmpty) {
        final currentCode = appState.selectedStation?.code;
        final selected = loaded.firstWhere(
          (station) => station.code == currentCode,
          orElse: () => loaded.first,
        );
        appState.setStation(selected);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        error = 'Không tải được danh sách đài.';
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Chọn đài xổ số',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: appState.selectedArea,
            decoration: const InputDecoration(
              labelText: 'Miền',
              border: OutlineInputBorder(),
            ),
            items: areaOptions.map((area) {
              return DropdownMenuItem(value: area.value, child: Text(area.label));
            }).toList(),
            onChanged: (value) async {
              if (value == null) return;
              appState.setArea(value);
              await loadStations(value);
            },
          ),
          const SizedBox(height: 12),
          if (loading)
            const LinearProgressIndicator()
          else if (error.isNotEmpty)
            Text(error, style: const TextStyle(color: Colors.red))
          else
            DropdownButtonFormField<String>(
              value: appState.selectedStation?.code,
              decoration: const InputDecoration(
                labelText: 'Tỉnh / Đài',
                border: OutlineInputBorder(),
              ),
              items: stations.map((station) {
                return DropdownMenuItem(
                  value: station.code,
                  child: Text(station.displayName),
                );
              }).toList(),
              onChanged: (value) {
                if (value == null) return;
                final station = stations.firstWhere((s) => s.code == value);
                appState.setStation(station);
              },
            ),
        ],
      ),
    );
  }
}
