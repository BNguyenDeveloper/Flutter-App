import 'package:flutter/material.dart';

import '../widgets/app_card.dart';
import '../widgets/page_header.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SafeArea(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageHeader(
              title: 'Cá nhân',
              subtitle: 'Thông tin ứng dụng và cài đặt cơ bản.',
            ),
            SizedBox(height: 18),
            AppCard(
              child: Text(
                'Dự đoán Xổ số AI v1.0\n\nỨng dụng hỗ trợ phân tích dữ liệu xổ số và đưa ra gợi ý tham khảo.',
                style: TextStyle(fontSize: 16),
              ),
            ),
            AppCard(
              child: Text(
                'Lưu ý quan trọng:\nỨng dụng không cam kết kết quả và không khuyến khích chơi quá khả năng tài chính.',
                style: TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
