'use client';

import { Lock, Unlock, RefreshCw, AlertTriangle } from 'lucide-react';
import { Device } from './Sidebar';

interface LockControlProps {
  selectedDevice: Device;
  onToggleLock: (action: 'LOCKED' | 'UNLOCKED') => void;
}

export default function LockControl({ selectedDevice, onToggleLock }: LockControlProps) {
  const isOffline = selectedDevice.status === 'OFFLINE';

  return (
    <div className="space-y-4">
      {isOffline && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Device is currently offline. Lock controls are disabled. You can still view logs and edit the config.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`bg-slate-900 border ${isOffline ? 'border-rose-500/30' : 'border-slate-800'} p-6 rounded-xl flex flex-col justify-between transition-colors`}>
          <div>
            <p className="text-sm text-slate-400">Current Lock State</p>
            <div className="flex items-center gap-3 mt-3">
              {isOffline ? (
                <Lock className="w-8 h-8 text-rose-500/50" />
              ) : selectedDevice.lock_state === 'LOCKED' ? (
                <Lock className="w-8 h-8 text-rose-500" />
              ) : (
                <Unlock className="w-8 h-8 text-emerald-500" />
              )}
              <span className={`text-xl font-semibold tracking-wide ${isOffline ? 'text-slate-500' : 'text-slate-100'}`}>
                {isOffline ? 'OFFLINE' : selectedDevice.lock_state}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => onToggleLock('UNLOCKED')}
              disabled={isOffline}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                isOffline
                  ? 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              Unlock Door
            </button>
            <button
              onClick={() => onToggleLock('LOCKED')}
              disabled={isOffline}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                isOffline
                  ? 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              Lock Door
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <RefreshCw className={`w-4 h-4 ${isOffline ? 'text-rose-400' : 'text-indigo-400'}`} /> 
              {isOffline ? 'Hardware Integration Paused' : 'Hardware Integration Active'}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {isOffline
                ? 'The device has lost MQTT connection. Commands cannot be dispatched until it comes back online.'
                : 'Scanning RFID tags on your Arduino will publish events over MQTT and persist logs directly to Supabase.'}
            </p>
          </div>
          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Node Status:</span>
            <span className={`font-mono ${isOffline ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isOffline ? 'Disconnected (LWT)' : 'Listening Live'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}