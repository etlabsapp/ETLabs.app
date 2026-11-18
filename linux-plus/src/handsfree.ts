/**
 * Browser engine for hands-free exams: read aloud with speechSynthesis and listen with SpeechRecognition where it exists.
 * Uses only the device's own voices and the browser's built-in recognizer. No keys, no paid services.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { RATE_DEFAULT, chunks, clampRate, rankVoices } from "./voice";

type Rec = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null;
  start: () => void; abort: () => void;
};

export const synthSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof (window as any).SpeechSynthesisUtterance === "function";
export const recognitionCtor = (): (new () => Rec) | null => {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};
export const pageLang = () => (typeof document !== "undefined" && document.documentElement.lang) || (typeof navigator !== "undefined" && navigator.language) || "en-US";

export type EndReason = "result" | "silence" | "blocked" | "error";

export class VoiceEngine {
  private speakId = 0;
  private rec: Rec | null = null;
  private timers: number[] = [];
  voice: SpeechSynthesisVoice | null = null;
  rate = RATE_DEFAULT;
  lang = pageLang();

  /** iOS only plays speech that starts inside a tap. Call this from a click handler before the first real utterance. */
  unlock() {
    if (!synthSupported()) return;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch (_e) { /* ignore */ }
  }

  private clearTimers() { this.timers.forEach((t) => clearTimeout(t)); this.timers = []; }

  /** Speak the parts in order, then call onDone. Any later speak() or cancel() stops this one without calling onDone. */
  speak(parts: string[], onDone: () => void) {
    this.stopListening();
    if (!synthSupported()) { onDone(); return; }
    const synth = window.speechSynthesis;
    const id = ++this.speakId;
    this.clearTimers();
    synth.cancel();
    const list = parts.flatMap((p) => chunks(p)).filter(Boolean);
    let i = 0;
    const step = () => {
      if (id !== this.speakId) return;
      this.clearTimers();
      if (i >= list.length) { onDone(); return; }
      const text = list[i++];
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = this.lang;
      u.rate = this.rate;
      let done = false;
      const go = () => { if (!done) { done = true; step(); } };
      u.onend = go;
      u.onerror = (e: any) => { if (e?.error !== "interrupted" && e?.error !== "canceled") go(); };
      // Some engines never fire onend. Move on once speech has had time to finish and the engine is idle.
      const budget = 2500 + (text.length * 75) / this.rate;
      const watch = () => { if (done || id !== this.speakId) return; if (synth.speaking && !synth.paused) this.timers.push(window.setTimeout(watch, 800)); else go(); };
      this.timers.push(window.setTimeout(watch, budget));
      synth.speak(u);
    };
    // Chrome can drop an utterance queued in the same tick as cancel().
    this.timers.push(window.setTimeout(step, 80));
  }

  /** Listen once. onText gets the recognizer's alternatives; onEnd tells why listening stopped. Returns false if not supported. */
  listen(onText: (alts: string[]) => void, onEnd: (why: EndReason) => void): boolean {
    const Ctor = recognitionCtor();
    if (!Ctor) return false;
    this.stopListening();
    let r: Rec;
    try { r = new Ctor(); } catch (_e) { return false; }
    r.lang = this.lang; r.continuous = false; r.interimResults = false; r.maxAlternatives = 4;
    let got = false, err = "";
    r.onresult = (e: any) => {
      const res = e.results[e.results.length - 1];
      const alts: string[] = [];
      for (let k = 0; k < res.length; k++) alts.push(String(res[k].transcript || ""));
      got = true;
      onText(alts);
    };
    r.onerror = (e: any) => { err = e?.error || "error"; };
    r.onend = () => {
      if (this.rec === r) this.rec = null;
      onEnd(got ? "result" : err === "not-allowed" || err === "service-not-allowed" ? "blocked" : err && err !== "no-speech" && err !== "aborted" ? "error" : "silence");
    };
    this.rec = r;
    try { r.start(); } catch (_e) { this.rec = null; return false; }
    return true;
  }

  stopListening() {
    const r = this.rec;
    this.rec = null;
    if (r) { r.onresult = null; r.onend = null; r.onerror = null; try { r.abort(); } catch (_e) { /* ignore */ } }
  }

  /** Stop speaking and listening. */
  cancel() {
    this.speakId++;
    this.clearTimers();
    this.stopListening();
    if (synthSupported()) window.speechSynthesis.cancel();
  }
}

export type VoiceSettings = { on: boolean; voiceURI: string; rate: number };
const KEY = "etlabs-linux-plus-voice-v1";
function loadSettings(): VoiceSettings {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) return { on: !!s.on, voiceURI: String(s.voiceURI || ""), rate: clampRate(Number(s.rate ?? RATE_DEFAULT)) }; } catch (_e) { /* ignore */ }
  return { on: false, voiceURI: "", rate: RATE_DEFAULT };
}

/** Voice settings (remembered), the ranked device voices, and one engine for the page. */
export function useVoice() {
  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const engine = useRef<VoiceEngine | null>(null);
  if (!engine.current) engine.current = new VoiceEngine();
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_e) { /* ignore */ } }, [settings]);
  useEffect(() => {
    if (!synthSupported()) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.("voiceschanged", load);
    // Some browsers fill the list late and never fire the event.
    const t = [300, 1000, 2500].map((ms) => window.setTimeout(load, ms));
    return () => { synth.removeEventListener?.("voiceschanged", load); t.forEach(clearTimeout); engine.current?.cancel(); };
  }, []);
  const lang = pageLang();
  const ranked = useMemo(() => rankVoices(voices, lang.includes("-") ? lang : `${lang}-US`), [voices, lang]);
  const chosen = ranked.find((v) => v.voiceURI === settings.voiceURI) || voices.find((v) => v.voiceURI === settings.voiceURI) || ranked[0] || null;
  engine.current.voice = chosen;
  engine.current.rate = settings.rate;
  return { settings, setSettings, voices: ranked, chosen, engine: engine.current, synth: synthSupported(), listenable: !!recognitionCtor() };
}
