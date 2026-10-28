import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.student import Student
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.consent import Consent
from app.models.attendance import AttendanceRecord
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentImportResult
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("", response_model=List[StudentOut])
def list_students(
    course_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    
    if course_id:
        query = query.join(Enrollment, Enrollment.student_id == Student.id)\
                     .filter(Enrollment.course_id == course_id, Enrollment.status == "active")
                     
    if search:
        s = f"%{search}%"
        query = query.filter((Student.display_name.ilike(s)) | (Student.student_code.ilike(s)))

    students = query.order_by(Student.student_code.asc()).all()
    results = []
    for st in students:
        enrolled_course_codes = [
            enr.course.course_code for enr in st.enrollments if enr.status == "active" and enr.course
        ]
        consent_rec = db.query(Consent).filter(Consent.student_id == st.id, Consent.granted == True).first()
        results.append(StudentOut(
            id=st.id,
            student_code=st.student_code,
            display_name=st.display_name,
            has_reference_image=st.has_reference_image,
            created_at=st.created_at,
            updated_at=st.updated_at,
            enrolled_courses=enrolled_course_codes,
            consent_status="granted" if consent_rec else "unverified"
        ))
    return results

@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    code = payload.student_code.strip().upper()
    existing = db.query(Student).filter(Student.student_code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with ID '{code}' already exists.")

    student = Student(
        student_code=code,
        display_name=payload.display_name.strip(),
        has_reference_image=False
    )
    db.add(student)
    db.flush()

    # Default privacy consent
    c1 = Consent(student_id=student.id, consent_type="video_presence", granted=True)
    c2 = Consent(student_id=student.id, consent_type="voice_activity", granted=True)
    db.add_all([c1, c2])

    # Enroll in specified courses
    enrolled_codes = []
    if payload.course_ids:
        for cid in payload.course_ids:
            course = db.query(Course).filter(Course.id == cid).first()
            if course:
                db.add(Enrollment(student_id=student.id, course_id=course.id, status="active"))
                enrolled_codes.append(course.course_code)

    db.commit()
    db.refresh(student)

    log_audit_event(db, "CREATE_STUDENT", "Student", student.id, details={"code": student.student_code})

    return StudentOut(
        id=student.id,
        student_code=student.student_code,
        display_name=student.display_name,
        has_reference_image=student.has_reference_image,
        created_at=student.created_at,
        updated_at=student.updated_at,
        enrolled_courses=enrolled_codes,
        consent_status="granted"
    )

@router.get("/export")
def export_students_csv(course_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Exports student roster as CSV."""
    query = db.query(Student)
    if course_id:
        query = query.join(Enrollment).filter(Enrollment.course_id == course_id)
    students = query.order_by(Student.student_code.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Code", "Display Name", "Enrolled Courses", "Has Reference Image", "Created At"])
    for s in students:
        courses_str = "; ".join([e.course.course_code for e in s.enrollments if e.course])
        writer.writerow([
            s.student_code,
            s.display_name,
            courses_str,
            "Yes" if s.has_reference_image else "No",
            s.created_at.isoformat()
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=student_roster.csv"}
    )

@router.post("/import", response_model=StudentImportResult)
async def import_students_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Imports student roster from CSV with row-level validation."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Unable to decode file. Please upload a UTF-8 CSV.")

    reader = csv.DictReader(io.StringIO(text))
    fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
    
    # Map common column aliases
    code_field = next((f for f in (reader.fieldnames or []) if f.strip().lower() in ("student_code", "student id", "student_id", "code", "id")), None)
    name_field = next((f for f in (reader.fieldnames or []) if f.strip().lower() in ("display_name", "name", "student name", "student_name")), None)
    course_field = next((f for f in (reader.fieldnames or []) if f.strip().lower() in ("course_code", "course", "course_id")), None)

    if not code_field or not name_field:
        raise HTTPException(
            status_code=400,
            detail="CSV must contain headers for Student Code (e.g. 'student_code' or 'student_id') and Name (e.g. 'display_name' or 'name')."
        )

    total_rows = 0
    imported = 0
    skipped = 0
    errors: List[str] = []

    for row_idx, row in enumerate(reader, start=2):
        total_rows += 1
        raw_code = (row.get(code_field) or "").strip()
        raw_name = (row.get(name_field) or "").strip()
        raw_course = (row.get(course_field) or "").strip() if course_field else ""

        if not raw_code or not raw_name:
            errors.append(f"Row {row_idx}: Missing required student ID or name.")
            skipped += 1
            continue

        std_code = raw_code.upper()
        existing = db.query(Student).filter(Student.student_code == std_code).first()
        if existing:
            errors.append(f"Row {row_idx}: Student code '{std_code}' already exists; skipped.")
            skipped += 1
            continue

        stu = Student(student_code=std_code, display_name=raw_name)
        db.add(stu)
        db.flush()

        # Consent
        db.add(Consent(student_id=stu.id, consent_type="video_presence", granted=True))

        # Optional Course enrollment
        if raw_course:
            course = db.query(Course).filter(Course.course_code == raw_course.upper()).first()
            if course:
                db.add(Enrollment(student_id=stu.id, course_id=course.id, status="active"))

        imported += 1

    db.commit()

    log_audit_event(db, "IMPORT_STUDENTS_CSV", "Student", "batch", details={"total": total_rows, "imported": imported})

    return StudentImportResult(
        total_processed=total_rows,
        imported_count=imported,
        skipped_count=skipped,
        errors=errors
    )

@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: str, db: Session = Depends(get_db)):
    st = db.query(Student).filter(Student.id == student_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student not found.")
    enrolled_course_codes = [
        enr.course.course_code for enr in st.enrollments if enr.status == "active" and enr.course
    ]
    consent_rec = db.query(Consent).filter(Consent.student_id == st.id, Consent.granted == True).first()
    return StudentOut(
        id=st.id,
        student_code=st.student_code,
        display_name=st.display_name,
        has_reference_image=st.has_reference_image,
        created_at=st.created_at,
        updated_at=st.updated_at,
        enrolled_courses=enrolled_course_codes,
        consent_status="granted" if consent_rec else "unverified"
    )

@router.patch("/{student_id}", response_model=StudentOut)
def update_student(student_id: str, payload: StudentUpdate, db: Session = Depends(get_db)):
    st = db.query(Student).filter(Student.id == student_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student not found.")

    if payload.student_code is not None:
        code = payload.student_code.strip().upper()
        existing = db.query(Student).filter(Student.student_code == code, Student.id != st.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another student has this ID.")
        st.student_code = code

    if payload.display_name is not None:
        st.display_name = payload.display_name.strip()

    if payload.course_ids is not None:
        # Update course enrollments
        db.query(Enrollment).filter(Enrollment.student_id == st.id).delete()
        for cid in payload.course_ids:
            course = db.query(Course).filter(Course.id == cid).first()
            if course:
                db.add(Enrollment(student_id=st.id, course_id=course.id, status="active"))

    db.commit()
    db.refresh(st)
    log_audit_event(db, "UPDATE_STUDENT", "Student", st.id)

    enrolled_course_codes = [
        enr.course.course_code for enr in st.enrollments if enr.status == "active" and enr.course
    ]
    return StudentOut(
        id=st.id,
        student_code=st.student_code,
        display_name=st.display_name,
        has_reference_image=st.has_reference_image,
        created_at=st.created_at,
        updated_at=st.updated_at,
        enrolled_courses=enrolled_course_codes,
        consent_status="granted"
    )
