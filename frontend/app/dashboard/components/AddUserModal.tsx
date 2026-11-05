'use client';

import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Role } from './UserManagement';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onAddUser: (userData: {
    first_name: string;
    last_name: string;
    title: string;
    card_uid: string | null;
    role_id: string | null;
  }) => void;
}

export default function AddUserModal({ isOpen, onClose, roles, onAddUser }: AddUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [cardUid, setCardUid] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !title) return;

    onAddUser({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      title: title.trim(),
      card_uid: cardUid.trim().toUpperCase() || null,
      role_id: selectedRoleId || null,
    });

    setFirstName('');
    setLastName('');
    setTitle('');
    setCardUid('');
    setSelectedRoleId('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="text-indigo-500 w-5 h-5" /> Provision New User
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
              <input
                type="text"
                required
                placeholder="Alex"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
              <input
                type="text"
                required
                placeholder="Morgan"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Job Title</label>
            <input
              type="text"
              required
              placeholder="Security Specialist"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">RFID Card UID (Optional)</label>
            <input
              type="text"
              placeholder="E2 D6 CA 06"
              value={cardUid}
              onChange={(e) => setCardUid(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Assign Role</label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Select Permission Role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
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
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}