'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Shield, Check } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import { Device } from './Sidebar';

interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevice: Device | null;
  onUpdate: () => void;
}

interface Role {
  id: string;
  name: string;
  is_allowed: boolean;
}

export default function EditDeviceModal({ isOpen, onClose, selectedDevice, onUpdate }: EditDeviceModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);

  useEffect(() => {
    if (isOpen && selectedDevice) {
      fetchDeviceRoles();
      setShowConfirmDelete(false);
    }
  }, [isOpen, selectedDevice]);

  const fetchDeviceRoles = async () => {
    if (!selectedDevice) return;
    try {
      const res = await fetch(`${API_BASE}/api/devices/${selectedDevice.id}/roles`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRoles(data);
      }
    } catch (err) {
      console.error('Failed to fetch device roles:', err);
    }
  };

  const toggleRoleCheckbox = (roleId: string) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, is_allowed: !r.is_allowed } : r))
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedDevice) return;
    setSavingRoles(true);
    try {
      const allowedRoleIds = roles.filter((r) => r.is_allowed).map((r) => r.id);

      const res = await fetch(`${API_BASE}/api/devices/${selectedDevice.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: allowedRoleIds }),
      });

      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (err) {
      console.error('Failed to update roles:', err);
    } finally {
      setSavingRoles(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/devices/${selectedDevice.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (err) {
      console.error('Error deleting device:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !selectedDevice) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold">Edit Device & Allowed Roles</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedDevice.name} ({selectedDevice.id})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles Permission Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Shield className="w-4 h-4" /> Allowed Roles for Access
          </div>
          <p className="text-xs text-slate-400">Select which user roles are permitted to unlock this device when scanning an RFID card.</p>
          
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
            {roles.map((role) => (
              <label
                key={role.id}
                onClick={() => toggleRoleCheckbox(role.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  role.is_allowed
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-sm font-medium">{role.name}</span>
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                  role.is_allowed ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                }`}>
                  {role.is_allowed && <Check className="w-3.5 h-3.5" />}
                </div>
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={savingRoles}
            onClick={handleSaveRoles}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white py-2.5 rounded-xl font-medium text-xs transition"
          >
            {savingRoles ? 'Saving Roles...' : 'Save Role Permissions'}
          </button>
        </div>

        {/* Danger Zone / Delete Section with Confirmation */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400">Danger Zone</h3>
          
          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-4 h-4" /> Delete This Device
            </button>
          ) : (
            <div className="bg-rose-950/30 border border-rose-500/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Are you sure? This action cannot be undone.</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDeleteDevice}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/50 text-white py-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}