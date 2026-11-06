require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const { initWebSocket } = require('./src/config/websocket');

// Initialize MQTT client and listeners in background
require('./src/config/mqttClient');

const deviceRoutes = require('./src/routes/deviceRoutes');
const usersRoutes = require('./src/routes/usersRoutes');
const auditRoutes = require('./src/routes/auditRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize the WebSocket server on top of the HTTP server
initWebSocket(server);

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());

// Mount Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);


server.listen(PORT, () => {
  console.log(`Server and WebSocket bridge running on port ${PORT}`);
});