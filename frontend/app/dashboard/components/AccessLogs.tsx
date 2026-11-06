'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, ShieldAlert, History, Activity } from 'lucide-react';

export interface LogEntry {
  id: string;
  device_id: string;
  card_uid?: string;
  status?: 'AUTHORIZED' | 'DENIED' | 'GRANTED';
  user_name?: string;
  log_type?: string;     // 'ACCESS_SCAN', 'ADMIN_ACTION', etc.
  action?: string;       // 'UNLOCKED', 'LOCKED', 'TEMP_OPEN', etc.
  actor_or_card?: string; // Who or what performed the action
  metadata?: any;
  created_at: string;
}

interface AccessLogsProps {
  logs: LogEntry[];
  auditLogs: LogEntry[];
  deviceName: string;
  mounted: boolean;
}

export default function AccessLogs({ logs, auditLogs, deviceName, mounted }: AccessLogsProps) {
  const [activeLogTab, setActiveLogTab] = useState<'scans' | 'audit'>('scans');

  // Select the correct list based on active tab
  const rawList = activeLogTab === 'audit' ? auditLogs : logs;

  // Deduplicate using a Map filtered by unique log.id
  const currentLogs = Array.from(
    new Map(rawList.map((log) => [log.id || Math.random().toString(), log])).values()
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header and Toggle Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-semibold text-sm text-slate-100">Activity History for {deviceName}</h3>
          <p className="text-xs text-slate-500 font-normal mt-0.5">{currentLogs.length} events recorded</p>
        </div>

        {/* Tab Switcher / Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveLogTab('scans')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeLogTab === 'scans'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            Access Scans ({logs.length})
          </button>
          <button
            onClick={() => setActiveLogTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeLogTab === 'audit'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            Admin Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Log Feed List */}
      <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
        {currentLogs.length === 0 ? (
          <p className="p-6 text-slate-500 text-center text-sm">
            {activeLogTab === 'audit' 
              ? 'No administrative actions or audit events recorded for this device yet.' 
              : 'No scan logs recorded for this device yet.'}
          </p>
        ) : (
          currentLogs.map((log, index) => {
            const isAudit = activeLogTab === 'audit';
            const isAuthorized = log.status === 'AUTHORIZED' || log.status === 'GRANTED';

            return (
              <div key={`${log.id || 'log'}-${index}`} className="p-4 flex items-center justify-between text-sm hover:bg-slate-850/50 transition">
                <div className="flex items-center gap-3">
                  {isAudit ? (
                    <Activity className="text-indigo-400 w-5 h-5 flex-shrink-0" />
                  ) : isAuthorized ? (
                    <CheckCircle2 className="text-emerald-400 w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="text-rose-400 w-5 h-5 flex-shrink-0" />
                  )}

                  <div>
                    <p className="font-semibold text-slate-200">
                      {isAudit 
                        ? `Action: ${log.action || 'SYSTEM_EVENT'}` 
                        : (log.user_name && log.user_name.trim() !== '' ? log.user_name : 'Unknown / Unregistered User')}
                    </p>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">
                      {isAudit ? `Actor: ${log.actor_or_card || log.metadata?.actor || 'SYSTEM'}` : `UID: ${log.card_uid}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${
                      isAudit
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : isAuthorized
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {isAudit ? (log.log_type || 'ADMIN_ACTION') : log.status}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {mounted && log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}