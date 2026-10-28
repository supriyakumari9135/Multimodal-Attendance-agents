'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar, NavTab } from '../components/Sidebar';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { CreateSessionModal } from '../components/CreateSessionModal';
import { OverviewView } from '../components/OverviewView';
import { LiveSessionView } from '../components/LiveSessionView';
import { AttendanceView } from '../components/AttendanceView';
import { EngagementAnalyticsView } from '../components/EngagementAnalyticsView';
import { AITeachingAssistantView } from '../components/AITeachingAssistantView';
import { StudentsView } from '../components/StudentsView';
import { SessionHistoryView } from '../components/SessionHistoryView';
import { ReportsView } from '../components/ReportsView';
import { PrivacySettingsView } from '../components/PrivacySettingsView';
import {
  getCourses,
  getSessions,
  getOverviewMetrics,
  getSessionAttendance,
  getSessionRecommendations,
  getSessionAnalyticsDetail,
  getStudents,
} from '../lib/api';
import {
  Course,
  Session,
  OverviewMetrics,
  AttendanceRecord,
  Recommendation,
  SessionEngagementSummary,
  Student,
} from '../types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionEngagementSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudentDetailId, setActiveStudentDetailId] = useState<string | null>(null);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Main data fetcher
  const loadData = useCallback(async () => {
    try {
      setBackendError(null);
      const [coursesData, sessionsData, studentsData] = await Promise.all([
        getCourses(),
        getSessions(selectedCourseId || undefined),
        getStudents(selectedCourseId || undefined),
      ]);

      setCourses(coursesData);
      setSessions(sessionsData);
      setStudents(studentsData);

      // Determine active session
      let targetSessionId = activeSessionId;
      if (!targetSessionId && sessionsData.length > 0) {
        const running = sessionsData.find((s) => s.status === 'running');
        targetSessionId = running ? running.id : sessionsData[0].id;
        setActiveSessionId(targetSessionId);
      }

      // Fetch overview metrics
      const ovMetrics = await getOverviewMetrics(selectedCourseId || undefined, targetSessionId || undefined);
      setOverviewMetrics(ovMetrics);

      // Fetch session-specific records if active session exists
      if (targetSessionId) {
        const [att, recs, summ] = await Promise.all([
          getSessionAttendance(targetSessionId).catch(() => []),
          getSessionRecommendations(targetSessionId).catch(() => []),
          getSessionAnalyticsDetail(targetSessionId).catch(() => null),
        ]);
        setAttendanceRecords(att);
        setRecommendations(recs);
        setSessionSummary(summ);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setBackendError(err.message || 'Unable to connect to backend.');
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, activeSessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setCurrentTab('live');
  };

  const handleStudentSelect = (studentId: string) => {
    setActiveStudentDetailId(studentId);
    setCurrentTab('students');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Navbar */}
      <Navbar
        courses={courses}
        selectedCourseId={selectedCourseId}
        onSelectCourse={(id) => {
          setSelectedCourseId(id);
          setActiveSessionId('');
        }}
        activeSession={activeSession}
        onNewSession={() => setCreateModalOpen(true)}
      />

      {/* Backend Offline / Connection Error Banner */}
      {backendError && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Local API Connection Notice:</strong> {backendError}
            </span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950 px-2 py-1 rounded bg-amber-100 hover:bg-amber-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setActiveStudentDetailId(null);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          unreadRecommendationsCount={recommendations.filter((r) => r.status === 'pending').length}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'overview' && (
              <OverviewView
                metrics={overviewMetrics}
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelectCourse={setSelectedCourseId}
                onSelectSession={handleSelectSession}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onRefresh={loadData}
                onToast={addToast}
              />
            )}

            {currentTab === 'live' && (
              <LiveSessionView
                session={activeSession}
                onSessionUpdated={(updated) => {
                  setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                  loadData();
                }}
                onToast={addToast}
              />
            )}

            {currentTab === 'attendance' && (
              <AttendanceView
                session={activeSession}
                records={attendanceRecords}
                onRecordUpdated={(updated) => {
                  setAttendanceRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                  loadData();
                }}
                onSelectStudent={handleStudentSelect}
                onToast={addToast}
              />
            )}

            {currentTab === 'analytics' && (
              <EngagementAnalyticsView
                session={activeSession}
                summary={sessionSummary}
                onToast={addToast}
              />
            )}

            {currentTab === 'assistant' && (
              <AITeachingAssistantView
                session={activeSession}
                recommendations={recommendations}
                onRecommendationUpdated={(updated) => {
                  setRecommendations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                }}
                onToast={addToast}
              />
            )}

            {currentTab === 'students' && (
              <StudentsView
                students={students}
                courses={courses}
                selectedCourseId={selectedCourseId}
                onRefresh={loadData}
                onToast={addToast}
                activeStudentDetailId={activeStudentDetailId}
                onCloseStudentDetail={() => setActiveStudentDetailId(null)}
              />
            )}

            {currentTab === 'history' && (
              <SessionHistoryView
                sessions={sessions}
                courses={courses}
                onSelectSession={handleSelectSession}
                onToast={addToast}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                sessions={sessions}
                activeSessionId={activeSessionId}
                onToast={addToast}
              />
            )}

            {currentTab === 'privacy' && (
              <PrivacySettingsView
                onToast={addToast}
                onRefreshAll={loadData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        courses={courses}
        defaultCourseId={selectedCourseId}
        onSessionCreated={(newSession) => {
          setSessions((prev) => [newSession, ...prev]);
          setActiveSessionId(newSession.id);
          setCurrentTab('live');
          loadData();
        }}
        onToast={addToast}
      />
    </div>
  );
}
