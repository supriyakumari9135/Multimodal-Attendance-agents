'use client';

import React, { useState } from 'react';
import {
  History,
  Search,
  Calendar,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Sparkles,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Session, Course } from '../types';
import { getSessionCSVReportUrl, getSessionPDFReportUrl } from '../lib/api';

interface SessionHistoryViewProps {
  sessions: Session[];
  courses: Course[];
  onSelectSession: (id: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const SessionHistoryView: React.FC<SessionHistoryViewProps> = ({
  sessions,
  courses,
  onSelectSession,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.teacher_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.course_name || '').toLowerCase().includes(search.toLowerCase());

    const matchesCourse = !courseFilter || s.course_id === courseFilter;
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesCourse && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Session History Archive</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {sessions.length} Recorded Sessions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Searchable historical catalog of classroom sessions, verified registers, and exportable audit reports.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions by title, course, or instructor..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code}: {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="ready">Ready</option>
        </select>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No matching sessions found.
          </div>
        ) : (
          filtered.map((sess) => (
            <div
              key={sess.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 hover:text-emerald-700 cursor-pointer" onClick={() => onSelectSession(sess.id)}>
                      {sess.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sess.course_name} • Instructor: {sess.teacher_name}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                      sess.status === 'running'
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : sess.status === 'completed'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {sess.status}
                  </span>
                </div>

                {/* Key Metrics Pill Badges */}
                <div className="flex items-center gap-3 mt-4 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{sess.present_count || 0} Present</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                    <span>Avg Score: {sess.average_engagement || 0}/100</span>
                  </div>
                  <span className="text-[11px] text-slate-400 capitalize">Mode: {sess.input_mode}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectSession(sess.id)}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>Open Session Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={getSessionCSVReportUrl(sess.id)}
                    download
                    title="Export CSV"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  </a>
                  <a
                    href={getSessionPDFReportUrl(sess.id)}
                    download
                    title="Export PDF Report"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-600" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
