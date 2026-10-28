import os
import cv2
import numpy as np
import time
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone, timedelta
from app.models.attendance import AttendanceRecord
from app.models.engagement import EngagementMetric

class SimpleTrack:
    def __init__(self, track_id: str, initial_box: Tuple[int, int, int, int], timestamp: float):
        self.track_id = track_id
        self.box = initial_box  # (x, y, w, h)
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.total_observed = 0.0
        self.last_interval_timestamp = timestamp
        self.missed_frames = 0
        self.is_active = True

    def update(self, box: Tuple[int, int, int, int], timestamp: float):
        dt = timestamp - self.last_interval_timestamp
        if 0 < dt < 5.0:  # reasonable interval
            self.total_observed += dt
        self.box = box
        self.last_seen = timestamp
        self.last_interval_timestamp = timestamp
        self.missed_frames = 0
        self.is_active = True

    def mark_missed(self, timestamp: float):
        self.missed_frames += 1
        self.last_interval_timestamp = timestamp
        if self.missed_frames > 15:  # occlusion tolerance threshold
            self.is_active = False

def iou(boxA: Tuple[int, int, int, int], boxB: Tuple[int, int, int, int]) -> float:
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])
    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = boxA[2] * boxA[3]
    boxBArea = boxB[2] * boxB[3]
    denom = float(boxAArea + boxBArea - interArea)
    if denom <= 0:
        return 0.0
    return interArea / denom

class LocalVisionProcessor:
    def __init__(self):
        # 1. Background Subtractor for participant presence & motion
        if hasattr(cv2, "createBackgroundSubtractorMOG2"):
            self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=25, detectShadows=False)
        else:
            self.bg_subtractor = None

        # 2. Check if Haar CascadeClassifier is supported
        self.face_cascade = None
        self.has_cascade = False
        if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            if os.path.exists(cascade_path):
                try:
                    self.face_cascade = cv2.CascadeClassifier(cascade_path)
                    self.has_cascade = True
                except Exception:
                    self.face_cascade = None

    def detect_participants_in_frame(
        self,
        gray_frame: np.ndarray
    ) -> List[Tuple[int, int, int, int]]:
        """
        Detects participant bounding boxes using available local models
        or contour motion detection.
        """
        detections: List[Tuple[int, int, int, int]] = []

        # Try Cascade if loaded
        if self.has_cascade and self.face_cascade is not None:
            faces = self.face_cascade.detectMultiScale(
                gray_frame, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30)
            )
            for (x, y, w, h) in faces:
                detections.append((int(x), int(y), int(w), int(h)))

        # Fallback to contour motion/presence detection
        if not detections and self.bg_subtractor is not None:
            fg_mask = self.bg_subtractor.apply(gray_frame)
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > 1200:  # meaningful participant contour
                    x, y, w, h = cv2.boundingRect(cnt)
                    detections.append((int(x), int(y), int(w), int(h)))

        return detections

    def process_video_file(
        self,
        video_path: str,
        session_id: str,
        sample_interval_sec: float = 1.0,
        min_presence_sec: float = 15.0,
        progress_callback: Optional[Any] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Processes an uploaded classroom video file:
        - Extracts presence tracks
        - Calculates motion frequency and participant counts
        - Generates windowed engagement metrics
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1)
        video_duration_sec = total_frames / fps
        frame_interval = max(1, int(fps * sample_interval_sec))

        tracks: Dict[str, SimpleTrack] = {}
        next_track_num = 1
        prev_gray = None

        window_size_sec = 60.0
        window_motion_values: List[float] = []
        window_counts: List[int] = []
        metrics_out: List[Dict[str, Any]] = []

        current_window_idx = 0
        frame_idx = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                current_sec = frame_idx / fps
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                small_gray = cv2.resize(gray, (640, 360))

                # 1. Motion indicator calculation
                motion_score = 0.0
                if prev_gray is not None:
                    diff = cv2.absdiff(small_gray, prev_gray)
                    motion_score = float(np.mean(diff) * 2.5)
                    motion_score = min(100.0, motion_score)
                prev_gray = small_gray
                window_motion_values.append(motion_score)

                # 2. Participant detection
                detections = self.detect_participants_in_frame(small_gray)
                window_counts.append(len(detections))

                # 3. Track matching across frames
                matched_tracks = set()
                for det in detections:
                    best_match_id = None
                    best_iou = 0.25
                    for tr_id, tr in tracks.items():
                        if tr.is_active and tr_id not in matched_tracks:
                            score = iou(det, tr.box)
                            if score > best_iou:
                                best_iou = score
                                best_match_id = tr_id

                    if best_match_id:
                        tracks[best_match_id].update(det, current_sec)
                        matched_tracks.add(best_match_id)
                    else:
                        new_id = f"track_{next_track_num:02d}"
                        next_track_num += 1
                        tracks[new_id] = SimpleTrack(new_id, det, current_sec)
                        matched_tracks.add(new_id)

                for tr_id, tr in tracks.items():
                    if tr_id not in matched_tracks and tr.is_active:
                        tr.mark_missed(current_sec)

                # Window-level metric aggregation
                if current_sec >= (current_window_idx + 1) * window_size_sec or frame_idx >= total_frames - frame_interval:
                    w_start = current_window_idx * window_size_sec
                    w_end = min(current_sec, (current_window_idx + 1) * window_size_sec)
                    avg_count = np.mean(window_counts) if window_counts else 0.0
                    avg_motion = np.mean(window_motion_values) if window_motion_values else 50.0

                    part_val = min(100.0, max(15.0, (avg_count * 12.0) + (avg_motion * 0.4)))

                    metrics_out.append({
                        "interval_start": w_start,
                        "interval_end": w_end,
                        "metric_name": "participation_activity",
                        "metric_value": round(part_val, 1),
                        "confidence": 0.88,
                        "source_modality": "video",
                        "metadata_json": {"visible_participants": round(avg_count, 1)}
                    })

                    metrics_out.append({
                        "interval_start": w_start,
                        "interval_end": w_end,
                        "metric_name": "movement_frequency",
                        "metric_value": round(avg_motion, 1),
                        "confidence": 0.85,
                        "source_modality": "video",
                        "metadata_json": {"frame_diff_mean": round(avg_motion, 2)}
                    })

                    metrics_out.append({
                        "interval_start": w_start,
                        "interval_end": w_end,
                        "metric_name": "composite_engagement",
                        "metric_value": round((part_val * 0.6) + (avg_motion * 0.4), 1),
                        "confidence": 0.86,
                        "source_modality": "video",
                        "metadata_json": {"normalized": True}
                    })

                    current_window_idx += 1
                    window_motion_values = []
                    window_counts = []

                if progress_callback and total_frames > 0:
                    pct = int((frame_idx / total_frames) * 100)
                    progress_callback(pct)

            frame_idx += 1

        cap.release()

        # Build attendance records from tracks
        attendance_out: List[Dict[str, Any]] = []
        for tr_id, tr in tracks.items():
            dur = max(tr.total_observed, tr.last_seen - tr.first_seen)
            status = "present" if dur >= min_presence_sec else "unverified"
            attendance_out.append({
                "anonymous_track_id": tr.track_id,
                "first_seen_sec": tr.first_seen,
                "last_seen_sec": tr.last_seen,
                "observed_duration": round(dur, 1),
                "status": status,
                "confidence": 0.89 if status == "present" else 0.60,
                "source": "vision_detector",
                "notes": f"Observed across {dur:.1f}s in video stream."
            })

        return attendance_out, metrics_out

vision_processor = LocalVisionProcessor()
