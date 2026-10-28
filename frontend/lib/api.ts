import {
  OverviewMetrics,
  Course,
  Student,
  Session,
  AttendanceRecord,
  EngagementMetric,
  Recommendation,
  SessionEngagementSummary,
  StudentAttendanceHistory,
  PrivacySettings,
  Capabilities,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errData = await res.json();
        if (errData && errData.detail) {
          errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
        }
      } catch {
        // ignore json parse error
      }
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend service at ${API_BASE_URL}. Ensure backend is running.`);
    }
    throw err;
  }
}

// 1. Health & Capabilities
export async function getCapabilities(): Promise<Capabilities> {
  return fetchJSON<Capabilities>('/health/capabilities');
}

// 2. Overview Analytics
export async function getOverviewMetrics(courseId?: string, sessionId?: string): Promise<OverviewMetrics> {
  const params = new URLSearchParams();
  if (courseId) params.append('course_id', courseId);
  if (sessionId) params.append('session_id', sessionId);
  const q = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<OverviewMetrics>(`/analytics/overview${q}`);
}

// 3. Courses
export async function getCourses(includeArchived = false, search?: string): Promise<Course[]> {
  const params = new URLSearchParams();
  if (includeArchived) params.append('include_archived', 'true');
  if (search) params.append('search', search);
  const q = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<Course[]>(`/courses${q}`);
}

export async function createCourse(data: { course_code: string; name: string; description?: string }): Promise<Course> {
  return fetchJSON<Course>('/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateCourse(courseId: string, data: Partial<Course>): Promise<Course> {
  return fetchJSON<Course>(`/courses/${courseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// 4. Students
export async function getStudents(courseId?: string, search?: string): Promise<Student[]> {
  const params = new URLSearchParams();
  if (courseId) params.append('course_id', courseId);
  if (search) params.append('search', search);
  const q = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<Student[]>(`/students${q}`);
}

export async function createStudent(data: { student_code: string; display_name: string; course_ids?: string[] }): Promise<Student> {
  return fetchJSON<Student>('/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function importStudentsCSV(file: File): Promise<{
  total_processed: number;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}> {
  const formData = new FormData();
  formData.append('file', file);
  return fetchJSON('/students/import', {
    method: 'POST',
    body: formData,
  });
}

export function getExportStudentsCSVUrl(courseId?: string): string {
  const q = courseId ? `?course_id=${courseId}` : '';
  return `${API_BASE_URL}/students/export${q}`;
}

// 5. Sessions
export async function getSessions(courseId?: string, statusFilter?: string): Promise<Session[]> {
  const params = new URLSearchParams();
  if (courseId) params.append('course_id', courseId);
  if (statusFilter) params.append('status_filter', statusFilter);
  const q = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<Session[]>(`/sessions${q}`);
}

export async function getSession(sessionId: string): Promise<Session> {
  return fetchJSON<Session>(`/sessions/${sessionId}`);
}

export async function createSession(data: {
  course_id: string;
  title: string;
  teacher_name?: string;
  subject?: string;
  input_mode?: 'live_camera' | 'uploaded_video' | 'simulated';
  configuration_json?: any;
}): Promise<Session> {
  return fetchJSON<Session>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function startSession(sessionId: string): Promise<Session> {
  return fetchJSON<Session>(`/sessions/${sessionId}/start`, { method: 'POST' });
}

export async function pauseSession(sessionId: string): Promise<Session> {
  return fetchJSON<Session>(`/sessions/${sessionId}/pause`, { method: 'POST' });
}

export async function resumeSession(sessionId: string): Promise<Session> {
  return fetchJSON<Session>(`/sessions/${sessionId}/resume`, { method: 'POST' });
}

export async function stopSession(sessionId: string): Promise<Session> {
  return fetchJSON<Session>(`/sessions/${sessionId}/stop`, { method: 'POST' });
}

export async function finalizeSession(sessionId: string): Promise<Session> {
  return fetchJSON<Session>(`/sessions/${sessionId}/finalize`, { method: 'POST' });
}

// 6. Processing & Video Upload
export async function uploadSessionVideo(sessionId: string, file: File): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return fetchJSON(`/sessions/${sessionId}/upload`, {
    method: 'POST',
    body: formData,
  });
}

export async function getSessionProcessingStatus(sessionId: string): Promise<{
  status: string;
  progress: number;
  message: string;
}> {
  return fetchJSON(`/sessions/${sessionId}/processing-status`);
}

export async function getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
  return fetchJSON<AttendanceRecord[]>(`/sessions/${sessionId}/attendance`);
}

export async function correctAttendance(sessionId: string, recordId: string, data: {
  status: string;
  student_id?: string;
  notes?: string;
}): Promise<AttendanceRecord> {
  return fetchJSON<AttendanceRecord>(`/sessions/${sessionId}/attendance/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getSessionMetrics(sessionId: string): Promise<EngagementMetric[]> {
  return fetchJSON<EngagementMetric[]>(`/sessions/${sessionId}/metrics`);
}

export async function getSessionRecommendations(sessionId: string): Promise<Recommendation[]> {
  return fetchJSON<Recommendation[]>(`/sessions/${sessionId}/recommendations`);
}

export async function updateRecommendationStatus(sessionId: string, recId: string, status: string): Promise<Recommendation> {
  return fetchJSON<Recommendation>(`/sessions/${sessionId}/recommendations/${recId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

// 7. Analytics & History
export async function getSessionAnalyticsDetail(sessionId: string): Promise<SessionEngagementSummary> {
  return fetchJSON<SessionEngagementSummary>(`/analytics/sessions/${sessionId}`);
}

export async function getStudentAttendanceHistory(studentId: string): Promise<StudentAttendanceHistory> {
  return fetchJSON<StudentAttendanceHistory>(`/analytics/students/${studentId}/attendance-history`);
}

// 8. Reports
export function getSessionCSVReportUrl(sessionId: string): string {
  return `${API_BASE_URL}/reports/sessions/${sessionId}/csv`;
}

export function getSessionPDFReportUrl(sessionId: string): string {
  return `${API_BASE_URL}/reports/sessions/${sessionId}/pdf`;
}

// 9. Privacy & Demo Mode
export async function getPrivacySettings(): Promise<PrivacySettings> {
  return fetchJSON<PrivacySettings>('/privacy/settings');
}

export async function updatePrivacySettings(data: Partial<PrivacySettings>): Promise<PrivacySettings> {
  return fetchJSON<PrivacySettings>('/privacy/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteSessionData(sessionId: string, deleteMediaOnly = false): Promise<{ success: boolean; message: string }> {
  return fetchJSON('/privacy/delete-session-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, delete_media_only: deleteMediaOnly }),
  });
}

export async function seedDemoData(force = true): Promise<{ success: boolean; data: any }> {
  return fetchJSON(`/privacy/seed-demo?force=${force}`, { method: 'POST' });
}

export async function resetDemoData(): Promise<{ success: boolean; data: any }> {
  return fetchJSON('/privacy/reset-demo?confirm=true', { method: 'POST' });
}
