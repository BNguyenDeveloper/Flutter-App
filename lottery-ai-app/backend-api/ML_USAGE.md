# Lottery AI ML v2

Bản này thêm Machine Learning thật vào predictor hiện có.

## Flow

```text
MongoDB LotteryNumber
→ build feature theo rule Nam -> Trung -> Bắc
→ train logistic regression model
→ lưu model ở storage/models/lottery-ml-model.json
→ POST /api/predictions/generate dùng mlScore thật
```

## Train model

```bash
npm run train:model XSMB 120 14
```

Trong đó:

- `XSMB`: code đài cần train/predict
- `120`: số ngày train gần nhất
- `14`: cửa sổ recentDays để tạo feature

## Predict

```bash
npm run predict:next 2026-05-02 XSMB 10
```

Hoặc API:

```http
POST /api/predictions/generate
Content-Type: application/json

{
  "code": "XSMB",
  "signalDate": "2026-05-02",
  "topK": 10,
  "recentDays": 14
}
```

## Feature đang dùng

- southHotScore
- centralRepeatScore
- northRecentScore
- cascadeScore
- gapCycleScore
- markovScore
- mlScore

## Lưu ý

Nếu chưa train model, hệ thống tự dùng `mlScore = 0.5` trung lập.
Sau khi train xong, predictor sẽ tự load file `storage/models/lottery-ml-model.json`.

Xổ số vẫn là ngẫu nhiên. Model chỉ xếp hạng xác suất tương đối theo dữ liệu lịch sử, không đảm bảo trúng.
