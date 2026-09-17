import os
import subprocess
import json
import re

vdo_dir = r"e:\kila\vdo"
out_dir = r"e:\kila\audio_extracted"
os.makedirs(out_dir, exist_ok=True)

files = [f for f in os.listdir(vdo_dir) if f.endswith(".mp4")]
print(f"Found {len(files)} mp4 files in {vdo_dir}")

import imageio_ffmpeg
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
print(f"FFmpeg path: {ffmpeg_exe}")

results = []

for f in files:
    vdo_path = os.path.join(vdo_dir, f)
    wav_name = os.path.splitext(f)[0] + ".wav"
    wav_path = os.path.join(out_dir, wav_name)
    
    # Extract audio wav 16kHz mono PCM
    cmd = [
        ffmpeg_exe, "-y", "-i", vdo_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        wav_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    
    # Get duration & info from ffmpeg stderr
    info_cmd = [ffmpeg_exe, "-i", vdo_path]
    info_res = subprocess.run(info_cmd, capture_output=True, text=True)
    stderr = info_res.stderr or ""
    
    duration = None
    dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", stderr)
    if dur_match:
        h, m, s = dur_match.groups()
        duration = float(h)*3600 + float(m)*60 + float(s)
        
    audio_info = None
    audio_match = re.search(r"Stream.*Audio:\s*(.*)", stderr)
    if audio_match:
        audio_info = audio_match.group(1)

    if os.path.exists(wav_path):
        wav_size = os.path.getsize(wav_path)
        results.append({
            "filename": f,
            "wav_path": wav_path,
            "wav_size": wav_size,
            "duration_sec": duration,
            "audio_stream_info": audio_info
        })
        print(f"[OK] {f[:25]}... -> {wav_name} ({wav_size} bytes, {duration}s)")
    else:
        print(f"[FAIL] {f[:25]}...")

with open(r"e:\kila\audio_analysis.json", "w", encoding="utf-8") as out_f:
    json.dump(results, out_f, indent=2, ensure_ascii=False)

print(f"Extracted audio for {len(results)} files successfully!")
