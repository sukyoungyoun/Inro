export function WaveformBars() {
  return (
    <div className="waveform">
      {Array.from({ length: 38 }).map((_, i) => (
        <div key={i} className="wbar" />
      ))}
    </div>
  );
}
