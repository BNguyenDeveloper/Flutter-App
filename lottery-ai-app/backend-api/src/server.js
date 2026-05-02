const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require('./config/db');
const resultsRoutes = require('./routes/results.routes');
const analysisRoutes = require('./routes/analysis.routes');
const predictionRoutes = require('./routes/prediction.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lottery-backend-api',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/results', resultsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/predictions', predictionRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Lottery backend API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
  });
