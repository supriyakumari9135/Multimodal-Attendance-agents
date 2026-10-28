import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple
from app.models.student import Student
from app.models.attendance import AttendanceRecord
from app.models.engagement import EngagementMetric
from app.models.recommendation import Recommendation
from app.services.recommendation_engine import evaluate_teaching_recommendations
from app.core.config import settings

def generate_simulated_session_data(
    session_id: str,
    students: List[Student],
    duration_minutes: int = 45,
    seed: int = 42,
    has_audio: bool = True
) -> Tuple[List[AttendanceRecord], List[EngagementMetric], List[Recommendation]]:
    """
    Generates deterministic, realistic session attendance, engagement metrics,
    and explainable recommendations for demonstration and offline testing.
    """
    rng = random.Random(seed)
    now = datetime.now(timezone.utc)
    session_start = now - timedelta(minutes=duration_minutes)
    
    attendance_records: List[AttendanceRecord] = []
    
    # Partition students:
    # 11 present on-time
    # 2 late arrivals
    # 1 absent (if at least 14 students)
    num_students = len(students)
    
    for i, student in enumerate(students):
        # Deterministic status by index
        if i == num_students - 1 and num_students >= 10:
            # Absent student
            rec = AttendanceRecord(
                session_id=session_id,
                student_id=student.id,
                anonymous_track_id=None,
                first_seen=None,
                last_seen=None,
                observed_duration=0.0,
                status="absent",
                source="simulated",
                manually_corrected=False,
                confidence=0.98,
                notes="Not observed during session duration."
            )
        elif i in (num_students - 2, num_students - 3) and num_students >= 5:
            # Late arrival
            arrival_offset = 480 + (i * 120)  # ~8 to 12 mins late
            first_seen = session_start + timedelta(seconds=arrival_offset)
            last_seen = session_start + timedelta(minutes=duration_minutes)
            observed_dur = (duration_minutes * 60) - arrival_offset
            rec = AttendanceRecord(
                session_id=session_id,
                student_id=student.id,
                anonymous_track_id=f"track_{i+1:02d}",
                first_seen=first_seen,
                last_seen=last_seen,
                observed_duration=float(observed_dur),
                status="late",
                source="simulated",
                manually_corrected=False,
                confidence=0.92,
                notes=f"Observed arrival at +{arrival_offset // 60}m."
            )
        else:
            # Present on-time
            jitter_start = rng.randint(0, 60)
            jitter_end = rng.randint(0, 30)
            first_seen = session_start + timedelta(seconds=jitter_start)
            last_seen = session_start + timedelta(seconds=(duration_minutes * 60) - jitter_end)
            observed_dur = (duration_minutes * 60) - jitter_start - jitter_end
            rec = AttendanceRecord(
                session_id=session_id,
                student_id=student.id,
                anonymous_track_id=f"track_{i+1:02d}",
                first_seen=first_seen,
                last_seen=last_seen,
                observed_duration=float(observed_dur),
                status="present",
                source="simulated",
                manually_corrected=False,
                confidence=0.96,
                notes="Sustained observation verified."
            )
        attendance_records.append(rec)
    
    # Generate 5-minute interval engagement metrics
    interval_seconds = 300.0  # 5 minutes
    total_seconds = float(duration_minutes * 60)
    num_intervals = int(total_seconds // interval_seconds)
    
    engagement_metrics: List[EngagementMetric] = []
    
    # Archetype participation curve:
    # High at start (75-85%), gradual dip around 25-35 min (45-55%), rebound at end (70-80%)
    base_participation_curve = [
        82.0, 80.0, 76.0, 71.0, 64.0, 52.0, 48.0, 68.0, 74.0, 78.0, 75.0, 72.0
    ]
    
    available_modalities = ["video"]
    if has_audio:
        available_modalities.append("audio")
    
    for idx in range(num_intervals):
        start_sec = idx * interval_seconds
        end_sec = min((idx + 1) * interval_seconds, total_seconds)
        
        curve_idx = min(idx, len(base_participation_curve) - 1)
        part_val = base_participation_curve[curve_idx] + rng.uniform(-3.0, 3.0)
        part_val = max(10.0, min(98.0, part_val))
        
        # Movement frequency: small natural shifts
        mov_val = 55.0 + rng.uniform(-8.0, 10.0)
        
        # Head orientation indicator: 68-88%
        head_val = 74.0 + (5.0 if part_val > 65 else -6.0) + rng.uniform(-4.0, 4.0)
        head_val = max(20.0, min(95.0, head_val))
        
        # Add video metrics
        engagement_metrics.append(EngagementMetric(
            session_id=session_id,
            interval_start=start_sec,
            interval_end=end_sec,
            metric_name="participation_activity",
            metric_value=round(part_val, 1),
            confidence=0.91,
            source_modality="video",
            metadata_json={"sample_rate": 1.0, "active_heads": len(students) - 1}
        ))
        
        engagement_metrics.append(EngagementMetric(
            session_id=session_id,
            interval_start=start_sec,
            interval_end=end_sec,
            metric_name="movement_frequency",
            metric_value=round(mov_val, 1),
            confidence=0.89,
            source_modality="video",
            metadata_json={"detector": "motion_flow"}
        ))

        engagement_metrics.append(EngagementMetric(
            session_id=session_id,
            interval_start=start_sec,
            interval_end=end_sec,
            metric_name="head_orientation_indicator",
            metric_value=round(head_val, 1),
            confidence=0.85,
            source_modality="video",
            metadata_json={"detector": "cascade_pose"}
        ))
        
        # Optional audio metric
        if has_audio:
            # Voice activity higher during active teaching/discussion, lower mid-session
            audio_val = 45.0 + (15.0 if idx < 3 or idx > 6 else -20.0) + rng.uniform(-5.0, 5.0)
            audio_val = max(5.0, min(90.0, audio_val))
            engagement_metrics.append(EngagementMetric(
                session_id=session_id,
                interval_start=start_sec,
                interval_end=end_sec,
                metric_name="voice_activity_ratio",
                metric_value=round(audio_val, 1),
                confidence=0.88,
                source_modality="audio",
                metadata_json={"vad_method": "webrtc_energy"}
            ))
            
            # Composite engagement score
            w_part = settings.WEIGHT_PARTICIPATION
            w_mov = settings.WEIGHT_MOVEMENT
            w_head = settings.WEIGHT_HEAD_ORIENTATION
            w_aud = settings.WEIGHT_AUDIO
            comp = (part_val * w_part) + (mov_val * w_mov) + (head_val * w_head) + (audio_val * w_aud)
        else:
            # Renormalize without audio
            tot_w = settings.WEIGHT_PARTICIPATION + settings.WEIGHT_MOVEMENT + settings.WEIGHT_HEAD_ORIENTATION
            w_part = settings.WEIGHT_PARTICIPATION / tot_w
            w_mov = settings.WEIGHT_MOVEMENT / tot_w
            w_head = settings.WEIGHT_HEAD_ORIENTATION / tot_w
            comp = (part_val * w_part) + (mov_val * w_mov) + (head_val * w_head)
            
        engagement_metrics.append(EngagementMetric(
            session_id=session_id,
            interval_start=start_sec,
            interval_end=end_sec,
            metric_name="composite_engagement",
            metric_value=round(comp, 1),
            confidence=0.90,
            source_modality="multimodal" if has_audio else "video",
            metadata_json={"weights_normalized": True, "modalities": available_modalities}
        ))
        
    # Generate explainable teaching recommendations
    raw_recs = evaluate_teaching_recommendations(session_id, engagement_metrics, available_modalities)
    recommendations = [
        Recommendation(
            session_id=r["session_id"],
            title=r["title"],
            explanation=r["explanation"],
            evidence_json=r["evidence_json"],
            suggested_action=r["suggested_action"],
            confidence=r["confidence"],
            status=r["status"]
        )
        for r in raw_recs
    ]
    
    return attendance_records, engagement_metrics, recommendations
