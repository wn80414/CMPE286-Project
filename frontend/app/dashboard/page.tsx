'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Settings } from 'lucide-react';

import Sidebar, { Device } from './components/Sidebar';
import LockControl from './components/LockControl';
import AccessLogs, { LogEntry } from './components/AccessLogs';
import UserManagement from './components/UserManagement';
import RegisterDeviceModal from './components/RegisterDeviceModal';
import EditDeviceModal from './components/EditDeviceModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'devices' | 'users'>('devices');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
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
    if (selectedDevice) {
      fetchLogs(selectedDevice.id);
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
      console.error('Failed to fetch device logs from backend:', err);
    }
  };

  // Updated to handle 'TEMP_OPEN', 'LOCKED', and 'UNLOCKED'
  const handleCommandSent = (command: string) => {
    if (!selectedDevice) return;

    // If it's a permanent state change, optimistically update device lock_state in state
    if (command === 'LOCKED' || command === 'UNLOCKED') {
      setDevices((prev) => 
        prev.map((d) => (d.id === selectedDevice.id ? { ...d, lock_state: command as 'LOCKED' | 'UNLOCKED' } : d))
      );
      setSelectedDevice((prev) => (prev ? { ...prev, lock_state: command as 'LOCKED' | 'UNLOCKED' } : null));
    }

    // Refresh logs after sending any command
    fetchLogs(selectedDevice.id);
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