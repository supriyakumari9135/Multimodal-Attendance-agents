'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Shield,
  FileText,
} from 'lucide-react';
import { Student, Course, StudentAttendanceHistory } from '../types';
import {
  createStudent,
  importStudentsCSV,
  getExportStudentsCSVUrl,
  getStudentAttendanceHistory,
} from '../lib/api';

interface StudentsViewProps {
  students: Student[];
  courses: Course[];
  selectedCourseId: string;
  onRefresh: () => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  activeStudentDetailId?: string | null;
  onCloseStudentDetail?: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  courses,
  selectedCourseId,
  onRefresh,
  onToast,
  activeStudentDetailId,
  onCloseStudentDetail,
}) => {
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // New Student Form
  const [studentCode, setStudentCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [savingStudent, setSavingStudent] = useState(false);

  // CSV Import Form
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    total_processed: number;
    imported_count: number;
    skipped_count: number;
    errors: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  // Student Attendance History Drawer
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<StudentAttendanceHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeStudentDetailId) {
      loadHistory(activeStudentDetailId);
    }
  }, [activeStudentDetailId]);

  const loadHistory = async (id: string) => {
    try {
      setLoadingHistory(true);
      const data = await getStudentAttendanceHistory(id);
      setSelectedStudentHistory(data);
    } catch (err: any) {
      onToast('error', 'History Load Failed', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim() || !displayName.trim()) {
      onToast('error', 'Validation Error', 'Student Code and Name are required.');
      return;
    }

    try {
      setSavingStudent(true);
      await createStudent({
        student_code: studentCode.trim().toUpperCase(),
        display_name: displayName.trim(),
        course_ids: enrolledCourseIds,
      });
      onToast('success', 'Student Enrolled', `Created record for ${displayName}.`);
      setAddModalOpen(false);
      setStudentCode('');
      setDisplayName('');
      setEnrolledCourseIds([]);
      onRefresh();
    } catch (err: any) {
      onToast('error', 'Creation Failed', err.message);
    } finally {
      setSavingStudent(false);
    }
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      setImporting(true);
      const res = await importStudentsCSV(importFile);
      setImportResult(res);
      onToast('success', 'CSV Processed', `Imported ${res.imported_count} students.`);
      onRefresh();
    } catch (err: any) {
      onToast('error', 'Import Failed', err.message);
    } finally {
      setImporting(false);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.display_name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Student & Course Roster</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {students.length} Enrolled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Privacy-first student directory, course enrollments, and verified attendance histories.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={getExportStudentsCSVUrl(selectedCourseId || undefined)}
            download
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Roster CSV</span>
          </a>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students by name or ID code..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Display Name</th>
                <th className="py-3 px-4">Enrolled Courses</th>
                <th className="py-3 px-4">Privacy Consent</th>
                <th className="py-3 px-4">Enrolled Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No enrolled students found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.student_code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.display_name}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {s.enrolled_courses && s.enrolled_courses.length > 0 ? (
                          s.enrolled_courses.map((c) => (
                            <span
                              key={c}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px] border border-slate-200"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <Shield className="w-3 h-3" />
                        <span>{s.consent_status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => loadHistory(s.id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        History & Metrics
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Add Student to Roster</h4>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID Code *</label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="e.g. STU-1025"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Lucas Bennett"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Enrollment</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 rounded-lg bg-slate-50 border border-slate-200">
                  {courses.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enrolledCourseIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEnrolledCourseIds([...enrolledCourseIds, c.id]);
                          } else {
                            setEnrolledCourseIds(enrolledCourseIds.filter((id) => id !== c.id));
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        {c.course_code}: {c.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {savingStudent ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal with Row-level feedback */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Import Student Roster from CSV</h4>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">CSV Formatting Requirements:</p>
                <p>Include headers for <code className="bg-white px-1 rounded">student_code</code> and <code className="bg-white px-1 rounded">display_name</code>. Optional column: <code className="bg-white px-1 rounded">course_code</code>.</p>
              </div>

              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  required
                />
              </div>

              {/* Import Results & Row-level errors */}
              {importResult && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Import Summary:</span>
                    <span className="text-emerald-700">{importResult.imported_count} imported successfully</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Total processed: {importResult.total_processed} • Skipped/Duplicate: {importResult.skipped_count}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-[10px] text-red-600 space-y-0.5 max-h-24 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <div key={i}>{err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportResult(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {importing ? 'Importing...' : 'Upload & Parse CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Detail History Drawer */}
      {selectedStudentHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {selectedStudentHistory.display_name} ({selectedStudentHistory.student_code})
                </h4>
                <p className="text-xs text-slate-500">Verified identity-linked attendance history</p>
              </div>
              <button
                onClick={() => setSelectedStudentHistory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Sessions</span>
                <p className="text-lg font-bold text-slate-900">{selectedStudentHistory.total_sessions}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Attended</span>
                <p className="text-lg font-bold text-slate-900">{selectedStudentHistory.attended_sessions}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Attendance Rate</span>
                <p className="text-lg font-bold text-emerald-700">{selectedStudentHistory.attendance_rate}%</p>
              </div>
            </div>

            {/* Session Records Table */}
            <div className="space-y-2 mt-4">
              <span className="text-xs font-bold text-slate-800">Session Breakdown:</span>
              {selectedStudentHistory.sessions.length === 0 ? (
                <p className="text-xs text-slate-400">No session attendance recorded yet.</p>
              ) : (
                selectedStudentHistory.sessions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{item.session_title}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.course_name} • Date: {item.date} • Duration: {Math.round(item.observed_duration)}s
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.status === 'present' || item.status === 'manually_confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Student rankings or behavioral scoring are strictly prohibited.</span>
              <button
                onClick={() => setSelectedStudentHistory(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
