'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Shield, Plus, ShieldAlert, X, Trash2 } from 'lucide-react';
import { Role } from './UserManagement';

interface RoleManagementProps {
  roles: Role[];
  onRoleCreated: (newRole: Role) => void;
  onRoleDeleted: (roleId: string) => void;
}

export default function RoleManagement({ roles, onRoleCreated, onRoleDeleted }: RoleManagementProps) {
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    const { data, error } = await supabase
      .from('roles')
      .insert([{ name: roleName.trim(), description: roleDescription.trim() }])
      .select()
      .single();

    if (!error && data) {
      onRoleCreated(data);
      setRoleName('');
      setRoleDescription('');
      setIsAddRoleOpen(false);
    } else {
      console.error('Error creating role:', error);
    }
  };

  const handleDeleteRole = async (id: string) => {
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (!error) {
      onRoleDeleted(id);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="text-indigo-500 w-5 h-5" /> Role Permissions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Define system roles that will eventually sync to offline hardware controllers.
          </p>
        </div>
        <button
          onClick={() => setIsAddRoleOpen(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition"
        >
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" /> {role.name}
                </span>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="text-slate-600 hover:text-rose-400 transition p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {role.description || 'No description provided.'}
              </p>
            </div>
            <div className="text-[10px] text-slate-500 font-mono border-t border-slate-900 pt-2">
              ID: {role.id.substring(0, 12)}...
            </div>
          </div>
        ))}
      </div>

      {/* Create Role Modal */}
      {isAddRoleOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Shield className="text-indigo-500 w-5 h-5" /> Create Access Role
              </h3>
              <button onClick={() => setIsAddRoleOpen(false)} className="text-slate-400 hover:text-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supervisor"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of permissions..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRoleOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}