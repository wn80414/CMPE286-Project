'use client';

import { useState } from 'react';
import { Lock, Unlock, PlayCircle, Loader2 } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  status: string;
  lock_state: 'LOCKED' | 'UNLOCKED';
}

interface LockControlProps {
  selectedDevice: Device;
  onCommandSent: (command: string) => void;
}

// Uses environment variable with local fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function LockControl({ selectedDevice, onCommandSent }: LockControlProps) {
  const [isPending, setIsPending] = useState(false);

  const handleActionClick = async (command: 'TEMP_OPEN' | 'UNLOCKED' | 'LOCKED') => {
    setIsPending(true);
    try {
      // Fixed: Matches backend route /:id/control and passes { action } payload
      const res = await fetch(`${API_URL}/api/devices/${selectedDevice.id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: command }),
      });

      if (res.ok) {
        onCommandSent(command);
      } else {
        const errData = await res.json();
        console.error('Failed to send command:', errData.error);
      }
    } catch (err) {
      console.error('Failed to send command:', err);
    } finally {
      // Keep loading indicator briefly until MQTT acknowledgment updates state
      setTimeout(() => setIsPending(false), 2000);
    }
  };

  const isOffline = selectedDevice.status === 'OFFLINE';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{selectedDevice.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Node ID: {selectedDevice.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            isOffline 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
            {selectedDevice.status}
          </span>
        </div>
      </div>

      {/* State Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        selectedDevice.lock_state === 'UNLOCKED'
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          : 'bg-slate-950 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-3">
          {selectedDevice.lock_state === 'UNLOCKED' ? (
            <Unlock className="w-6 h-6 text-amber-400" />
          ) : (
            <Lock className="w-6 h-6 text-indigo-400" />
          )}
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Current Lock Status</div>
            <div className="text-lg font-bold">{selectedDevice.lock_state}</div>
          </div>
        </div>
        {isPending && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
            <Loader2 className="w-4 h-4 animate-spin" />
            Dispatching...
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <button
          onClick={() => handleActionClick('TEMP_OPEN')}
          disabled={isOffline || isPending}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-slate-200 transition border border-slate-700 shadow-sm"
        >
          <PlayCircle className="w-4 h-4 text-indigo-400" />
          Temp Open (4s)
        </button>

        <button
          onClick={() => handleActionClick('UNLOCKED')}
          disabled={isOffline || isPending}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition shadow-sm"
        >
          <Unlock className="w-4 h-4" />
          Unlock Door
        </button>

        <button
          onClick={() => handleActionClick('LOCKED')}
          disabled={isOffline || isPending}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition shadow-sm"
        >
          <Lock className="w-4 h-4" />
          Lock Door
        </button>
      </div>
    </div>
  );
}