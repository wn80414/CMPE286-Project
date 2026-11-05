'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Settings } from 'lucide-react';
import { getMqttClient } from '../lib/mqttClient';

import Sidebar, { Device } from './components/Sidebar';
import LockControl from './components/LockControl';
import AccessLogs, { LogEntry } from './components/AccessLogs';
import UserManagement from './components/UserManagement';
import RegisterDeviceModal from './components/RegisterDeviceModal';
import EditDeviceModal from './components/EditDeviceModal';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'devices' | 'users'>('devices');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mqttClient, setMqttClient] = useState<any>(null);
  const [mqttStatus, setMqttStatus] = useState<'CONNECTED' | 'DISCONNECTED'>('CONNECTED');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  useEffect(() => {
    setMounted(true);
    fetchDevices();
  }, []);

  useEffect(() => {
    const client = getMqttClient();
    setMqttClient(client);

    let timeoutId: NodeJS.Timeout;

    const updateStatus = () => {
      if (client.connected) {
        clearTimeout(timeoutId);
        setMqttStatus('CONNECTED');
      } else {
        timeoutId = setTimeout(() => {
          setMqttStatus(client.connected ? 'CONNECTED' : 'DISCONNECTED');
        }, 3000);
      }
    };
    
    updateStatus();
    client.on('connect', () => {
      clearTimeout(timeoutId);
      setMqttStatus('CONNECTED');
    });
    client.on('offline', () => updateStatus());
    client.on('error', () => updateStatus());

    return () => {
      clearTimeout(timeoutId);
      client.removeAllListeners('connect');
      client.removeAllListeners('offline');
      client.removeAllListeners('error');
    };
  }, []);

  // Global Message Listener & Database Authentication Engine
  useEffect(() => {
    if (!mqttClient) return;

    if (selectedDevice) {
      fetchLogs(selectedDevice.id);
    }

    mqttClient.subscribe('+/status');
    mqttClient.subscribe('+/scan');

    const handleMessage = async (topic: string, message: Buffer) => {
      try {
        const payload = JSON.parse(message.toString());

        // --- 1. HANDLE RFID CARD SCANS & ROLE AUTHENTICATION ---
        if (topic.endsWith('/scan') && payload.card_uid) {
          const deviceIdFromTopic = topic.split('/')[0];
          const scannedUid = payload.card_uid;

          // A. Query Supabase for user details including first_name, last_name, and title
          const { data: userRecord } = await supabase
            .from('users')
            .select('id, card_uid, role_id, first_name, last_name, title, is_active')
            .eq('card_uid', scannedUid)
            .single();

          let accessStatus = 'DENIED';
          let formattedUserName = 'Unknown / Unregistered User';

          if (userRecord) {
            const nameParts = [userRecord.first_name, userRecord.last_name].filter(Boolean);
            formattedUserName = nameParts.join(' ');
            if (userRecord.title) {
              formattedUserName += ` (${userRecord.title})`;
            }

            if (userRecord.is_active !== false) {
              const { data: allowedRoleCheck } = await supabase
                .from('device_allowed_roles')
                .select('*')
                .eq('device_id', deviceIdFromTopic)
                .eq('role_id', userRecord.role_id)
                .single();

              if (allowedRoleCheck) {
                accessStatus = 'GRANTED';
              }
            }
          }

          // B. Publish response to hardware
          const controlTopic = `${deviceIdFromTopic}/set`;
          const commandToSend = accessStatus === 'GRANTED' ? 'UNLOCKED' : 'DENIED';
          mqttClient.publish(controlTopic, commandToSend);

          // C. Insert log matching exact device_logs table schema (no user_name column)
          const { data: logData, error: logError } = await supabase
            .from('device_logs')
            .insert([{ 
              device_id: deviceIdFromTopic, 
              card_uid: scannedUid, 
              status: accessStatus 
            }])
            .select()
            .single();

          if (logError) {
            console.error('Supabase Log Insertion Error:', logError.message);
          } else if (logData) {
            const enrichedLog = { ...logData, user_name: formattedUserName };
            setSelectedDevice((currentSelected) => {
              if (currentSelected && currentSelected.id === deviceIdFromTopic) {
                setLogs((prev) => {
                  const exists = prev.some((log) => log.id === enrichedLog.id);
                  if (exists) return prev;
                  return [enrichedLog, ...prev];
                });
              }
              return currentSelected;
            });
          }
          return;
        }

        // --- 2. HANDLE STATUS & LWT UPDATES ---
        const topicMatch = topic.match(/^(.+)\/status$/);
        if (topicMatch) {
          const deviceIdFromTopic = topicMatch[1];

          if (payload.status && (payload.status === 'ONLINE' || payload.status === 'OFFLINE')) {
            const newStatus = payload.status;

            setDevices((prev) =>
              prev.map((d) => (d.id === deviceIdFromTopic ? { ...d, status: newStatus } : d))
            );

            setSelectedDevice((prev) => 
              prev && prev.id === deviceIdFromTopic ? { ...prev, status: newStatus } : prev
            );

            await supabase
              .from('devices')
              .update({ status: newStatus })
              .eq('id', deviceIdFromTopic);
          }
        }
      } catch (e) {
        console.error('MQTT Parse or Auth Engine Error:', e);
      }
    };

    mqttClient.on('message', handleMessage);

    return () => {
      mqttClient.off('message', handleMessage);
    };
  }, [mqttClient, selectedDevice]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('name');
    if (data && data.length > 0) {
      setDevices(data);
      setSelectedDevice((prev) => {
        if (!prev) return data[0];
        const exists = data.find((d) => d.id === prev.id);
        return exists || data[0];
      });
    }
  };

  // Fetch logs and map them with user details (first_name, last_name, title)
  const fetchLogs = async (deviceId: string) => {
    const [logsRes, usersRes] = await Promise.all([
      supabase.from('device_logs').select('*').eq('device_id', deviceId).order('created_at', { ascending: false }),
      supabase.from('users').select('card_uid, first_name, last_name, title')
    ]);

    if (logsRes.data) {
      const userMap = new Map();
      if (usersRes.data) {
        usersRes.data.forEach((u: any) => {
          const nameParts = [u.first_name, u.last_name].filter(Boolean);
          let nameStr = nameParts.join(' ');
          if (u.title) nameStr += ` (${u.title})`;
          userMap.set(u.card_uid, nameStr);
        });
      }

      const formattedLogs = logsRes.data.map((log: any) => ({
        ...log,
        user_name: userMap.get(log.card_uid) || 'Unknown / Unregistered User'
      }));

      setLogs(formattedLogs);
    }
  };

  const toggleLock = async (action: 'LOCKED' | 'UNLOCKED') => {
    if (!selectedDevice || !mqttClient) return;
    
    const controlTopic = `${selectedDevice.id}/set`;
    mqttClient.publish(controlTopic, action);

    setDevices((prev) => prev.map((d) => (d.id === selectedDevice.id ? { ...d, lock_state: action } : d)));
    setSelectedDevice((prev) => (prev ? { ...prev, lock_state: action } : null));
    
    await supabase.from('devices').update({ lock_state: action }).eq('id', selectedDevice.id);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex relative">
      <Sidebar
        devices={devices}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        mqttStatus={mqttStatus}
        onSignOut={async () => {
          await supabase.auth.signOut();
          router.push('/login');
          router.refresh();
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        {mqttStatus === 'DISCONNECTED' && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Lost connection to MQTT broker. Reconnecting...
            </span>
          </div>
        )}

        {activeTab === 'users' ? (
          <UserManagement />
        ) : selectedDevice ? (
          <>
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{selectedDevice.name}</h1>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded-lg text-xs font-medium transition"
                  >
                    <Settings className="w-3.5 h-3.5" /> Edit Config & Roles
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">Target ID: {selectedDevice.id}</p>
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full border ${
                  selectedDevice.status === 'ONLINE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {selectedDevice.status}
              </span>
            </div>

            <LockControl selectedDevice={selectedDevice} onToggleLock={toggleLock} />
            <AccessLogs logs={logs} deviceName={selectedDevice.name} mounted={mounted} />
          </>
        ) : (
          <div className="text-slate-500 text-center py-20">Select a device from the sidebar to begin.</div>
        )}
      </div>

      <RegisterDeviceModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onRegister={fetchDevices} />
      <EditDeviceModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} selectedDevice={selectedDevice} onUpdate={fetchDevices} />
    </main>
  );
}