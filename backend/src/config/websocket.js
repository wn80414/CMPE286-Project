const { WebSocketServer } = require('ws');

let wss;

function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('[WEB] Frontend dashboard connected via WebSocket');
    
    ws.on('close', () => {
      console.log('[WEB] Frontend dashboard disconnected');
    });
  });
}

function broadcastToClients(data) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 corresponds to WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = { initWebSocket, broadcastToClients };