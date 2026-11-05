'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Users, UserPlus, ShieldCheck, Trash2, KeyRound } from 'lucide-react';
import AddUserModal from './AddUserModal';
import RoleManagement from './RoleManagement';

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  card_uid: string | null;
  role_id: string | null;
  roles?: Role;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    const [usersRes, rolesRes] = await Promise.all([
      supabase.from('users').select('*, roles(*)').order('created_at', { ascending: false }),
      supabase.from('roles').select('*').order('name'),
    ]);

    if (!usersRes.error) setUsers(usersRes.data || []);
    if (!rolesRes.error) setRoles(rolesRes.data || []);
  };

  const handleCreateUser = async (newUserData: any) => {
    const { data, error } = await supabase
      .from('users')
      .insert([newUserData])
      .select('*, roles(*)')
      .single();

    if (!error && data) {
      setUsers((prev) => [data, ...prev]);
      setIsAddUserOpen(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeSubTab === 'users'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950'
            }`}
          >
            <Users className="w-4 h-4" /> Provisioned Users
          </button>
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeSubTab === 'roles'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Access Roles
          </button>
        </div>

        {activeSubTab === 'users' && (
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {activeSubTab === 'roles' ? (
        <RoleManagement
          roles={roles}
          onRoleCreated={(newRole) => setRoles((prev) => [...prev, newRole])}
          onRoleDeleted={(roleId) => setRoles((prev) => prev.filter((r) => r.id !== roleId))}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="text-indigo-500 w-5 h-5" /> Personnel Access Database
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage personnel records, badge UIDs, and assigned permission tiers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Job Title</th>
                  <th className="p-3">Assigned Badge UID</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No users provisioned yet.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-medium text-slate-100">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="p-3 text-slate-400">{user.title}</td>
                      <td className="p-3 font-mono text-xs">
                        {user.card_uid ? (
                          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-indigo-300">
                            {user.card_uid}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          {user.roles?.name || 'No Role'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        roles={roles}
        onAddUser={handleCreateUser}
      />
    </div>
  );
}