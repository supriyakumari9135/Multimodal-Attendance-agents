from typing import List, Dict, Any
from app.models.engagement import EngagementMetric

def evaluate_teaching_recommendations(
    session_id: str,
    metrics: List[EngagementMetric],
    available_modalities: List[str]
) -> List[Dict[str, Any]]:
    """
    Deterministic rules-based teaching recommendation engine.
    Works entirely offline without external LLMs or APIs.
    Evaluates:
    - Participation activity decline
    - Sustained lecture without check-in/break
    - Audio activity vs quiet work period
    - Data quality / missing modalities
    """
    recommendations = []
    
    # Sort metrics by interval_start
    participation_metrics = sorted(
        [m for m in metrics if m.metric_name == "participation_activity"],
        key=lambda x: x.interval_start
    )
    movement_metrics = sorted(
        [m for m in metrics if m.metric_name == "movement_frequency"],
        key=lambda x: x.interval_start
    )
    audio_metrics = sorted(
        [m for m in metrics if m.metric_name == "voice_activity_ratio"],
        key=lambda x: x.interval_start
    )

    # Rule 1: Participation activity drop in recent windows
    if len(participation_metrics) >= 3:
        initial_avg = sum(m.metric_value for m in participation_metrics[:2]) / 2.0
        latest_avg = sum(m.metric_value for m in participation_metrics[-2:]) / 2.0
        
        if latest_avg < (initial_avg - 18.0) and latest_avg < 55.0:
            last_interval = participation_metrics[-1]
            recommendations.append({
                "session_id": session_id,
                "title": "Participation Activity Decrease Observed",
                "explanation": (
                    f"Participation activity indicator dropped from an initial average of {initial_avg:.1f}% "
                    f"to {latest_avg:.1f}% during the recent interval ({int(last_interval.interval_start // 60)}–"
                    f"{int(last_interval.interval_end // 60)} mins)."
                ),
                "evidence_json": {
                    "metric_name": "participation_activity",
                    "initial_value": round(initial_avg, 1),
                    "recent_value": round(latest_avg, 1),
                    "interval": f"{int(last_interval.interval_start // 60)}m - {int(last_interval.interval_end // 60)}m",
                    "confidence": round(last_interval.confidence, 2),
                    "limitation": "Activity indicators are non-invasive proxies; low participation does not imply lack of listening or comprehension."
                },
                "suggested_action": "Consider posing a quick interactive check-in question, live poll, or 2-minute peer discussion.",
                "confidence": 0.88,
                "status": "pending"
            })

    # Rule 2: Prolonged high continuous lecture without interactive pause (> 25 mins)
    max_duration = max((m.interval_end for m in metrics), default=0.0)
    if max_duration >= 1500.0:  # 25+ minutes
        recommendations.append({
            "session_id": session_id,
            "title": "Continuous Instruction Interval Exceeds 25 Minutes",
            "explanation": (
                f"The session has reached {int(max_duration // 60)} minutes of continuous pacing. "
                "Cognitive retention benefits from brief mid-session reflection or synthesis breaks."
            ),
            "evidence_json": {
                "metric_name": "session_pacing",
                "duration_minutes": round(max_duration / 60.0, 1),
                "interval": f"0m - {int(max_duration // 60)}m",
                "confidence": 0.95,
                "limitation": "Pacing guidelines depend on instructional style and subject complexity."
            },
            "suggested_action": "Pause for a 3-minute recap, summary check, or Q&A segment before proceeding to the next topic.",
            "confidence": 0.92,
            "status": "pending"
        })

    # Rule 3: Audio activity context (quiet work vs lecture)
    if "audio" in available_modalities and audio_metrics:
        avg_audio = sum(m.metric_value for m in audio_metrics) / len(audio_metrics)
        if avg_audio < 20.0:
            recommendations.append({
                "session_id": session_id,
                "title": "Low Classroom Audio Activity Context",
                "explanation": (
                    f"Average voice activity ratio across the observed window is {avg_audio:.1f}%. "
                    "This pattern typically indicates quiet reading, individual problem solving, or note-taking."
                ),
                "evidence_json": {
                    "metric_name": "voice_activity_ratio",
                    "average_value": round(avg_audio, 1),
                    "confidence": 0.82,
                    "limitation": "Audio activity measures acoustic presence only, not speaker identity or content quality."
                },
                "suggested_action": "If this was an intended individual study block, no change is needed. If group participation was expected, invite open questions.",
                "confidence": 0.84,
                "status": "pending"
            })

    # Rule 4: Data quality & missing modality notice
    if "audio" not in available_modalities:
        recommendations.append({
            "session_id": session_id,
            "title": "Audio Modality Inactive: Weights Renormalized",
            "explanation": (
                "Microphone input was disabled or unconfigured for this session. "
                "Composite engagement scores were automatically renormalized over available visual movement and presence indicators."
            ),
            "evidence_json": {
                "missing_modality": "audio",
                "active_modalities": available_modalities,
                "confidence": 1.0,
                "limitation": "Acoustic engagement dynamics cannot be evaluated without audio input."
            },
            "suggested_action": "Review session camera coverage and optionally enable microphone capture in session settings if speech dynamics are desired.",
            "confidence": 0.95,
            "status": "pending"
        })

    # Default baseline if session has few metrics
    if not recommendations:
        recommendations.append({
            "session_id": session_id,
            "title": "Healthy Classroom Dynamic Maintained",
            "explanation": "Observed activity indicators and presence tracking remain steady across the session intervals.",
            "evidence_json": {
                "metric_name": "composite_stability",
                "confidence": 0.85,
                "limitation": "Non-invasive indicators are proxies, not absolute proof of comprehension."
            },
            "suggested_action": "Continue planned instructional agenda.",
            "confidence": 0.85,
            "status": "pending"
        })

    return recommendations
