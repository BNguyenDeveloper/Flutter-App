# Lottery AI App MVP

Full-stack MVP for a lottery analytics and AI suggestion app.

Important: This app provides statistical analysis and reference suggestions only. It does not guarantee lottery results.

## Stack

- Backend API: Node.js Express + MongoDB + Mongoose
- Prediction Engine: Python FastAPI
- Mobile App: Flutter skeleton

## Quick start

### Backend

```bash
cd backend-api
copy .env.example .env
npm install
npm run dev
```

Health:

```bash
curl http://localhost:3000/api/health
```

Seed sample data:

```bash
npm run seed
```

### Prediction engine

```bash
cd ../prediction-engine
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Generate prediction

```bash
cd ../backend-api
curl -X POST "http://localhost:3000/api/predictions/generate?region=MB&topK=10"
```

## Git

```bash
git add .
git commit -m "Implement lottery AI app MVP"
git push -u origin main
```
