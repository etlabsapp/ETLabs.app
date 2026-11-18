"""Whisper back-check for the recorded hands-free clips: transcribe each clip and flag ones that do not match their text.
A stand-in for listening. Flags are reviewed by hand; Whisper itself mishears some words (see the report).
Run from the repo root with a venv that has faster-whisper:  python scripts/linux-plus-voice-check.py [cache.json]
"""
import difflib, json, os, re, subprocess, sys
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = sys.argv[1] if len(sys.argv) > 1 else "/tmp/lp-voice-check.json"
SAME = {"chmod": "chmod", "c h mod": "chmod", "see h mod": "chmod", "sudo": "sudo", "sue doo": "sudo", "usermod": "usermod", "user mod": "usermod",
        "i d": "id", "s s h": "ssh", "e t c": "etc", "dash": "", "-": ""}

def norm(t):
    t = t.lower().replace("’", "'")
    t = re.sub(r"[^a-z0-9' ]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    for k, v in SAME.items(): t = re.sub(rf"\b{re.escape(k)}\b", v, t)
    return re.sub(r"[^a-z0-9]", "", t)

def main():
    r = subprocess.run(["node", "../scripts/linux-plus-practice-build.mjs", "--clips"], cwd=os.path.join(ROOT, "linux-plus"), capture_output=True, text=True, check=True)
    clips = [json.loads(l) for l in r.stdout.splitlines() if l.startswith("{")]
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    m = WhisperModel(os.environ.get("WHISPER", "medium.en"), device="cpu", compute_type="int8", cpu_threads=8)
    done = 0
    for c in clips:
        f = os.path.join(ROOT, "linux-plus", "audio", c["name"] + ".mp3")
        if c["name"] in cache or not os.path.exists(f) or len(c["text"]) < 4: continue
        segs, _ = m.transcribe(f, language="en", beam_size=5, temperature=0, condition_on_previous_text=False,
                               no_speech_threshold=None, log_prob_threshold=None, compression_ratio_threshold=None)
        heard = " ".join(s.text.strip() for s in segs)
        score = difflib.SequenceMatcher(None, norm(c["text"]), norm(heard)).ratio()
        cache[c["name"]] = {"text": c["text"], "heard": heard, "score": round(score, 3)}
        done += 1
        if done % 25 == 0: json.dump(cache, open(CACHE, "w"), indent=1); print(done, flush=True)
    json.dump(cache, open(CACHE, "w"), indent=1)
    live = {c["name"] for c in clips}
    flags = sorted((v["score"], k) for k, v in cache.items() if k in live and v["score"] < 0.85)
    print(f"checked {len([k for k in cache if k in live])} clips, {len(flags)} flagged below 0.85")
    for s, k in flags: print(f"{s:.2f} {k}\n  SAID : {cache[k]['text']}\n  HEARD: {cache[k]['heard']}")

if __name__ == "__main__":
    main()
