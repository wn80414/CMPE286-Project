'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface LogEntry {
  id: string;
  device_id: string;
  card_uid: string;
  status: 'AUTHORIZED' | 'DENIED' | 'GRANTED';
  user_name?: string;
  created_at: string;
}

interface AccessLogsProps {
  logs: LogEntry[];
  deviceName: string;
  mounted: boolean;
}

export default function AccessLogs({ logs, deviceName, mounted }: AccessLogsProps) {
  // Industry-grade client-side deduplication using a Map filtered by unique log.id
  const uniqueLogs = Array.from(
    new Map(logs.map((log) => [log.id || Math.random().toString(), log])).values()
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 font-semibold flex justify-between items-center text-sm">
        <span>Access Audit History for {deviceName}</span>
        <span className="text-xs text-slate-500 font-normal">{uniqueLogs.length} events logged</span>
      </div>
      <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
        {uniqueLogs.length === 0 ? (
          <p className="p-6 text-slate-500 text-center text-sm">No scan logs recorded for this device yet.</p>
        ) : (
          uniqueLogs.map((log, index) => {
            const isAuthorized = log.status === 'AUTHORIZED' || log.status === 'GRANTED';
            return (
              <div key={`${log.id || 'log'}-${index}`} className="p-4 flex items-center justify-between text-sm hover:bg-slate-850/50 transition">
                <div className="flex items-center gap-3">
                  {isAuthorized ? (
                    <CheckCircle2 className="text-emerald-400 w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="text-rose-400 w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-200">
                      {log.user_name && log.user_name.trim() !== '' ? log.user_name : 'Unknown / Unregistered User'}
                    </p>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">UID: {log.card_uid}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${
                      isAuthorized
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {log.status}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {mounted ? new Date(log.created_at).toLocaleTimeString() : ''}
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