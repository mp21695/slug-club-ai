import numpy as np
import io
import wave
import math
from typing import Dict, Any, Optional, Tuple

def decode_audio_bytes(audio_bytes: bytes) -> Tuple[np.ndarray, int]:
    """
    Decodes audio bytes (WAV or raw PCM) into a float32 numpy array and sample rate.
    """
    try:
        with io.BytesIO(audio_bytes) as bio:
            with wave.open(bio, 'rb') as wf:
                sr = wf.getframerate()
                n_channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                n_frames = wf.getnframes()
                raw_data = wf.readframes(n_frames)
                
                if sampwidth == 2:
                    data = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0
                elif sampwidth == 4:
                    data = np.frombuffer(raw_data, dtype=np.int32).astype(np.float32) / 2147483648.0
                elif sampwidth == 1:
                    data = (np.frombuffer(raw_data, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
                else:
                    data = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0
                    
                if n_channels > 1:
                    # Convert to mono
                    data = data.reshape(-1, n_channels).mean(axis=1)
                    
                return data, sr
    except Exception:
        # Fallback: treat as raw int16 16kHz mono PCM
        try:
            data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            return data, 16000
        except Exception:
            return np.zeros(1600, dtype=np.float32), 16000

def estimate_pitch_autocorr(frame: np.ndarray, sr: int, fmin: float = 75.0, fmax: float = 450.0) -> float:
    """
    Estimates fundamental frequency (F0) of a windowed frame using normalized autocorrelation.
    """
    if len(frame) < 100 or np.max(np.abs(frame)) < 0.01:
        return 0.0
        
    min_lag = int(sr / fmax)
    max_lag = int(sr / fmin)
    if max_lag >= len(frame):
        max_lag = len(frame) - 1
        
    corr = np.correlate(frame, frame, mode='full')
    corr = corr[len(frame)-1:]
    
    if max_lag <= min_lag:
        return 0.0
        
    peak_lag = min_lag + np.argmax(corr[min_lag:max_lag])
    if peak_lag > 0 and corr[peak_lag] > 0.3 * corr[0]:
        return float(sr / peak_lag)
    return 0.0

def extract_audio_features(audio_bytes: Optional[bytes] = None, data: Optional[np.ndarray] = None, sr: int = 16000) -> Dict[str, float]:
    """
    Extracts acoustic features from an audio segment.
    Features:
    - rms_energy: Loudness / vocal power
    - pitch_mean: Average fundamental frequency in Hz
    - pitch_variation: Expressiveness (standard deviation of F0)
    - speech_rate: Approximate syllable rate
    - pause_ratio: Proportion of silent / non-speech intervals
    - spectral_centroid: Brightness / resonance
    - zcr: Zero-crossing rate
    - snr_db: Estimated Signal-to-Noise Ratio (used for confidence/fallback)
    """
    if data is None and audio_bytes is not None:
        data, sr = decode_audio_bytes(audio_bytes)
    elif data is None and audio_bytes is None:
        return {
            "duration_sec": 0.0,
            "rms_energy": 0.0,
            "pitch_mean": 0.0,
            "pitch_variation": 0.0,
            "speech_rate": 0.0,
            "pause_ratio": 1.0,
            "spectral_centroid": 0.0,
            "zcr": 0.0,
            "snr_db": 20.0,
            "arousal": 0.5,
            "valence_acoustic": 0.5
        }
        
    n_samples = len(data)
    duration_sec = n_samples / max(1, sr)
    
    if n_samples < 500 or duration_sec < 0.2:
        return {
            "duration_sec": float(duration_sec),
            "rms_energy": 0.0,
            "pitch_mean": 0.0,
            "pitch_variation": 0.0,
            "speech_rate": 0.0,
            "pause_ratio": 1.0,
            "spectral_centroid": 0.0,
            "zcr": 0.0,
            "snr_db": 20.0,
            "arousal": 0.5,
            "valence_acoustic": 0.5
        }
        
    # 1. RMS Energy
    rms = float(np.sqrt(np.mean(data ** 2)))
    
    # 2. Frame-based analysis (25ms window, 10ms hop)
    frame_size = int(sr * 0.025)
    hop_size = int(sr * 0.010)
    num_frames = max(1, int((n_samples - frame_size) / hop_size) + 1)
    
    frame_energies = []
    pitches = []
    zcr_list = []
    spectral_centroids = []
    
    # Silence threshold: dynamic based on noise floor
    sorted_data = np.sort(np.abs(data))
    noise_floor = float(np.mean(sorted_data[:max(1, int(0.1 * n_samples))])) + 1e-6
    silence_thresh = max(0.015, noise_floor * 3.0)
    
    for i in range(num_frames):
        start = i * hop_size
        end = start + frame_size
        frame = data[start:end]
        if len(frame) < frame_size:
            break
            
        f_rms = np.sqrt(np.mean(frame ** 2))
        frame_energies.append(f_rms)
        
        # Zero crossing rate
        zcr = np.mean(np.abs(np.diff(np.sign(frame)))) / 2.0
        zcr_list.append(zcr)
        
        # Pitch
        if f_rms > silence_thresh:
            f0 = estimate_pitch_autocorr(frame, sr)
            if f0 > 0:
                pitches.append(f0)
                
        # Spectral Centroid (FFT magnitude center of mass)
        fft_mag = np.abs(np.fft.rfft(frame * np.hanning(len(frame))))
        freqs = np.fft.rfftfreq(len(frame), 1.0 / sr)
        mag_sum = np.sum(fft_mag)
        if mag_sum > 1e-6:
            centroid = np.sum(freqs * fft_mag) / mag_sum
            spectral_centroids.append(centroid)
            
    # 3. Aggregations
    frame_energies = np.array(frame_energies) if frame_energies else np.zeros(1)
    voiced_frames = np.sum(frame_energies > silence_thresh)
    pause_ratio = float(1.0 - (voiced_frames / max(1, len(frame_energies))))
    
    pitch_mean = float(np.mean(pitches)) if pitches else 0.0
    pitch_std = float(np.std(pitches)) if len(pitches) > 2 else 0.0
    pitch_variation = float(min(1.0, pitch_std / 60.0)) # Normalized variation
    
    mean_zcr = float(np.mean(zcr_list)) if zcr_list else 0.0
    mean_centroid = float(np.mean(spectral_centroids)) if spectral_centroids else 1500.0
    
    # 4. SNR Estimation (Voice energy vs estimated noise floor)
    signal_energy = np.mean(frame_energies[frame_energies > silence_thresh] ** 2) if voiced_frames > 0 else 1e-6
    noise_energy = noise_floor ** 2
    snr_linear = signal_energy / max(1e-6, noise_energy)
    snr_db = float(10.0 * np.log10(max(1.0, snr_linear)))
    
    # 5. Syllable pace (peaks in energy envelope)
    if len(frame_energies) > 10:
        # Simple moving average smoothing
        smooth_energy = np.convolve(frame_energies, np.ones(5)/5.0, mode='valid')
        peaks = 0
        for k in range(1, len(smooth_energy)-1):
            if smooth_energy[k] > smooth_energy[k-1] and smooth_energy[k] > smooth_energy[k+1] and smooth_energy[k] > silence_thresh:
                peaks += 1
        speech_rate = float(peaks / max(0.5, duration_sec)) # syllables per second
    else:
        speech_rate = 0.0
        
    # 6. Acoustic arousal & valence proxies
    # Arousal correlates with RMS energy, pitch variation, and speech rate
    arousal = min(1.0, 0.4 * min(1.0, rms * 5.0) + 0.3 * pitch_variation + 0.3 * min(1.0, speech_rate / 4.0))
    # Acoustic warmth/valence: moderate pitch variation + warm spectral centroid (1200-2200Hz)
    centroid_score = 1.0 - min(1.0, abs(mean_centroid - 1600.0) / 1200.0)
    valence_acoustic = max(0.0, min(1.0, 0.5 * centroid_score + 0.3 * (1.0 - pause_ratio) + 0.2 * min(1.0, rms * 4.0)))

    return {
        "duration_sec": float(duration_sec),
        "rms_energy": float(min(1.0, rms * 4.0)),
        "pitch_mean": float(pitch_mean),
        "pitch_variation": float(pitch_variation),
        "speech_rate": float(min(1.0, speech_rate / 6.0)),
        "pause_ratio": float(pause_ratio),
        "spectral_centroid": float(mean_centroid),
        "zcr": float(mean_zcr),
        "snr_db": float(snr_db),
        "arousal": float(arousal),
        "valence_acoustic": float(valence_acoustic)
    }
