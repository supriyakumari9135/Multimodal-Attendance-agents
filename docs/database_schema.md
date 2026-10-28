# Database Schema — Multimodal Attendance & Engagement Agent

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ COURSES : "teaches"
    COURSES ||--o{ ENROLLMENTS : "contains"
    STUDENTS ||--o{ ENROLLMENTS : "participates_in"
    STUDENTS ||--o{ CONSENTS : "grants"
    COURSES ||--o{ SESSIONS : "hosts"
    SESSIONS ||--o{ ATTENDANCE_RECORDS : "records"
    STUDENTS ||--o{ ATTENDANCE_RECORDS : "associated_with"
    SESSIONS ||--o{ ENGAGEMENT_METRICS : "tracks"
    SESSIONS ||--o{ RECOMMENDATIONS : "generates"
    AUDIT_LOGS }|--|| USERS : "logged_for"

    USERS {
        string id PK
        string display_name
        string email UK
        string password_hash
        string role
        datetime created_at
    }

    COURSES {
        string id PK
        string course_code UK
        string name
        string description
        string teacher_id FK
        boolean is_archived
        datetime created_at
    }

    STUDENTS {
        string id PK
        string student_code UK
        string display_name
        boolean has_reference_image
        datetime created_at
        datetime updated_at
    }

    ENROLLMENTS {
        string id PK
        string student_id FK
        string course_id FK
        string status
        datetime created_at
    }

    CONSENTS {
        string id PK
        string student_id FK
        string consent_type
        boolean granted
        datetime timestamp
        datetime revoked_at
    }

    SESSIONS {
        string id PK
        string course_id FK
        string title
        string teacher_name
        string subject
        datetime start_time
        datetime end_time
        string status
        string input_mode
        json configuration_json
        datetime created_at
    }

    ATTENDANCE_RECORDS {
        string id PK
        string session_id FK
        string student_id FK
        string anonymous_track_id
        datetime first_seen
        datetime last_seen
        float observed_duration
        string status
        string source
        boolean manually_corrected
        float confidence
        string notes
        datetime created_at
    }

    ENGAGEMENT_METRICS {
        string id PK
        string session_id FK
        float interval_start
        float interval_end
        string metric_name
        float metric_value
        float confidence
        string source_modality
        json metadata_json
        datetime created_at
    }

    RECOMMENDATIONS {
        string id PK
        string session_id FK
        string title
        string explanation
        json evidence_json
        string suggested_action
        float confidence
        string status
        datetime created_at
    }

    AUDIT_LOGS {
        string id PK
        string user_id
        string action
        string entity_type
        string entity_id
        datetime timestamp
        json details_json
    }
```

## 2. Table Specifications

### Users
- `id`: UUID Primary Key
- `display_name`: Full name of teacher or administrator
- `email`: Unique login identifier
- `role`: Role (`teacher`, `admin`, `observer`)

### Courses
- `id`: UUID Primary Key
- `course_code`: Unique institutional course code (e.g., `CS-402`)
- `name`: Course title
- `teacher_id`: Foreign key to `users.id`

### Students
- `id`: UUID Primary Key
- `student_code`: Unique identifier (e.g., `STU-1001`)
- `display_name`: Student full name
- `has_reference_image`: Opt-in local reference image flag

### AttendanceRecords
- `id`: UUID Primary Key
- `session_id`: Foreign key to `sessions.id` (Cascading delete)
- `student_id`: Nullable foreign key to `students.id`
- `anonymous_track_id`: Anonymous vision tracker identifier (e.g. `track_01`)
- `status`: `present`, `late`, `left_early`, `unverified`, `manually_confirmed`, `absent`
- `manually_corrected`: Boolean audit indicator
- `confidence`: Statistical detection score (0.0 to 1.0)

### EngagementMetrics
- `id`: UUID Primary Key
- `interval_start` & `interval_end`: Elapsed session seconds
- `metric_name`: `participation_activity`, `movement_frequency`, `head_orientation_indicator`, `voice_activity_ratio`, `composite_engagement`
- `metric_value`: Normalized 0.0 – 100.0 score
- `source_modality`: `video`, `audio`, `multimodal`, `simulated`

### Recommendations
- `id`: UUID Primary Key
- `title` & `explanation`: Explainable recommendation description
- `evidence_json`: Observed intervals, values, and limitations
- `status`: `pending`, `accepted`, `dismissed`, `completed`

### AuditLogs
- `id`: UUID Primary Key
- `action`: Operations including `CORRECT_ATTENDANCE`, `PURGE_SESSION_DATA`, `SEED_DEMO_DATA`
- `details_json`: Detailed payload of changed attributes
