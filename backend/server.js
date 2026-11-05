require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize MQTT client and listeners in background
require('./src/config/mqttClient');

const deviceRoutes = require('./src/routes/deviceRoutes');
const usersRoutes = require('./src/routes/usersRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());

// Mount Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/users', usersRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});