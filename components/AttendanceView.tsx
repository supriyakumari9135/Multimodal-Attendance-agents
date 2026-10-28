'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  X,
  FileSpreadsheet,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { AttendanceRecord, Session } from '../types';
import { correctAttendance, getSessionCSVReportUrl } from '../lib/api';

interface AttendanceViewProps {
  session: Session | null;
  records: AttendanceRecord[];
  onRecordUpdated: (updated: AttendanceRecord) => void;
  onSelectStudent: (studentId: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  session,
  records,
  onRecordUpdated,
  onSelectStudent,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<string>('present');
  const [correctionNotes, setCorrectionNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      (r.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.student_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.anonymous_track_id || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCorrection = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setNewStatus(record.status);
    setCorrectionNotes(record.notes || '');
  };

  const handleSaveCorrection = async () => {
    if (!editingRecord || !session) return;
    try {
      setSaving(true);
      const updated = await correctAttendance(session.id, editingRecord.id, {
        status: newStatus,
        notes: correctionNotes.trim() || undefined,
      });
      onRecordUpdated(updated);
      onToast('success', 'Attendance Corrected', `Updated ${updated.student_name} to ${updated.status}.`);
      setEditingRecord(null);
    } catch (err: any) {
      onToast('error', 'Correction Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Attendance Register</h2>
            {session && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {session.title}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verified presence intervals, detector confidence, and human-verified manual corrections.
          </p>
        </div>

        {session && (
          <a
            href={getSessionCSVReportUrl(session.id)}
            download
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Register CSV</span>
          </a>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, code, or track ID..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="manually_confirmed">Manually Confirmed</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student Code</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Observed Duration</th>
                <th className="py-3 px-4">Detector Confidence</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Notes / Audit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold">
                      {rec.student_id ? (
                        <button
                          onClick={() => onSelectStudent(rec.student_id!)}
                          className="text-emerald-700 hover:underline text-left font-semibold"
                        >
                          {rec.student_name}
                        </button>
                      ) : (
                        <span>{rec.student_name || rec.anonymous_track_id}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {rec.student_code || 'ANONYMOUS'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          rec.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'manually_confirmed'
                            ? 'bg-sky-100 text-sky-800'
                            : rec.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : rec.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {rec.status === 'manually_confirmed' ? 'Confirmed' : rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {Math.floor(rec.observed_duration / 60)}m {Math.round(rec.observed_duration % 60)}s
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.round(rec.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500">{Math.round(rec.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 capitalize">{rec.source}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {rec.manually_corrected ? (
                        <span className="text-sky-700 font-medium">{rec.notes || 'Manually adjusted'}</span>
                      ) : (
                        rec.notes || '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenCorrection(rec)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3 text-slate-400" />
                        <span>Correct</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Correct Attendance Record</h4>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-xs text-slate-500">Student:</span>
                <p className="text-sm font-bold text-slate-800">{editingRecord.student_name}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800"
                >
                  <option value="present">Present</option>
                  <option value="manually_confirmed">Manually Confirmed</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher Audit Note</label>
                <textarea
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="e.g. Student confirmed present via physical roster"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>All manual corrections are permanently logged in the audit trail.</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrection}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {saving ? 'Saving...' : 'Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
