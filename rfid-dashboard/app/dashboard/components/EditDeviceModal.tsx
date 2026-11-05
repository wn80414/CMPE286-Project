'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Settings, X, ShieldCheck } from 'lucide-react';
import { Device } from './Sidebar';
import { Role } from './UserManagement';

interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevice: Device | null;
  onUpdate: () => void;
}

export default function EditDeviceModal({ isOpen, onClose, selectedDevice, onUpdate }: EditDeviceModalProps) {
  const [editName, setEditName] = useState('');
  
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  useEffect(() => {
    if (selectedDevice && isOpen) {
      setEditName(selectedDevice.name || '');
      fetchRolesAndDevicePermissions(selectedDevice.id);
    }
  }, [selectedDevice, isOpen]);

  const fetchRolesAndDevicePermissions = async (deviceId: string) => {
    setLoading(true);
    const [rolesRes, permRes] = await Promise.all([
      supabase.from('roles').select('*').order('name'),
      supabase.from('device_allowed_roles').select('role_id').eq('device_id', deviceId)
    ]);

    if (!rolesRes.error) setAllRoles(rolesRes.data || []);
    if (!permRes.error) {
      setAllowedRoleIds(permRes.data.map((p: any) => p.role_id));
    }
    setLoading(false);
  };

  const handleRoleToggle = (roleId: string) => {
    setAllowedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !editName.trim()) return;

    // 1. Update basic device friendly name
    const { error: deviceError } = await supabase
      .from('devices')
      .update({
        name: editName.trim(),
      })
      .eq('id', selectedDevice.id);

    if (deviceError) {
      console.error('Error updating device name:', deviceError);
      return;
    }

    // 2. Sync allowed roles (Delete existing bindings and insert current selection)
    await supabase.from('device_allowed_roles').delete().eq('device_id', selectedDevice.id);

    if (allowedRoleIds.length > 0) {
      const newBindings = allowedRoleIds.map((roleId) => ({
        device_id: selectedDevice.id,
        role_id: roleId,
      }));
      await supabase.from('device_allowed_roles').insert(newBindings);
    }

    onUpdate();
    onClose();
  };

  if (!isOpen || !selectedDevice) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings className="text-indigo-500 w-5 h-5" /> Edit Device & Access Rules
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Friendly Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-lg text-xs text-slate-400 font-mono">
            <span>Device ID: {selectedDevice.id}</span>
            <span className="block text-[10px] text-slate-500 mt-0.5">Using flat topic architecture (`{selectedDevice.id}/status` & `{selectedDevice.id}/set`)</span>
          </div>

          {/* Permitted Roles Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Permitted Access Roles for this Lock
            </label>
            <p className="text-xs text-slate-500">
              Select which roles are authorized to unlock this specific hardware node during RFID scans.
            </p>

            {loading ? (
              <p className="text-xs text-slate-500 py-3">Loading roles...</p>
            ) : allRoles.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No roles created yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {allRoles.map((role) => {
                  const isChecked = allowedRoleIds.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleToggle(role.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                        isChecked
                          ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-medium flex items-center gap-1.5 truncate">
                        <ShieldCheck className={`w-3.5 h-3.5 ${isChecked ? 'text-indigo-400' : 'text-slate-600'}`} />
                        {role.name}
                      </span>
                      <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        isChecked ? 'bg-indigo-600 border-indigo-500' : 'border-slate-700'
                      }`}>
                        {isChecked && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}