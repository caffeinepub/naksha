let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
  }
  return audioCtx;
}

function playNote(
  freq: number,
  startTime: number,
  duration: number,
  ctx: AudioContext,
  gain = 0.3,
): void {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

// C4=261.63, E4=329.63, G4=392, C5=523.25, E5=659.25
export function playStartChime(): void {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    playNote(261.63, t, 0.3, ctx);
    playNote(329.63, t + 0.15, 0.3, ctx);
    playNote(392, t + 0.3, 0.4, ctx);
  } catch {}
}

export function playPauseSound(): void {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    playNote(392, t, 0.25, ctx);
    playNote(329.63, t + 0.2, 0.35, ctx);
  } catch {}
}

export function playResumeSound(): void {
  try {
    const ctx = getCtx();
    playNote(392, ctx.currentTime, 0.35, ctx);
  } catch {}
}

export function playMilestoneBeep(): void {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    playNote(261.63, t, 0.2, ctx, 0.2);
    playNote(329.63, t + 0.15, 0.2, ctx, 0.2);
    playNote(392, t + 0.3, 0.2, ctx, 0.2);
    playNote(523.25, t + 0.45, 0.35, ctx, 0.25);
  } catch {}
}

export function playCompletionFanfare(): void {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    playNote(261.63, t, 0.2, ctx, 0.25);
    playNote(329.63, t + 0.15, 0.2, ctx, 0.25);
    playNote(392, t + 0.3, 0.2, ctx, 0.25);
    playNote(523.25, t + 0.45, 0.25, ctx, 0.3);
    playNote(659.25, t + 0.65, 0.5, ctx, 0.35);
  } catch {}
}
