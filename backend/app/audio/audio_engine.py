import numpy as np
from typing import List, Dict, Any, Tuple

class LocalAudioProcessor:
    def __init__(self):
        self.is_vad_installed = False
        try:
            # Check if webrtcvad is available
            import webrtcvad
            self.vad = webrtcvad.Vad(2)
            self.is_vad_installed = True
        except ImportError:
            self.vad = None
            self.is_vad_installed = False

    def analyze_audio_energy(
        self,
        audio_samples: np.ndarray,
        sample_rate: int = 16000,
        window_duration_sec: float = 60.0
    ) -> List[Dict[str, Any]]:
        """
        Analyzes audio segments and calculates energy/voice-activity ratios.
        Operates entirely locally without external speech APIs.
        """
        if len(audio_samples) == 0:
            return []

        samples_per_window = int(sample_rate * window_duration_sec)
        num_windows = max(1, int(len(audio_samples) / samples_per_window))
        
        metrics = []
        for i in range(num_windows):
            start_idx = i * samples_per_window
            end_idx = min((i + 1) * samples_per_window, len(audio_samples))
            window_data = audio_samples[start_idx:end_idx]

            # RMS energy calculation
            rms = np.sqrt(np.mean(window_data.astype(np.float32) ** 2)) if len(window_data) > 0 else 0.0
            
            # Simple acoustic threshold for voice activity ratio
            voice_ratio = min(100.0, max(0.0, (rms / 3000.0) * 100.0))

            w_start = i * window_duration_sec
            w_end = (i + 1) * window_duration_sec

            metrics.append({
                "interval_start": w_start,
                "interval_end": w_end,
                "metric_name": "voice_activity_ratio",
                "metric_value": round(float(voice_ratio), 1),
                "confidence": 0.85,
                "source_modality": "audio",
                "metadata_json": {"rms_energy": round(float(rms), 2), "method": "local_rms"}
            })

        return metrics

audio_processor = LocalAudioProcessor()
