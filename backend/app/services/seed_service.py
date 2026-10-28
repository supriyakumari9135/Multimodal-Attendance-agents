import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment
from app.models.consent import Consent
from app.models.session import Session as ClassroomSession
from app.models.attendance import AttendanceRecord
from app.models.engagement import EngagementMetric
from app.models.recommendation import Recommendation
from app.models.audit import AuditLog
from app.services.simulation_engine import generate_simulated_session_data
from app.services.audit_service import log_audit_event

logger = logging.getLogger(__name__)

DEMO_STUDENTS = [
    ("STU-1001", "Alex Rivera", True),
    ("STU-1002", "Maya Chen", True),
    ("STU-1003", "Jordan Taylor", True),
    ("STU-1004", "Priya Patel", True),
    ("STU-1005", "Marcus Johnson", True),
    ("STU-1006", "Elena Rostova", True),
    ("STU-1007", "Devon Brooks", True),
    ("STU-1008", "Amina Al-Mansoor", True),
    ("STU-1009", "Liam O'Connor", True),
    ("STU-1010", "Sophia Martinez", True),
    ("STU-1011", "Hassan Tariq", True),
    ("STU-1012", "Chloe Dupont", True),
    ("STU-1013", "Ethan Wright", True),
    ("STU-1014", "Zoe Takahashi", True),
]

def seed_demo_data(db: Session, force: bool = False) -> dict:
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Check if demo data already exists
    existing_user = db.query(User).filter_by(email="teacher@institution.edu").first()
    if existing_user and not force:
        course_count = db.query(Course).count()
        student_count = db.query(Student).count()
        session_count = db.query(ClassroomSession).count()
        return {
            "status": "already_seeded",
            "courses": course_count,
            "students": student_count,
            "sessions": session_count,
        }

    if force:
        reset_demo_data(db)

    # 1. Create Default Teacher
    teacher = User(
        display_name="Dr. Eleanor Vance",
        email="teacher@institution.edu",
        role="teacher"
    )
    db.add(teacher)
    db.flush()

    # 2. Create Sample Courses
    course_ai = Course(
        course_code="CS-402",
        name="Applied Multimodal AI & Interaction Systems",
        description="Senior-level lecture & laboratory exploring real-time multimodal perception, ethical ML, and interaction metrics.",
        teacher_id=teacher.id
    )
    course_ds = Course(
        course_code="DS-210",
        name="Data Systems, Analytics & Statistical Modeling",
        description="Core undergraduate fundamentals in high-dimensional metrics, inferential statistics, and observable proxies.",
        teacher_id=teacher.id
    )
    db.add_all([course_ai, course_ds])
    db.flush()

    # 3. Create Students and Enrollments
    created_students = []
    for code, name, has_ref in DEMO_STUDENTS:
        stu = Student(
            student_code=code,
            display_name=name,
            has_reference_image=has_ref
        )
        db.add(stu)
        db.flush()
        created_students.append(stu)

        # Consents
        c1 = Consent(student_id=stu.id, consent_type="video_presence", granted=True)
        c2 = Consent(student_id=stu.id, consent_type="voice_activity", granted=True)
        db.add_all([c1, c2])

        # Enroll in primary course (CS-402)
        enr1 = Enrollment(student_id=stu.id, course_id=course_ai.id, status="active")
        db.add(enr1)
        
        # Enroll first 8 in secondary course (DS-210)
        if len(created_students) <= 8:
            enr2 = Enrollment(student_id=stu.id, course_id=course_ds.id, status="active")
            db.add(enr2)

    db.flush()

    # 4. Create Historical Sessions for CS-402
    now = datetime.now(timezone.utc)
    sessions_meta = [
        (
            "Session 1: Introduction to Sensor Perception & Presence Tracking",
            now - timedelta(days=7, hours=2),
            50,
            42,
            True,
            "completed"
        ),
        (
            "Session 2: Audio Dynamics & Non-Invasive Activity Indicators",
            now - timedelta(days=4, hours=3),
            45,
            43,
            True,
            "completed"
        ),
        (
            "Session 3: Multimodal Indicator Fusion & Privacy Boundaries",
            now - timedelta(days=1, hours=1),
            45,
            44,
            True,
            "completed"
        ),
        (
            "Live Lab: Real-time Evaluation & Teaching Intervention Workshop",
            now - timedelta(minutes=25),
            30,
            45,
            True,
            "running"
        )
    ]

    seeded_sessions = []
    for title, start_t, dur_mins, seed_val, has_aud, st in sessions_meta:
        sess = ClassroomSession(
            course_id=course_ai.id,
            title=title,
            teacher_name="Dr. Eleanor Vance",
            subject="Computer Science & Multimodal AI",
            start_time=start_t,
            end_time=start_t + timedelta(minutes=dur_mins) if st == "completed" else None,
            status=st,
            input_mode="simulated",
            configuration_json={
                "sample_interval": 1.0,
                "min_duration_seconds": 15.0,
                "weights": {
                    "participation": 0.35,
                    "movement": 0.25,
                    "head_orientation": 0.20,
                    "audio": 0.20
                },
                "modalities_enabled": ["video", "audio"]
            }
        )
        db.add(sess)
        db.flush()
        seeded_sessions.append(sess)

        # Generate attendance, metrics, and recommendations
        att, met, rec = generate_simulated_session_data(
            session_id=sess.id,
            students=created_students,
            duration_minutes=dur_mins if st == "completed" else 25,
            seed=seed_val,
            has_audio=has_aud
        )
        db.add_all(att)
        db.add_all(met)
        db.add_all(rec)

    db.commit()

    log_audit_event(
        db=db,
        action="SEED_DEMO_DATA",
        entity_type="System",
        entity_id="all",
        details={"students_seeded": len(created_students), "sessions_seeded": len(seeded_sessions)}
    )

    return {
        "status": "success",
        "courses": 2,
        "students": len(created_students),
        "sessions": len(seeded_sessions),
        "active_session_id": seeded_sessions[-1].id
    }

def reset_demo_data(db: Session) -> dict:
    """Removes all demo data cleanly."""
    try:
        db.query(AttendanceRecord).delete()
        db.query(EngagementMetric).delete()
        db.query(Recommendation).delete()
        db.query(ClassroomSession).delete()
        db.query(Consent).delete()
        db.query(Enrollment).delete()
        db.query(Student).delete()
        db.query(Course).delete()
        db.query(User).delete()
        db.commit()

        log_audit_event(
            db=db,
            action="RESET_DEMO_DATA",
            entity_type="System",
            entity_id="all",
            details={"message": "All database entities reset"}
        )
        return {"status": "success", "message": "Demo data wiped"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    db = SessionLocal()
    res = seed_demo_data(db, force=True)
    print(f"Seeding completed: {res}")
    db.close()
