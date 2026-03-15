/**
 * Plays a short mechanical "click" for split-flap flips using the Web Audio API.
 * No audio files required. Browsers may require user interaction before first play.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playFlipClick(): void {
  const context = getContext();
  if (!context) return;

  const play = () => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(120, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, context.currentTime + 0.02);
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.04);
    osc.start(context.currentTime);
    osc.stop(context.currentTime + 0.04);
  };

  if (context.state === "suspended") {
    context.resume().then(play).catch(() => {});
  } else {
    play();
  }
}
