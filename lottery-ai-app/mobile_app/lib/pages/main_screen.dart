import 'package:flutter/material.dart';

import 'analysis_page.dart';
import 'home_page.dart';
import 'prediction_page.dart';
import 'profile_page.dart';
import 'result_page.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int index = 0;

  final pages = const [
    HomePage(),
    ResultPage(),
    PredictionPage(),
    AnalysisPage(),
    ProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Trang chủ'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), label: 'Kết quả'),
          NavigationDestination(icon: Icon(Icons.auto_awesome), label: 'Dự đoán'),
          NavigationDestination(icon: Icon(Icons.bar_chart_outlined), label: 'Thống kê'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Cá nhân'),
        ],
      ),
    );
  }
}
