const mqtt = require('mqtt');
const supabase = require('./supabase'); // Adjust path as needed
const { broadcastToClients } = require('./websocket');

const MQTT_BROKER = process.env.MQTT_BROKER_URL || process.env.MQTT_BROKER;

const options = {
  username: process.env.MQTT_USERNAME || process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD || process.env.MQTT_PASS,
  clientId: 'backend_logger_' + Math.random().toString(16).substring(2, 8),
  rejectUnauthorized: false
};

console.log(`[MQTT] Connecting to broker at ${MQTT_BROKER}...`);
const mqttClient = mqtt.connect(MQTT_BROKER, options);

// ==================== CONNECTION EVENT LISTENERS ====================
mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to broker successfully');
  
  mqttClient.subscribe('+/status', (err) => { if (!err) console.log('[MQTT] Subscribed to +/status'); });
  mqttClient.subscribe('+/scan', (err) => { if (!err) console.log('[MQTT] Subscribed to +/scan'); });
  mqttClient.subscribe('+/ack', (err) => { if (!err) console.log('[MQTT] Subscribed to +/ack'); });
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] [ERROR] Connection error:', err.message);
});

mqttClient.on('offline', () => {
  console.warn('[MQTT] [WARN] Client went offline');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Attempting to reconnect to broker...');
});

// ==================== MQTT MESSAGE LOGGER & ROUTER ====================
mqttClient.on('message', async (topic, payloadBuffer) => {
  const timestamp = new Date().toISOString();
  const rawPayload = payloadBuffer.toString();

  let parsedPayload;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch (e) {
    parsedPayload = rawPayload;
  }

  console.group(`\n[MQTT] INBOUND @ ${timestamp}`);
  console.log(`Topic   : ${topic}`);
  console.log(`Payload :`, parsedPayload);
  console.groupEnd();

  try {
    // 1. Handle Device Status / Heartbeat
    const statusMatch = topic.match(/^(.+)\/status$/);
    if (statusMatch) {
      const deviceId = statusMatch[1];
      const statusData = typeof parsedPayload === 'object' ? parsedPayload : { status: rawPayload };
      const newStatus = statusData.status || 'ONLINE';
      const newLockState = statusData.lock_state || 'LOCKED';
      
      await supabase
        .from('devices')
        .update({ 
          status: newStatus, 
          lock_state: newLockState 
        })
        .eq('id', deviceId);

      broadcastToClients({
        type: 'DEVICE_UPDATE',
        deviceId,
        status: newStatus,
        lock_state: newLockState
      });

      return;
    }

    // 2. Handle RFID Scans
    const scanMatch = topic.match(/^(.+)\/scan$/);
    if (scanMatch) {
      const deviceId = scanMatch[1];
      const cardUid = parsedPayload.card_uid;

      if (!cardUid) return;

      const { data: userRecord } = await supabase
        .from('users')
        .select('id, card_uid, role_id, first_name, last_name, is_active')
        .eq('card_uid', cardUid)
        .single();

      let accessGranted = false;

      if (userRecord && userRecord.is_active !== false) {
        const { data: roleCheck } = await supabase
          .from('device_allowed_roles')
          .select('*')
          .eq('device_id', deviceId)
          .eq('role_id', userRecord.role_id)
          .single();

        if (roleCheck) accessGranted = true;
      }

      const commandTopic = `${deviceId}/set`;
      const responseCommand = accessGranted ? 'TEMP_OPEN' : 'DENIED';
      mqttClient.publish(commandTopic, responseCommand);

      await supabase.from('device_logs').insert([{
        device_id: deviceId,
        card_uid: cardUid,
        status: accessGranted ? 'GRANTED' : 'DENIED'
      }]);

      broadcastToClients({
        type: 'NEW_LOG',
        deviceId
      });

      console.log(`[MQTT] Access evaluation for card ${cardUid} on ${deviceId}: ${responseCommand}`);
      return;
    }

    // 3. Handle Hardware Acknowledgments
    const ackMatch = topic.match(/^(.+)\/ack$/);
    if (ackMatch) {
      const deviceId = ackMatch[1];
      const newLockState = parsedPayload.lock_state;
      
      if (newLockState) {
        await supabase
          .from('devices')
          .update({ lock_state: newLockState })
          .eq('id', deviceId);

        broadcastToClients({
          type: 'DEVICE_UPDATE',
          deviceId,
          lock_state: newLockState
        });
      }
      return;
    }

  } catch (err) {
    console.error('[MQTT] [ERROR] Failed processing message:', err.message);
  }
});

module.exports = mqttClient;