import os
import json
import wave

audio_dir = r"e:\kila\audio_extracted"
if not os.path.exists(audio_dir):
    print("Audio directory not found yet.")
    exit(1)

wav_files = [f for f in os.listdir(audio_dir) if f.endswith(".wav")]
print(f"Found {len(wav_files)} WAV files to inspect.")

analysis_results = []

for wf in wav_files:
    path = os.path.join(audio_dir, wf)
    try:
        with wave.open(path, 'rb') as w:
            n_channels = w.getnchannels()
            sampwidth = w.getsampwidth()
            framerate = w.getframerate()
            n_frames = w.getnframes()
            duration = n_frames / float(framerate)
            analysis_results.append({
                "file": wf,
                "duration_sec": round(duration, 2),
                "sample_rate": framerate,
                "channels": n_channels,
                "size_kb": round(os.path.getsize(path) / 1024, 1)
            })
            print(f"File: {wf[:25]}... Duration: {duration:.2f}s | SR: {framerate} | Size: {os.path.getsize(path)/1024:.1f}KB")
    except Exception as e:
        print(f"Error reading {wf}: {e}")

print("Analysis complete!")
