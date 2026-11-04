'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Shield, Lock, Unlock, AlertCircle, CheckCircle2, Cpu, ChevronRight, RefreshCw, LogOut } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE';
  lockState: 'LOCKED' | 'UNLOCKED';
}

interface LogEntry {
  id: string;
  device_id: string;
  card_uid: string;
  status: 'AUTHORIZED' | 'DENIED';
  created_at: string;
}

const DEVICES: Device[] = [
  { id: 'front_door_01', name: 'Front Entrance', status: 'ONLINE', lockState: 'LOCKED' },
  { id: 'server_room_02', name: 'Server Room Rack', status: 'ONLINE', lockState: 'LOCKED' },
  { id: 'side_gate_03', name: 'Side Exit Gate', status: 'OFFLINE', lockState: 'LOCKED' },
];

const INITIAL_LOGS: LogEntry[] = [
  { id: '1', device_id: 'front_door_01', card_uid: 'AB:CD:EF:12', status: 'AUTHORIZED', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: '2', device_id: 'front_door_01', card_uid: '99:88:77:66', status: 'DENIED', created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
  { id: '3', device_id: 'server_room_02', card_uid: '11:22:33:44', status: 'AUTHORIZED', created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: '4', device_id: 'side_gate_03', card_uid: 'DE:AD:BE:EF', status: 'DENIED', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
];

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>(DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<Device>(DEVICES[0]);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const toggleLock = (action: 'LOCKED' | 'UNLOCKED') => {
    setDevices((prev) =>
      prev.map((d) => (d.id === selectedDevice.id ? { ...d, lockState: action } : d))
    );
    setSelectedDevice((prev) => ({ ...prev, lockState: action }));
  };

  const simulateScan = (status: 'AUTHORIZED' | 'DENIED') => {
    const randomHex = Array.from({ length: 4 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join(':').toUpperCase();

    const newLog: LogEntry = {
      id: Math.random().toString(),
      device_id: selectedDevice.id,
      card_uid: randomHex,
      status,
      created_at: new Date().toISOString(),
    };

    setLogs((prev) => [newLog, ...prev]);
  };

  const filteredLogs = logs.filter((log) => log.device_id === selectedDevice.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex">
      
      {/* Sidebar: Device List */}
      <aside className="w-80 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between font-bold text-lg">
            <span className="flex items-center gap-2"><Shield className="text-indigo-500" /> Access Control</span>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold px-2">
              Connected Devices
            </p>
            {devices.map((device) => {
              const isSelected = device.id === selectedDevice.id;
              return (
                <button
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition ${
                    isSelected 
                      ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-300' 
                      : 'bg-slate-900 border border-slate-800/60 hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Cpu className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div>
                      <p className="font-medium text-sm">{device.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{device.id}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* User Sign Out Section */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2.5 rounded-lg text-xs font-medium transition"
          >
            <LogOut className="w-4 h-4 text-rose-400" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedDevice.name}</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">Target ID: {selectedDevice.id}</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full border ${
            selectedDevice.status === 'ONLINE' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {selectedDevice.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
            <div>
              <p className="text-sm text-slate-400">Current Lock State</p>
              <div className="flex items-center gap-3 mt-3">
                {selectedDevice.lockState === 'LOCKED' ? (
                  <Lock className="w-8 h-8 text-rose-500" />
                ) : (
                  <Unlock className="w-8 h-8 text-emerald-500" />
                )}
                <span className="text-xl font-semibold tracking-wide">
                  {selectedDevice.lockState}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => toggleLock('UNLOCKED')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium transition"
              >
                Unlock
              </button>
              <button
                onClick={() => toggleLock('LOCKED')}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg font-medium transition"
              >
                Lock
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCw className="w-4 h-4 text-indigo-400" /> Mock Hardware Event Simulator
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Simulate an RFID badge scan on {selectedDevice.name} to test filtering and log updates.
              </p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => simulateScan('AUTHORIZED')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                Simulate Authorized Scan
              </button>
              <button
                onClick={() => simulateScan('DENIED')}
                className="flex-1 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 text-amber-300 py-2 rounded-lg text-sm font-medium transition"
              >
                Simulate Denied Scan
              </button>
            </div>
          </div>

        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-semibold flex justify-between items-center">
            <span>Access History for {selectedDevice.name}</span>
            <span className="text-xs text-slate-500 font-normal">{filteredLogs.length} events recorded</span>
          </div>
          <div className="divide-y divide-slate-800">
            {filteredLogs.length === 0 ? (
              <p className="p-6 text-slate-500 text-center">No scan logs recorded for this device yet.</p>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {log.status === 'AUTHORIZED' ? (
                      <CheckCircle2 className="text-emerald-400 w-5 h-5" />
                    ) : (
                      <AlertCircle className="text-rose-400 w-5 h-5" />
                    )}
                    <div>
                      <p className="font-mono text-sm">UID: {log.card_uid}</p>
                      <p className="text-xs text-slate-400">Action: RFID Scan</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      log.status === 'AUTHORIZED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {log.status}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}