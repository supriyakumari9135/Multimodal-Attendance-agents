'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  Printer,
} from 'lucide-react';
import { Session } from '../types';
import { getSessionCSVReportUrl, getSessionPDFReportUrl } from '../lib/api';

interface ReportsViewProps {
  sessions: Session[];
  activeSessionId: string;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sessions,
  activeSessionId,
  onToast,
}) => {
  const [selectedId, setSelectedId] = useState(activeSessionId || (sessions[0]?.id || ''));

  const currentSession = sessions.find((s) => s.id === selectedId) || sessions[0];

  const handleDownloadJSON = () => {
    if (!currentSession) return;
    const jsonStr = JSON.stringify(currentSession, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Session_Debug_${currentSession.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('success', 'JSON Exported', 'Session debugging representation downloaded.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance & Session Reports</h2>
          <p className="text-xs text-slate-500 mt-1">
            Export official RFC-4180 CSV logs, executive PDF summaries, and transparent audit files.
          </p>
        </div>

        {/* Session Selector */}
        {sessions.length > 0 && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium self-start md:self-auto"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.course_code || 'General'})
              </option>
            ))}
          </select>
        )}
      </div>

      {currentSession ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: CSV Export */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Detailed CSV Export</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Contains raw timestamped attendance registers, interval engagement measurements, and AI recommendation history in spreadsheet format.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <a
                href={getSessionCSVReportUrl(currentSession.id)}
                download
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Session CSV</span>
              </a>
            </div>
          </div>

          {/* Card 2: PDF Executive Summary */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Executive PDF Report</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Formatted institutional document with metadata cards, attendance register table, ethical disclaimers, and teaching reflections.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <a
                href={getSessionPDFReportUrl(currentSession.id)}
                download
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Report</span>
              </a>
            </div>
          </div>

          {/* Card 3: JSON Debugging Export */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-4">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Structured JSON Export</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Complete structured JSON payload containing configuration dictionaries, timestamps, and model inference metadata.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={handleDownloadJSON}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export JSON Object</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          No sessions available to report.
        </div>
      )}

      {/* Ethical Reporting Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <span>
          Exported documents automatically include ethical boundaries, data limitations, and audit verification notices to ensure responsible institutional usage.
        </span>
      </div>
    </div>
  );
};
