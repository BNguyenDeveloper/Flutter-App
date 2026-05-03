# Quick Suggestion Fix

Mục tiêu: giữ nguyên thuật toán/prediction-engine hiện tại, chỉ sửa flow gọi để `Gợi ý nhanh` load nhanh và đổi đúng theo từng đài.

## Đã sửa

1. `GET /api/predictions/today` chỉ đọc DB, không tự gọi `generateTemporalPrediction()` nữa.
2. Flutter gọi `/today` trước. Nếu chưa có dữ liệu thì mới fallback sang `POST /api/predictions/generate`.
3. Cache UI theo `station.code`, tránh đổi đài nhưng vẫn hiển thị số cũ.
4. Thêm `scripts/generate-today-predictions.js` để pre-generate prediction cho toàn bộ đài.

## Chạy job pre-generate

```bash
cd backend-api
npm run generate:today
```

Tuỳ chọn:

```bash
npm run generate:today 2026-05-03 5 14
```

Format:

```bash
npm run generate:today [date] [topK] [recentDays] [area]
```

Ví dụ chỉ Miền Nam:

```bash
npm run generate:today 2026-05-03 5 14 mien_nam
```

## Flow chuẩn

```text
Daily Job generate trước -> save DB
Flutter mở app -> GET /today -> hiển thị nhanh
Nếu DB chưa có -> POST /generate fallback -> save DB -> lần sau nhanh
```
