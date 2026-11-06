require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const { initWebSocket } = require('./src/config/websocket');

const deviceRoutes = require('./src/routes/deviceRoutes');
const usersRoutes = require('./src/routes/usersRoutes');
const auditRoutes = require('./src/routes/auditRoutes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());

// Mount Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);

module.exports = app;

if (!process.env.VERCEL) {
  const server = http.createServer(app);
  const PORT = process.env.PORT || 5000;

  require('./src/config/mqttClient');
  initWebSocket(server);

  server.listen(PORT, () => {
    console.log(`Server and WebSocket bridge running on port ${PORT}`);
  });
}