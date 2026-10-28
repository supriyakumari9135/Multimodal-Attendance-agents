import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_and_capabilities():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["offline_mode"] is True

    cap_res = client.get("/api/health/capabilities")
    assert cap_res.status_code == 200
    caps = cap_res.json()
    assert caps["offline_ready"] is True
    assert caps["opencv_available"] is True
    assert caps["pdf_export_available"] is True

def test_courses_api():
    # List courses (should have seeded CS-402 and DS-210)
    res = client.get("/api/courses")
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) >= 2
    assert any(c["course_code"] == "CS-402" for c in courses)

    # Create a new course
    new_course = {
        "course_code": "TEST-101",
        "name": "Introduction to Test Systems",
        "description": "Automated verification test course"
    }
    create_res = client.post("/api/courses", json=new_course)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Verify retrieval
    get_res = client.get(f"/api/courses/{created_id}")
    assert get_res.status_code == 200
    assert get_res.json()["course_code"] == "TEST-101"

def test_students_api():
    # List students (seeded with 14 students)
    res = client.get("/api/students")
    assert res.status_code == 200
    students = res.json()
    assert len(students) >= 14

    # Create student
    stu_payload = {
        "student_code": "STU-9999",
        "display_name": "Test Student QA"
    }
    create_res = client.post("/api/students", json=stu_payload)
    assert create_res.status_code == 201
    stu_id = create_res.json()["id"]

    # Duplicate code rejection
    dup_res = client.post("/api/students", json=stu_payload)
    assert dup_res.status_code == 400

    # Retrieve student
    get_res = client.get(f"/api/students/{stu_id}")
    assert get_res.status_code == 200
    assert get_res.json()["display_name"] == "Test Student QA"

def test_session_state_machine():
    courses_res = client.get("/api/courses")
    course_id = courses_res.json()[0]["id"]

    # 1. Create simulated session
    sess_payload = {
        "course_id": course_id,
        "title": "Automated State Machine Session",
        "teacher_name": "QA Specialist",
        "input_mode": "simulated"
    }
    create_res = client.post("/api/sessions", json=sess_payload)
    assert create_res.status_code == 201
    sess = create_res.json()
    sess_id = sess["id"]
    assert sess["status"] == "ready"

    # 2. Start
    start_res = client.post(f"/api/sessions/{sess_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "running"

    # 3. Pause
    pause_res = client.post(f"/api/sessions/{sess_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    # 4. Resume
    resume_res = client.post(f"/api/sessions/{sess_id}/resume")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "running"

    # 5. Stop
    stop_res = client.post(f"/api/sessions/{sess_id}/stop")
    assert stop_res.status_code == 200
    assert stop_res.json()["status"] == "completed"

def test_attendance_and_corrections():
    # Retrieve sessions and pick one
    sessions_res = client.get("/api/sessions")
    sess_id = sessions_res.json()[0]["id"]

    # Check attendance records
    att_res = client.get(f"/api/sessions/{sess_id}/attendance")
    assert att_res.status_code == 200
    records = att_res.json()
    assert len(records) > 0

    target_rec = records[0]
    rec_id = target_rec["id"]

    # Manual correction
    patch_res = client.patch(
        f"/api/sessions/{sess_id}/attendance/{rec_id}",
        json={"status": "manually_confirmed", "notes": "Verified by instructor in person"}
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "manually_confirmed"
    assert updated["manually_corrected"] is True

def test_engagement_metrics_and_recommendations():
    sessions_res = client.get("/api/sessions")
    sess_id = sessions_res.json()[0]["id"]

    # Metrics
    metrics_res = client.get(f"/api/sessions/{sess_id}/metrics")
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert len(metrics) > 0
    assert any(m["metric_name"] == "participation_activity" for m in metrics)

    # Recommendations
    recs_res = client.get(f"/api/sessions/{sess_id}/recommendations")
    assert recs_res.status_code == 200
    recs = recs_res.json()
    assert len(recs) > 0

    # Accept recommendation
    rec_id = recs[0]["id"]
    update_rec = client.patch(
        f"/api/sessions/{sess_id}/recommendations/{rec_id}",
        json={"status": "accepted"}
    )
    assert update_rec.status_code == 200
    assert update_rec.json()["status"] == "accepted"

def test_reports_export():
    sessions_res = client.get("/api/sessions")
    sess_id = sessions_res.json()[0]["id"]

    # CSV Export
    csv_res = client.get(f"/api/reports/sessions/{sess_id}/csv")
    assert csv_res.status_code == 200
    assert "=== SESSION METADATA ===" in csv_res.text
    assert "=== PRIVACY & ETHICS STATEMENT ===" in csv_res.text
    assert "=== ATTENDANCE REGISTER ===" in csv_res.text

    # PDF Export
    pdf_res = client.get(f"/api/reports/sessions/{sess_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.content[:4] == b"%PDF"

def test_overview_analytics():
    res = client.get("/api/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["total_enrolled_students"] >= 14
    assert data["average_engagement_score"] >= 0.0
    assert len(data["recent_sessions"]) > 0
