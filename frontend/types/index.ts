export interface Course {
  id: string;
  course_code: string;
  name: string;
  description?: string;
  teacher_id: string;
  is_archived: boolean;
  created_at: string;
  enrolled_count?: number;
}

export interface Student {
  id: string;
  student_code: string;
  display_name: string;
  has_reference_image: boolean;
  created_at: string;
  updated_at: string;
  enrolled_courses?: string[];
  consent_status?: string;
}

export interface Session {
  id: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  title: string;
  teacher_name: string;
  subject?: string;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'ready' | 'running' | 'paused' | 'processing' | 'completed' | 'failed';
  input_mode: 'live_camera' | 'uploaded_video' | 'simulated';
  configuration_json?: {
    sample_interval?: number;
    min_duration_seconds?: number;
    weights?: {
      participation?: number;
      movement?: number;
      head_orientation?: number;
      audio?: number;
    };
    modalities_enabled?: string[];
  };
  created_at: string;
  present_count?: number;
  total_enrolled?: number;
  average_engagement?: number;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id?: string;
  student_name?: string;
  student_code?: string;
  anonymous_track_id?: string;
  first_seen?: string;
  last_seen?: string;
  observed_duration: number;
  status: 'present' | 'late' | 'left_early' | 'unverified' | 'manually_confirmed' | 'absent';
  source: string;
  manually_corrected: boolean;
  confidence: number;
  notes?: string;
  created_at: string;
}

export interface EngagementMetric {
  id: string;
  session_id: string;
  interval_start: number;
  interval_end: number;
  metric_name: string;
  metric_value: number;
  confidence: number;
  source_modality: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface Recommendation {
  id: string;
  session_id: string;
  title: string;
  explanation: string;
  evidence_json?: {
    metric_name?: string;
    initial_value?: number;
    recent_value?: number;
    interval?: string;
    confidence?: number;
    limitation?: string;
    duration_minutes?: number;
    missing_modality?: string;
    active_modalities?: string[];
  };
  suggested_action: string;
  confidence: number;
  status: 'pending' | 'accepted' | 'dismissed' | 'completed';
  created_at: string;
}

export interface OverviewMetrics {
  total_enrolled_students: number;
  present_students_count: number;
  attendance_rate_percentage: number;
  current_session_duration_minutes: number;
  average_engagement_score: number;
  participation_activity_level: string;
  active_session_id?: string;
  active_session_title?: string;
  recent_sessions: Array<{
    id: string;
    title: string;
    course_name: string;
    status: string;
    input_mode: string;
    present_count: number;
    created_at: string;
  }>;
  recent_attendance_events: Array<{
    id: string;
    session_id: string;
    student_name: string;
    status: string;
    observed_duration: number;
    source: string;
    time: string;
  }>;
  teaching_recommendations_count: number;
  top_recommendations: Array<{
    id: string;
    title: string;
    explanation: string;
    suggested_action: string;
    status: string;
    confidence: number;
  }>;
  is_demo_data: boolean;
}

export interface SessionEngagementSummary {
  session_id: string;
  composite_engagement_score: number;
  confidence_level: number;
  available_modalities: string[];
  missing_modalities: string[];
  weights_used: Record<string, number>;
  timeline_intervals: Array<{
    interval_start: number;
    interval_end: number;
    time_label: string;
    participation_activity: number;
    movement_frequency: number;
    head_orientation_indicator: number;
    voice_activity_ratio: number | null;
    composite_engagement: number;
  }>;
  explanation_notes: string[];
  data_quality_status: string;
}

export interface StudentAttendanceHistory {
  student_id: string;
  student_code: string;
  display_name: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_rate: number;
  sessions: Array<{
    session_id: string;
    session_title: string;
    course_name: string;
    date: string;
    status: string;
    observed_duration: number;
    confidence: number;
    manually_corrected: boolean;
    notes?: string;
  }>;
}

export interface PrivacySettings {
  local_processing_active: boolean;
  auto_delete_raw_media: boolean;
  media_retention_hours: number;
  enable_audit_logging: boolean;
  total_stored_sessions: number;
  total_audit_logs: number;
  retained_media_files_count: number;
  storage_directory: string;
}

export interface Capabilities {
  offline_ready: boolean;
  opencv_available: boolean;
  mediapipe_available: boolean;
  audio_vad_available: boolean;
  speech_transcription_available: boolean;
  pdf_export_available: boolean;
  active_device: string;
  media_storage_path: string;
}
