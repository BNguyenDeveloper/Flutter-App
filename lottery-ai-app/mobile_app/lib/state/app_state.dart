import 'package:flutter/material.dart';

import '../models/lottery_station.dart';

class AppState extends ChangeNotifier {
  String selectedArea = 'mien_bac';
  LotteryStation? selectedStation;

  String get selectedCode => selectedStation?.code ?? 'XSMB';
  String get selectedProvince => selectedStation?.province ?? 'Miền Bắc';

  void setArea(String area) {
    selectedArea = area;
    selectedStation = null;
    notifyListeners();
  }

  void setStation(LotteryStation station) {
    selectedArea = station.area;
    selectedStation = station;
    notifyListeners();
  }
}

final appState = AppState();
