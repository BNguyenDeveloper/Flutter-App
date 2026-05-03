import 'package:flutter/material.dart';

import 'pages/main_screen.dart';

class XoSoAiApp extends StatelessWidget {
  const XoSoAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dự đoán Xổ số AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.blue,
        useMaterial3: true,
        fontFamily: 'Arial',
      ),
      home: const MainScreen(),
    );
  }
}
