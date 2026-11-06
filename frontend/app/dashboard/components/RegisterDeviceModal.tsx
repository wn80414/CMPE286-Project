'use client';

import React, { useState } from 'react';
import { Cpu, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
}

export default function RegisterDeviceModal({ isOpen, onClose, onRegister }: RegisterDeviceModalProps) {
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName) return;

    setLoading(true);
    const formattedId = newId.trim().toLowerCase().replace(/\s+/g, '_');

    const { error } = await supabase.from('devices').insert([
      {
        id: formattedId,
        name: newName.trim(),
        status: 'OFFLINE',
        lock_state: 'LOCKED',
      },
    ]);

    setLoading(false);

    if (error) {
      console.error('Error registering device:', error.message);
      alert(`Failed to register device: ${error.message}`);
    } else {
      setNewId('');
      setNewName('');
      onRegister();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="text-indigo-500 w-5 h-5" /> Register New Device
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Device Friendly Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Front Entrance"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Device ID / Slug</label>
            <input
              type="text"
              required
              placeholder="e.g. front_door"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              MQTT Topics: Status on <code className="text-indigo-400">&lt;id&gt;/status</code>, Control on <code className="text-indigo-400">&lt;id&gt;/set</code>
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              {loading ? 'Saving...' : 'Save Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}