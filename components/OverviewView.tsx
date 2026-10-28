'use client';

import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Percent,
  Clock,
  TrendingUp,
  Activity,
  Bot,
  RefreshCw,
  Database,
  Trash2,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { OverviewMetrics, Course, Session } from '../types';
import { seedDemoData, resetDemoData } from '../lib/api';

interface OverviewViewProps {
  metrics: OverviewMetrics | null;
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
  onSelectSession: (id: string) => void;
  onNavigateTab: (tab: any) => void;
  onRefresh: () => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  courses,
  selectedCourseId,
  onSelectCourse,
  onSelectSession,
  onNavigateTab,
  onRefresh,
  onToast,
}) => {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleLoadDemo = async () => {
    try {
      setLoadingAction(true);
      await seedDemoData(true);
      onToast('success', 'Demo Data Seeded', 'Loaded 2 courses, 14 students, and 4 simulated sessions.');
      onRefresh();
    } catch (err: any) {
      onToast('error', 'Seed Failed', err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      setLoadingAction(true);
      await resetDemoData();
      setResetDialogOpen(false);
      onToast('info', 'Database Wiped', 'All demo data has been cleaned up.');
      onRefresh();
    } catch (err: any) {
      onToast('error', 'Reset Failed', err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          <Database className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Classroom Session Data</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          The database is clean. You can initialize the preconfigured demonstration dataset or start a new classroom session.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLoadDemo}
            disabled={loadingAction}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load Demo Data</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Context & Filter Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Classroom Intelligence Overview</h2>
            {metrics.is_demo_data && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Demo Mode Records
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time aggregate presence indicators, activity trends, and AI-assisted teaching suggestions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleLoadDemo}
            disabled={loadingAction}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5"
            title="Reload reproducible demo data"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Reload Demo Data</span>
          </button>

          <button
            onClick={() => setResetDialogOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1.5"
            title="Wipe demo records"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {resetDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Reset Demo Data?</h4>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              This will remove all generated courses, students, and session records from the local SQLite database.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setResetDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemo}
                disabled={loadingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
              >
                {loadingAction ? 'Resetting...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Total Enrolled */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Enrolled Students</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.total_enrolled_students}</div>
          <p className="text-[11px] text-slate-500 mt-1">Registered in roster</p>
        </div>

        {/* Card 2: Present Count */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Verified Present</span>
            <UserCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.present_students_count}</div>
          <p className="text-[11px] text-slate-500 mt-1">In active session</p>
        </div>

        {/* Card 3: Attendance Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Attendance Rate</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {metrics.attendance_rate_percentage}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sustained presence</p>
        </div>

        {/* Card 4: Current Duration */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Session Pacing</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.current_session_duration_minutes}m
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Elapsed duration</p>
        </div>

        {/* Card 5: Average Engagement Score */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Avg Engagement</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.average_engagement_score}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Multimodal composite</p>
        </div>

        {/* Card 6: Participation Level */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Activity Level</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.participation_activity_level}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dynamic interaction</p>
        </div>
      </div>

      {/* Main Grid: Recent Sessions & Live Attendance Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sessions List (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Classroom Sessions</h3>
              <p className="text-xs text-slate-500">History of active and completed instruction periods</p>
            </div>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {metrics.recent_sessions.map((sess) => (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess.id)}
                className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{sess.title}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sess.course_name} • {sess.present_count} present • Mode: {sess.input_mode}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Live Attendance Events Ticker (1 col) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Attendance Events</h3>
                <p className="text-xs text-slate-500">Live presence check-ins</p>
              </div>
              <button
                onClick={() => onNavigateTab('attendance')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Register
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {metrics.recent_attendance_events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{evt.student_name}</p>
                    <p className="text-[11px] text-slate-500">
                      Duration: {Math.round(evt.observed_duration)}s • {evt.source}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      evt.status === 'present'
                        ? 'bg-emerald-100 text-emerald-800'
                        : evt.status === 'late'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Verified through local detector</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* AI Teaching Suggestions Highlight Section */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Teaching Suggestions</h3>
              <p className="text-xs text-slate-500">
                Evidence-based suggestions generated deterministically from session signals
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('assistant')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All Assistant Insights</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.top_recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800">{rec.title}</h4>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Confidence: {Math.round(rec.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{rec.explanation}</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-medium text-emerald-800">
                <span className="truncate">Action: {rec.suggested_action}</span>
                <button
                  onClick={() => onNavigateTab('assistant')}
                  className="flex-shrink-0 text-emerald-700 hover:underline text-[11px]"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
