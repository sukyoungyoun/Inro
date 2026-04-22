type WaveformState = "recording" | "idle" | "done";

function interpolateLevels(source: number[], targetLen: number): number[] {
  if (!source.length) return Array.from({ length: targetLen }, () => 2);
  if (targetLen <= 1) return [Math.max(2, source[0] ?? 2)];
  return Array.from({ length: targetLen }, (_, i) => {
    const pos = (i / (targetLen - 1)) * (source.length - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(source.length - 1, i0 + 1);
    const t = pos - i0;
    const v = (source[i0] ?? 2) * (1 - t) + (source[i1] ?? 2) * t;
    return Math.max(2, Math.round(v));
  });
}

export function WaveformBars({ levels, state = "idle" }: { levels?: number[]; state?: WaveformState }) {
  const sourceBars = levels && levels.length > 0 ? levels : Array.from({ length: 96 }).map(() => 2);
  const displayBarCount = 160;
  const bars = interpolateLevels(sourceBars, displayBarCount);
  const maxHeight = 72;
  const largest = bars.reduce((acc, value) => Math.max(acc, value), 2);
  const loudThreshold = Math.max(8, largest * 0.92);

  return (
    <div className="waveform">
      {bars.map((height, i) => {
        const clamped = Math.max(2, Math.min(maxHeight, height));
        const isLoud = state === "recording" && clamped >= loudThreshold;
        const className = `wbar wbar--${state}${isLoud ? " wbar--loud" : ""}`;
        return <div key={i} className={className} style={{ height: `${clamped}px` }} />;
      })}
    </div>
  );
}
