"""Render the recorded hands-free voice for Linux+ Study (Kokoro af_heart, free and local, Apache-2.0 weights).

Renders every clip that scripts/linux-plus-practice-build.mjs lists and that is not in linux-plus/audio/ yet, then
run `npm run build:practice` again so practice-tests.json points at the new clips.

Setup (once):  python3 -m venv ~/.kokoro-venv && ~/.kokoro-venv/bin/pip install kokoro-onnx soundfile
               download kokoro-v1.0.onnx and voices-v1.0.bin from https://github.com/thewh1teagle/kokoro-onnx/releases
Run from the repo root:  KOKORO_MODELS=/path/to/models ~/.kokoro-venv/bin/python scripts/linux-plus-voice-render.py [--shard i/n] [--force name ...]
(Several shards in parallel, e.g. 0/3, 1/3, 2/3 with KOKORO_THREADS=3, render faster than one process.)
Needs ffmpeg with libmp3lame. Output: MP3, 48 kbps, mono, 24 kHz, about -20 dBFS RMS, silence trimmed.
"""
import json, os, subprocess, sys
import numpy as np
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "linux-plus", "audio")
MODELS = os.environ.get("KOKORO_MODELS", "/workspace/audiobooker-test/models")
VOICE = "af_heart"

def clips():
    r = subprocess.run(["node", "../scripts/linux-plus-practice-build.mjs", "--clips"], cwd=os.path.join(ROOT, "linux-plus"), capture_output=True, text=True, check=True)
    return [json.loads(l) for l in r.stdout.splitlines() if l.startswith("{")]

def trim(a, sr, thresh=0.01, pad=0.06):
    idx = np.where(np.abs(a) > thresh)[0]
    if not len(idx): return a
    s, e = max(0, idx[0] - int(sr * pad)), min(len(a), idx[-1] + int(sr * pad))
    return a[s:e]

def level(a, rms_db=-20.0, peak_db=-1.5):
    rms = float(np.sqrt(np.mean(a ** 2))) or 1e-9
    g = 10 ** (rms_db / 20) / rms
    peak = float(np.max(np.abs(a))) * g
    if peak > 10 ** (peak_db / 20): g *= 10 ** (peak_db / 20) / peak
    return np.clip(a * g, -1, 1)

def encode(a, sr, path):
    pcm = (a * 32767).astype("<i2").tobytes()
    tmp = path + ".tmp.mp3"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "-",
                    "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "48k", "-map_metadata", "-1", "-write_xing", "1", tmp],
                   input=pcm, check=True)
    os.replace(tmp, path)

def main():
    force = set(sys.argv[sys.argv.index("--force") + 1:]) if "--force" in sys.argv else set()
    os.makedirs(OUT, exist_ok=True)
    todo = [c for c in clips() if c["name"] in force or not os.path.exists(os.path.join(OUT, c["name"] + ".mp3"))]
    if "--shard" in sys.argv:
        i, n = map(int, sys.argv[sys.argv.index("--shard") + 1].split("/"))
        todo = [c for c in todo if int(c["name"][:8], 16) % n == i]
    print(f"{len(todo)} clips to render", flush=True)
    if not todo: return
    import onnxruntime as ort
    so = ort.SessionOptions()
    so.intra_op_num_threads = int(os.environ.get("KOKORO_THREADS", "0"))
    sess = ort.InferenceSession(os.path.join(MODELS, "kokoro-v1.0.onnx"), so, providers=["CPUExecutionProvider"])
    kok = Kokoro.from_session(sess, os.path.join(MODELS, "voices-v1.0.bin"))
    for i, c in enumerate(todo, 1):
        a, sr = kok.create(c["text"], voice=VOICE, speed=c["speed"], lang="en-us")
        encode(level(trim(np.asarray(a, dtype=np.float32), sr)), sr, os.path.join(OUT, c["name"] + ".mp3"))
        if i % 50 == 0 or i == len(todo): print(f"{i}/{len(todo)}", flush=True)

if __name__ == "__main__":
    main()
