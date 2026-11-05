'use client';

import { useState, useEffect } from 'react';
import { UserCheck, UserX, Shield, Edit2, Trash2, UserPlus, AlertCircle, Check, X } from 'lucide-react';
import AddUserModal from './AddUserModal';

export interface Role {
  id: string;
  name: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  card_uid: string;
  role_id: string;
  is_active: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users`);
      const text = await res.text();
      if (!res.ok) throw new Error(`Server error (${res.status}): ${text}`);
      
      const data = JSON.parse(text);
      if (Array.isArray(data)) setUsers(data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err.message);
      setErrorMsg('Could not load users. Check if backend server is running.');
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/roles`);
      const text = await res.text();
      if (res.ok) {
        const data = JSON.parse(text);
        if (Array.isArray(data)) setRoles(data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleAddUser = async (newUserData: {
    first_name: string;
    last_name: string;
    title: string;
    card_uid: string | null;
    role_id: string | null;
  }) => {
    try {
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Failed to create user (${res.status}): ${text}`);

      const data = JSON.parse(text);
      if (data.user) {
        setUsers([...users, data.user]);
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to add user:', err.message);
      setErrorMsg(`Failed to provision user: ${err.message}`);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Update failed (${res.status}): ${text}`);

      const data = JSON.parse(text);
      if (data.user) {
        setUsers(users.map((u) => (u.id === editingUser.id ? data.user : u)));
        setEditingUser(null);
      }
    } catch (err: any) {
      console.error('Failed to update user:', err.message);
      setErrorMsg(`Failed to update user: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to completely delete this user?')) return;

    try {
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete user');

      setUsers(users.filter((u) => u.id !== userId));
    } catch (err: any) {
      console.error('Failed to delete user:', err.message);
      setErrorMsg(`Failed to delete user.`);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, is_active: !user.is_active }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Update failed (${res.status}): ${text}`);

      setUsers(users.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u)));
    } catch (err: any) {
      console.error('Failed to update status:', err.message);
      setErrorMsg(`Failed to update status for ${user.first_name}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">User Access Management</h1>
          <p className="text-xs text-slate-400 mt-1">Manage personnel, credentials, roles, and active security privileges.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
        >
          <UserPlus className="w-4 h-4" /> Provision New User
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Users Table (Read) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider bg-slate-950/50">
              <th className="p-4">Name / Title</th>
              <th className="p-4">Card UID</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No users found or backend offline.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-4">
                    <div className="font-medium text-slate-200">{user.first_name} {user.last_name}</div>
                    <div className="text-xs text-slate-400">{user.title}</div>
                  </td>
                  <td className="p-4 font-mono text-xs text-indigo-300">{user.card_uid || 'Unassigned'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      user.is_active !== false
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {user.is_active !== false ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {user.is_active !== false ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        user.is_active !== false
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {user.is_active !== false ? 'Suspend' : 'Restore'}
                    </button>
                    <button
                      onClick={() => setEditingUser(user)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        roles={roles}
        onAddUser={handleAddUser}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Edit2 className="text-indigo-500 w-5 h-5" /> Edit User Profile
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.first_name}
                    onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.last_name}
                    onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={editingUser.title}
                  onChange={(e) => setEditingUser({ ...editingUser, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">RFID Card UID</label>
                <input
                  type="text"
                  value={editingUser.card_uid || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, card_uid: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Assign Role</label>
                <select
                  value={editingUser.role_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, role_id: e.target.value })}
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
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}