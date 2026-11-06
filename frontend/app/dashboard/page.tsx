'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';

import { supabase } from '../lib/supabaseClient';
import Sidebar, { Device } from './components/Sidebar';
import LockControl from './components/LockControl';
import AccessLogs, { LogEntry } from './components/AccessLogs';
import UserManagement from './components/UserManagement';
import RegisterDeviceModal from './components/RegisterDeviceModal';
import EditDeviceModal from './components/EditDeviceModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cmpe286-backend.onrender.com';
const WS_URL = API_BASE.replace(/^https/, 'ws');

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'devices' | 'users'>('devices');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Separate states for scan logs vs audit logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<LogEntry[]>([]);
  
  const [mqttStatus, setMqttStatus] = useState<'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchDevices();
  }, []);

  // 🌐 WEBSOCKET LISTENER
  useEffect(() => {
    if (!mounted) return;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setMqttStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'DEVICE_UPDATE') {
            const { deviceId, status, lock_state } = data;

            setDevices((prev) =>
              prev.map((d) =>
                d.id === deviceId
                  ? {
                      ...d,
                      ...(status !== undefined && { status }),
                      ...(lock_state !== undefined && { lock_state }),
                    }
                  : d
              )
            );

            setSelectedDevice((prev) =>
              prev && prev.id === deviceId
                ? {
                    ...prev,
                    ...(status !== undefined && { status }),
                    ...(lock_state !== undefined && { lock_state }),
                  }
                : prev
            );
          } else if (data.type === 'NEW_LOG') {
            if (selectedDevice && selectedDevice.id === data.deviceId) {
              fetchLogs(selectedDevice.id);
              fetchAuditLogs(selectedDevice.id);
            }
          }
        } catch (err) {
          console.error('Failed to parse incoming WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setMqttStatus('DISCONNECTED');
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        setMqttStatus('DISCONNECTED');
        ws.close();
      };
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [mounted, selectedDevice?.id]);

  useEffect(() => {
    if (selectedDevice) {
      fetchLogs(selectedDevice.id);
      fetchAuditLogs(selectedDevice.id);
    }
  }, [selectedDevice]);

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/devices`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setDevices(data);
        setSelectedDevice((prev) => {
          if (!prev) return data[0];
          const exists = data.find((d: Device) => d.id === prev.id);
          return exists || data[0];
        });
      }
    } catch (err) {
      console.error('Failed to fetch devices from backend:', err);
    }
  };

  const fetchLogs = async (deviceId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/devices/${deviceId}/logs`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch device scan logs:', err);
    }
  };

  const fetchAuditLogs = async (deviceId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/audit/${deviceId}/logs`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAuditLogs(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const handleCommandSent = (command: string) => {
    if (!selectedDevice) return;
    fetchLogs(selectedDevice.id);
    fetchAuditLogs(selectedDevice.id);
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

            <LockControl selectedDevice={selectedDevice} onCommandSent={handleCommandSent} />
            
            {/* Pass both logs and auditLogs independently */}
            <AccessLogs 
              logs={logs} 
              auditLogs={auditLogs} 
              deviceName={selectedDevice.name} 
              mounted={mounted} 
            />
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