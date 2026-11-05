const mqtt = require('mqtt');
const supabase = require('./supabase'); // Adjust path as needed

// 1. FIXED: Changed 'mqtt://' to 'mqtts://' for secure port 8883 TLS connection
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtts://faf928d0.ala.eu-central-1.emqxsl.com:8883';

const options = {
  username: process.env.MQTT_USER || 'admin',
  password: process.env.MQTT_PASS || 'iot123',
  clientId: 'backend_logger_' + Math.random().toString(16).substring(2, 8),
  rejectUnauthorized: false // Required for many cloud brokers using self-signed certs
};

console.log(`Connecting to MQTT broker at ${MQTT_BROKER}...`);
const mqttClient = mqtt.connect(MQTT_BROKER, options);

// ==================== CONNECTION EVENT LISTENERS ====================
mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT Broker successfully');
  
  // Subscribe to all relevant wildcard topics
  mqttClient.subscribe('+/status', (err) => { if (!err) console.log('Subscribed to +/status'); });
  mqttClient.subscribe('+/scan', (err) => { if (!err) console.log('Subscribed to +/scan'); });
  mqttClient.subscribe('+/ack', (err) => { if (!err) console.log('Subscribed to +/ack'); });
  mqttClient.subscribe('+/tamper', (err) => { if (!err) console.log('Subscribed to +/tamper'); });
});

// Added to catch and print handshake, network, or auth errors instead of failing silently
mqttClient.on('error', (err) => {
  console.error('❌ MQTT Connection Error:', err.message);
});

mqttClient.on('offline', () => {
  console.warn('⚠️ MQTT Client went offline');
});

mqttClient.on('reconnect', () => {
  console.log('🔄 Attempting to reconnect to MQTT broker...');
});

// ==================== MQTT MESSAGE LOGGER ====================
mqttClient.on('message', async (topic, payloadBuffer) => {
  const timestamp = new Date().toISOString();
  const rawPayload = payloadBuffer.toString();

  // Try parsing payload as JSON for pretty printing if possible, fallback to raw string
  let parsedPayload;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch (e) {
    parsedPayload = rawPayload;
  }

  // Console Log Formatting
  console.group(`\n📡 [MQTT INBOUND] @ ${timestamp}`);
  console.log(`📌 Topic   : ${topic}`);
  console.log(`📦 Payload :`, parsedPayload);
  console.groupEnd();

  // ==================== EXISTING EVENT ROUTING ====================
  try {
    // 1. Handle Device Status / Heartbeat
    const statusMatch = topic.match(/^(.+)\/status$/);
    if (statusMatch) {
      const deviceId = statusMatch[1];
      const statusData = typeof parsedPayload === 'object' ? parsedPayload : { status: rawPayload };
      
      await supabase
        .from('devices')
        .update({ 
          status: statusData.status || 'ONLINE', 
          lock_state: statusData.lock_state || 'LOCKED' 
        })
        .eq('id', deviceId);
      return;
    }

    // 2. Handle RFID Scans
    const scanMatch = topic.match(/^(.+)\/scan$/);
    if (scanMatch) {
      const deviceId = scanMatch[1];
      const cardUid = parsedPayload.card_uid;

      if (!cardUid) return;

      // Validate user & role in Supabase
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

      // Send command back to hardware
      const commandTopic = `${deviceId}/set`;
      const responseCommand = accessGranted ? 'TEMP_OPEN' : 'DENIED';
      mqttClient.publish(commandTopic, responseCommand);

      // Log transaction to device_logs
      await supabase.from('device_logs').insert([{
        device_id: deviceId,
        card_uid: cardUid,
        status: accessGranted ? 'GRANTED' : 'DENIED'
      }]);

      console.log(`🔒 Access evaluation for card ${cardUid} on ${deviceId}: ${responseCommand}`);
      return;
    }

    // 3. Handle Hardware Acknowledgments
    const ackMatch = topic.match(/^(.+)\/ack$/);
    if (ackMatch) {
      const deviceId = ackMatch[1];
      if (parsedPayload.lock_state) {
        await supabase
          .from('devices')
          .update({ lock_state: parsedPayload.lock_state })
          .eq('id', deviceId);
      }
      return;
    }

    // 4. Handle Tamper Alerts
    const tamperMatch = topic.match(/^(.+)\/tamper$/);
    if (tamperMatch) {
      const deviceId = tamperMatch[1];
      console.warn(`🚨 SECURITY ALERT: Tamper triggered on ${deviceId}!`);
      
      await supabase
        .from('devices')
        .update({ lock_state: 'LOCKED', status: 'SECURITY_ALERT' })
        .eq('id', deviceId);

      await supabase.from('device_logs').insert([{
        device_id: deviceId,
        card_uid: 'SYSTEM_TAMPER',
        status: 'CRITICAL_BREACH'
      }]);
      return;
    }

  } catch (err) {
    console.error('❌ Error processing MQTT message in logger/router:', err.message);
  }
});

module.exports = mqttClient;