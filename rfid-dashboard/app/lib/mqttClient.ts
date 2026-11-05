// lib/mqttClient.ts
import mqtt, { MqttClient } from 'mqtt';

const globalForMqtt = globalThis as unknown as { mqttClient: MqttClient | undefined };

export function getMqttClient(): MqttClient {
  if (!globalForMqtt.mqttClient || !globalForMqtt.mqttClient.connected) {
    const brokerUrl = process.env.NEXT_PUBLIC_BROKER_WSS_URL || 'wss://faf928d0.ala.eu-central-1.emqxsl.com:8084/mqtt';
    const username = process.env.NEXT_PUBLIC_MQTT_USER;
    const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;
    
    let uniqueClientId = 'nextjs_dashboard_server';
    if (typeof window !== 'undefined') {
      uniqueClientId = sessionStorage.getItem('mqtt_client_id') || '';
      if (!uniqueClientId) {
        uniqueClientId = `nextjs_dashboard_${Math.random().toString(16).substring(2, 8)}`;
        sessionStorage.setItem('mqtt_client_id', uniqueClientId);
      }
    }

    globalForMqtt.mqttClient = mqtt.connect(brokerUrl, {
      clientId: uniqueClientId,
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: false,            // CHANGED: false keeps session state alive across micro-drops
      reconnectPeriod: 1000,   // Try reconnecting almost instantly (1 second)
      connectTimeout: 30000,   // Give the TLS handshake 30 seconds to complete securely
      keepalive: 20,           // Ping the broker every 20 seconds to bypass router timeouts
      resubscribe: true,       // Force automatic re-subscription on drop
      username,
      password,
    });

    globalForMqtt.mqttClient.on('connect', () => {
      console.log('✅ MQTT Connected successfully to EMQX Cloud!');
      
      const subTopic = '+/status';
      globalForMqtt.mqttClient?.subscribe(subTopic, { qos: 0 }, (err) => {
        if (err) console.error('❌ MQTT Subscription Failed:', err);
        else console.log(`📡 Subscribed successfully to: ${subTopic}`);
      });
    });

    globalForMqtt.mqttClient.on('reconnect', () => {
      console.log('🔄 Attempting MQTT reconnection...');
    });

    globalForMqtt.mqttClient.on('offline', () => {
      console.warn('⚠️ MQTT client went offline.');
    });

    globalForMqtt.mqttClient.on('error', (err) => {
      console.error('❌ MQTT Connection Error:', err);
    });
  }

  return globalForMqtt.mqttClient;
}