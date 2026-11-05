'use client';

import { Cpu, ChevronRight, Plus, Wifi, Shield, LogOut } from 'lucide-react';

export interface Device {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE';
  lock_state: 'LOCKED' | 'UNLOCKED';
  mqtt_broker?: string;
  mqtt_topic?: string;
}

interface SidebarProps {
  devices: Device[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device) => void;
  onOpenAddModal: () => void;
  mqttStatus: 'CONNECTED' | 'DISCONNECTED';
  onSignOut: () => void;
  activeTab: 'devices' | 'users';
  onSelectTab: (tab: 'devices' | 'users') => void;
}

export default function Sidebar({
  devices,
  selectedDevice,
  onSelectDevice,
  onOpenAddModal,
  mqttStatus,
  onSignOut,
  activeTab,
  onSelectTab,
}: SidebarProps) {
  return (
    <aside className="w-80 border-r border-slate-800 p-6 flex flex-col justify-between bg-slate-950">
      <div className="space-y-6">
        <div className="flex items-center justify-between font-bold text-lg">
          <span className="flex items-center gap-2">
            <Shield className="text-indigo-500" /> Access Control
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onSelectTab('devices')}
            className={`py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'devices'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Devices
          </button>
          <button
            onClick={() => onSelectTab('users')}
            className={`py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Users & Roles
          </button>
        </div>

        {activeTab === 'devices' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                <Wifi
                  className={`w-3.5 h-3.5 ${
                    mqttStatus === 'CONNECTED' ? 'text-emerald-400 animate-pulse' : 'text-rose-500'
                  }`}
                />{' '}
                Hardware Nodes
              </p>
              <button
                onClick={onOpenAddModal}
                className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Device
              </button>
            </div>

            {devices.map((device) => {
              const isSelected = selectedDevice?.id === device.id;
              return (
                <button
                  key={device.id}
                  onClick={() => onSelectDevice(device)}
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">{device.id}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            device.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800 space-y-3">
        <div className="text-xs flex items-center justify-between px-2 text-slate-400">
          <span>MQTT Bridge:</span>
          <span
            className={`font-mono font-semibold ${
              mqttStatus === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {mqttStatus}
          </span>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2.5 rounded-lg text-xs font-medium transition"
        >
          <LogOut className="w-4 h-4 text-rose-400" /> Sign Out
        </button>
      </div>
    </aside>
  );
}