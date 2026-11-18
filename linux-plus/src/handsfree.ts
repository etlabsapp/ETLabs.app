/**
 * Browser engine for hands-free exams: plays the recorded voice clips (linux-plus/audio/*.mp3, rendered offline with the
 * free Kokoro voice af_heart), falls back to the device's speechSynthesis for any line without a clip or whose clip fails,
 * and listens with the browser's built-in SpeechRecognition where it exists. No keys, no paid services.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Part } from "./spoken";
import { RATE_DEFAULT, chunks, clampRate, rankVoices } from "./voice";

type Rec = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; onspeechstart?: (() => void) | null;
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
export const audioSupported = () => typeof window !== "undefined" && typeof (window as any).Audio === "function";
/** A short silent WAV, played inside a tap so iOS lets this page play audio later without another tap. */
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const CACHE_MAX = 90;

export class VoiceEngine {
  private speakId = 0;
  private rec: Rec | null = null;
  hearing = false;
  private timers: number[] = [];
  voice: SpeechSynthesisVoice | null = null;
  rate = RATE_DEFAULT;
  lang = pageLang();
  /** Play recorded clips when a part has one. Off means the device voice reads everything. */
  recorded = true;
  private audio: HTMLAudioElement | null = null;
  private cache = new Map<string, string>();
  private loading = new Set<string>();

  /** iOS only plays speech and audio that start inside a tap. Call this from a click handler before the first real line. */
  unlock() {
    if (synthSupported()) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch (_e) { /* ignore */ } }
    if (audioSupported()) {
      try {
        if (!this.audio) this.audio = new Audio();
        this.audio.src = SILENT;
        const p = this.audio.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (_e) { /* ignore */ }
    }
  }

  private clearTimers() { this.timers.forEach((t) => clearTimeout(t)); this.timers = []; }

  /** Fetch clips ahead of time (the next question while this one is read), kept as blob URLs for instant playback. */
  preload(urls: string[]) {
    if (!audioSupported() || typeof fetch !== "function" || typeof URL?.createObjectURL !== "function") return;
    for (const url of urls) {
      if (this.cache.has(url) || this.loading.has(url)) continue;
      this.loading.add(url);
      fetch(url).then((r) => (r.ok ? r.blob() : null)).then((b) => {
        this.loading.delete(url);
        if (!b) return;
        this.cache.set(url, URL.createObjectURL(b));
        while (this.cache.size > CACHE_MAX) {
          const [old, obj] = this.cache.entries().next().value as [string, string];
          this.cache.delete(old);
          try { URL.revokeObjectURL(obj); } catch (_e) { /* ignore */ }
        }
      }).catch(() => { this.loading.delete(url); });
    }
  }

  /** Say the parts in order, then call onDone. Any later speak() or cancel() stops this one without calling onDone. */
  speak(parts: (Part | string)[], onDone: () => void) {
    this.stopListening();
    const id = ++this.speakId;
    this.clearTimers();
    this.stopSound();
    const list = parts.map((p) => (typeof p === "string" ? { text: p } : p)).filter((p) => p.text || p.clip);
    let i = 0;
    const step = () => {
      if (id !== this.speakId) return;
      this.clearTimers();
      if (i >= list.length) { onDone(); return; }
      const p = list[i++];
      if (this.recorded && p.clip && audioSupported()) this.playClip(id, p.clip, step, () => this.sayText(id, p.text, step));
      else this.sayText(id, p.text, step);
    };
    // Chrome can drop an utterance queued in the same tick as cancel().
    this.timers.push(window.setTimeout(step, 80));
  }

  private stopSound() {
    if (synthSupported()) window.speechSynthesis.cancel();
    if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.onloadedmetadata = null; try { this.audio.pause(); } catch (_e) { /* ignore */ } }
  }

  /** Play one clip. If it can't load or play, fall back (device voice). */
  private playClip(id: number, url: string, next: () => void, fallback: () => void) {
    if (!this.audio) this.audio = new Audio();
    const a = this.audio;
    let done = false;
    const finish = (ok: boolean) => {
      if (done || id !== this.speakId) return;
      done = true;
      a.onended = null; a.onerror = null; a.onloadedmetadata = null;
      this.clearTimers();
      if (ok) next(); else fallback();
    };
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    // Engines that never fire ended: move on once the clip has had time to finish.
    a.onloadedmetadata = () => {
      const ms = Number.isFinite(a.duration) ? (a.duration * 1000) / (this.rate || 1) + 2500 : 30000;
      this.timers.push(window.setTimeout(() => finish(true), ms));
    };
    this.timers.push(window.setTimeout(() => { if (!done && a.currentTime === 0) finish(false); }, 8000));
    try {
      a.src = this.cache.get(url) ?? url;
      a.playbackRate = this.rate;
      try { (a as any).preservesPitch = true; } catch (_e) { /* ignore */ }
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => finish(false));
    } catch (_e) { finish(false); }
  }

  /** Read text with the device voice, in chunks. Without speechSynthesis the line is skipped. */
  private sayText(id: number, text: string, next: () => void) {
    if (!synthSupported() || !text) { next(); return; }
    const synth = window.speechSynthesis;
    const list = chunks(text).filter(Boolean);
    let i = 0;
    const step = () => {
      if (id !== this.speakId) return;
      this.clearTimers();
      if (i >= list.length) { next(); return; }
      const t = list[i++];
      const u = new SpeechSynthesisUtterance(t);
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = this.lang;
      u.rate = this.rate;
      let done = false;
      const go = () => { if (!done) { done = true; step(); } };
      u.onend = go;
      u.onerror = (e: any) => { if (e?.error !== "interrupted" && e?.error !== "canceled") go(); };
      // Some engines never fire onend. Move on once speech has had time to finish and the engine is idle.
      const budget = 2500 + (t.length * 75) / this.rate;
      const watch = () => { if (done || id !== this.speakId) return; if (synth.speaking && !synth.paused) this.timers.push(window.setTimeout(watch, 800)); else go(); };
      this.timers.push(window.setTimeout(watch, budget));
      synth.speak(u);
    };
    step();
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
    r.onspeechstart = () => { this.hearing = true; };
    r.onend = () => {
      this.hearing = false;
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
    this.hearing = false;
    if (r) { r.onresult = null; r.onend = null; r.onerror = null; try { r.abort(); } catch (_e) { /* ignore */ } }
  }

  /** Stop speaking and listening. */
  cancel() {
    this.speakId++;
    this.clearTimers();
    this.stopListening();
    this.stopSound();
  }
}

/** recorded: use the recorded voice where clips exist (default). voiceURI picks the device voice otherwise. */
export type VoiceSettings = { on: boolean; voiceURI: string; rate: number; recorded: boolean };
const KEY = "etlabs-linux-plus-voice-v1";
function loadSettings(): VoiceSettings {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) return { on: !!s.on, voiceURI: String(s.voiceURI || ""), rate: clampRate(Number(s.rate ?? RATE_DEFAULT)), recorded: s.recorded !== false }; } catch (_e) { /* ignore */ }
  return { on: false, voiceURI: "", rate: RATE_DEFAULT, recorded: true };
}

/** Voice settings (remembered), the ranked device voices, and one engine for the page. */
export function useVoice() {
  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const engine = useRef<VoiceEngine | null>(null);
  if (!engine.current) engine.current = new VoiceEngine();
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_e) { /* ignore */ } }, [settings]);
  useEffect(() => () => engine.current?.cancel(), []);
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
  engine.current.recorded = settings.recorded;
  return { settings, setSettings, voices: ranked, chosen, engine: engine.current, synth: synthSupported(), audio: audioSupported(), listenable: !!recognitionCtor() };
}
