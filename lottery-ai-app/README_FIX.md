# Lottery AI Quick Suggestion Fix

## Mục tiêu
Fix lỗi Gợi ý nhanh load chậm và số không đổi đúng theo từng đài.

## Không thay đổi
- Không đổi thuật toán AI hiện có.
- Không đổi Markov / Temporal Pattern / ML logic.
- Không đổi cách generate prediction.

## Đã sửa
1. `backend-api/src/routes/prediction.routes.js`
   - Route `/api/predictions/today` truyền đủ `code`, `area`, `province`, `region`, `date` vào service.

2. `backend-api/src/services/prediction.service.js`
   - `getTodayPrediction()` chỉ đọc prediction đã lưu trong DB.
   - Không tự chạy `generateTemporalPrediction()` trong API `/today` nữa.
   - Nếu chưa có prediction, trả `null` để Flutter gọi `/generate` riêng.

3. `mobile_app/lib/core/api_client.dart`
   - Giữ logic gọi `/today` trước, `/generate` sau nếu rỗng.

4. `mobile_app/lib/pages/home_page.dart`
   - Giữ logic cache theo `station.code` và chống request cũ ghi đè khi đổi đài.

## Cách dùng
Copy các file trong zip này đè vào project hiện tại theo đúng đường dẫn.
