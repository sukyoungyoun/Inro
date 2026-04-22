"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { WaveformBars } from "@/components/waveform-bars";

type Props = {
  sessionId: string;
  category: string;
  question: string;
  insight: string;
  initialTextMode?: boolean;
  questionIndex?: number;
  totalQuestions?: number;
  questionId?: string;
};

export function MockInterviewLiveView({
  sessionId,
  category,
  question,
  insight,
  initialTextMode = false,
  questionIndex = 0,
  totalQuestions = 1,
  questionId = "",
}: Props) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(initialTextMode);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const levelCount = 96;
  const [levels, setLevels] = useState<number[]>(Array.from({ length: levelCount }).map(() => 2));
  const [finalTranscript, setFinalTranscript] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const targetSeconds = 120;

  const textOnlyMode = initialTextMode;
  const elapsedPct = Math.min(100, Math.round((elapsedSec / targetSeconds) * 100));
  const warning = elapsedPct >= 80;
  const timerLabel = useMemo(() => {
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
    const ss = String(elapsedSec % 60).padStart(2, "0");
    return `${mm}:${ss} / 2:00`;
  }, [elapsedSec]);

  function stopWaveLoop(resetLevels = false) {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (resetLevels) {
      setLevels(Array.from({ length: levelCount }).map(() => 2));
    }
  }

  function cleanupAudioGraph(resetLevels = true) {
    stopWaveLoop(resetLevels);
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }

  function stopRecognition() {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
  }

  function startRecognition() {
    const SpeechRecognitionCtor =
      typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
    if (!SpeechRecognitionCtor) return;
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      if (finalText) {
        setTranscript((prev) => `${prev}${prev ? " " : ""}${finalText.trim()}`.trim());
      }
      setInterimTranscript(interim.trim());
    };
    rec.onerror = () => {
      // Keep session usable without hard-failing.
    };
    rec.onend = () => {
      if (isRecording && !paused && !finished) {
        try {
          rec.start();
        } catch {}
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {}
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsedSec((sec) => {
        if (sec >= targetSeconds) return sec;
        return sec + 1;
      });
    }, 1000);
  }

  function beginWaveLoop(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const spectrumBins = Math.min(128, data.length);
    const outLen = levelCount;
    const maxBarHeight = 72;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const chunk = Math.max(1, Math.floor(spectrumBins / outLen));
      const next: number[] = [];
      for (let i = 0; i < outLen; i++) {
        const start = Math.min(spectrumBins - 1, i * chunk);
        const end = Math.min(spectrumBins, start + chunk);
        let peak = 0;
        for (let j = start; j < end; j++) peak = Math.max(peak, data[j] || 0);
        next.push(Math.max(2, Math.round((peak / 255) * maxBarHeight)));
      }
      setLevels(next);
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
  }

  async function attachAudioGraph(stream: MediaStream) {
    cleanupAudioGraph(false);
    const audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") {
      await audioCtx.resume().catch(() => undefined);
    }
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.42;
    source.connect(analyser);
    audioContextRef.current = audioCtx;
    analyserRef.current = analyser;
    beginWaveLoop(analyser);
  }

  async function startLiveSession(stream: MediaStream, resetClock = true) {
    streamRef.current = stream;
    if (resetClock) {
      setElapsedSec(0);
      setTranscript("");
      setInterimTranscript("");
      setFinished(false);
    }
    setPaused(false);
    setIsRecording(true);
    startTimer();
    await attachAudioGraph(stream);

    if (typeof MediaRecorder !== "undefined") {
      try {
        const recorder = new MediaRecorder(stream);
        recorder.start(300);
        mediaRecorderRef.current = recorder;
      } catch {
        mediaRecorderRef.current = null;
      }
    }

    startRecognition();
  }

  function stopLiveSession(keepStream = true) {
    stopTimer();
    setIsRecording(false);
    stopRecognition();
    cleanupAudioGraph(true);
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
    mediaRecorderRef.current = null;
    if (!keepStream && streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }

  function onTogglePause() {
    if (textOnlyMode) {
      setPaused((v) => !v);
      return;
    }
    if (!streamRef.current) return;
    if (paused) {
      setPaused(false);
      setIsRecording(true);
      startTimer();
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume();
        if (analyserRef.current) beginWaveLoop(analyserRef.current);
      } else {
        void attachAudioGraph(streamRef.current);
      }
      try {
        mediaRecorderRef.current?.resume();
      } catch {}
      startRecognition();
      return;
    }
    setPaused(true);
    stopTimer();
    stopRecognition();
    stopWaveLoop(false);
    if (audioContextRef.current && audioContextRef.current.state === "running") {
      void audioContextRef.current.suspend();
    }
    try {
      mediaRecorderRef.current?.pause();
    } catch {}
  }

  function onRestart() {
    setFinished(false);
    if (textOnlyMode) {
      setElapsedSec(0);
      setPaused(false);
      setTranscript("");
      setInterimTranscript("");
      return;
    }
    if (streamRef.current) {
      stopLiveSession(true);
      void startLiveSession(streamRef.current, true);
    }
  }

  function snapshotTranscript() {
    return `${transcript}${interimTranscript ? ` ${interimTranscript}` : ""}`.trim();
  }

  function onFinishAnswer() {
    const full = snapshotTranscript();
    setTranscript(full);
    setInterimTranscript("");
    setFinalTranscript(full);
    if (!textOnlyMode) stopLiveSession(true);
    setFinished(true);
  }

  function formatMicError(err: unknown): string {
    if (err instanceof Error) {
      if (err.message === "INSECURE") {
        return "Microphone needs a secure (HTTPS) connection. Open this app over HTTPS or use localhost.";
      }
      if (err.message === "UNSUPPORTED") {
        return "This browser does not support microphone access from this page.";
      }
    }
    const name = err && typeof err === "object" && "name" in err ? String((err as DOMException).name) : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Microphone access was blocked. Allow the mic for this site in your browser settings, then tap Try again.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No microphone was found. Plug in a mic or pick a default input device, then try again.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "Your microphone is in use by another app or could not be started. Close other apps using the mic and try again.";
    }
    return "Could not start the microphone. Check browser permissions and try again.";
  }

  async function onEnableMicrophone() {
    setIsRequestingMic(true);
    setMicErrorMessage(null);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        const insecure = typeof window !== "undefined" && !window.isSecureContext;
        throw new Error(insecure ? "INSECURE" : "UNSUPPORTED");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      try {
        await startLiveSession(stream, true);
      } catch (sessionErr) {
        for (const track of stream.getTracks()) track.stop();
        throw sessionErr;
      }
      localStorage.setItem("inro-mic-permission-granted", "1");
      setPermissionsReady(true);
    } catch (err) {
      localStorage.removeItem("inro-mic-permission-granted");
      setMicErrorMessage(formatMicError(err));
    } finally {
      setIsRequestingMic(false);
    }
  }

  useEffect(() => {
    if (textOnlyMode) return;
    const saved = localStorage.getItem("inro-mic-permission-granted") === "1";
    if (!saved) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      localStorage.removeItem("inro-mic-permission-granted");
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(async (stream) => {
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        try {
          await startLiveSession(stream, true);
          if (!cancelled) setPermissionsReady(true);
        } catch {
          for (const track of stream.getTracks()) track.stop();
          if (!cancelled) {
            localStorage.removeItem("inro-mic-permission-granted");
            setMicErrorMessage("Could not start audio preview. Use Enable Microphone or continue without mic.");
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          localStorage.removeItem("inro-mic-permission-granted");
          setMicErrorMessage(formatMicError(err));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!textOnlyMode && isRecording && !paused && !finished && elapsedSec >= targetSeconds) {
      stopLiveSession(true);
      setFinished(true);
    }
  }, [elapsedSec, finished, isRecording, paused, textOnlyMode]);

  useEffect(() => {
    return () => {
      stopLiveSession(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="view-practice" className="view">
      <div className="practice-topbar">
        <Link href={`/sessions/${sessionId}/practice`} className="back-btn">
          ← All mock questions
        </Link>
      </div>
      {!permissionsReady ? (
        <div className="practice-permissions-wrap">
          <div className="practice-permissions-card">
            <div className="practice-permissions-label">PERMISSIONS</div>
            <h2 className="practice-permissions-title">Allow inro to hear your answers</h2>
            <p className="practice-permissions-copy">
              inro listens to your spoken answers and transcribes them in real time. Your audio is never stored or sent to
              a server.
            </p>
            <div className="practice-permissions-row">
              <div className="practice-permissions-device">Microphone</div>
              <button
                type="button"
                className="practice-enable-mic-btn"
                onClick={() => void onEnableMicrophone()}
                disabled={isRequestingMic}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <rect x="5" y="1.5" width="4" height="7" rx="2" />
                  <path d="M3.5 6.5a3.5 3.5 0 007 0M7 10v2M5.2 12h3.6" />
                </svg>
                {isRequestingMic ? "Checking..." : "Enable Microphone"}
              </button>
            </div>
            {micErrorMessage ? (
              <div className="practice-permissions-denied" role="alert">
                {micErrorMessage}
              </div>
            ) : null}
            <Link
              href={`/sessions/${sessionId}/practice?q=${questionIndex}&mode=text`}
              className="practice-without-mic-link"
            >
              Continue without mic
            </Link>
          </div>
        </div>
      ) : (
        <>
      <div className="practice-body">
        <div className="practice-left">
          <div className="q-header">
            <div className="q-eyebrow">{category.toUpperCase()}</div>
            <div className="q-title">{question}</div>
            <div className="insight-bar insight-bar--soft">
              <span className="insight-info-dot" aria-hidden>
                i
              </span>
              <div>
                <strong>Insight:</strong> <span>{insight}</span>
              </div>
            </div>
          </div>

          <div className="recording-card recording-card--unified">
            <div className="recording-topline">
              <div className="timer-combo">{timerLabel}</div>
              <div className="rec-status">
                <div className="rec-dot" />
                {textOnlyMode ? "Text Mode" : finished ? "Finished" : paused ? "Paused" : "Recording Now"}
              </div>
            </div>
            <div className="timer-target-bar timer-target-bar--practice">
              <div
                className={`timer-target-fill${warning ? " warning" : ""}`}
                style={{ width: `${Math.max(2, elapsedPct)}%` }}
              />
            </div>

            {!textOnlyMode ? (
              <div className="waveform-section waveform-section--merged">
                <WaveformBars levels={levels} state={finished ? "done" : isRecording && !paused ? "recording" : "idle"} />
              </div>
            ) : null}

            <div className="live-transcript-panel live-transcript-panel--fill">
              {textOnlyMode ? (
                <textarea
                  className="live-transcript-textarea"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Type your answer here..."
                />
              ) : snapshotTranscript() ? (
                <div className="live-transcript">{snapshotTranscript()}</div>
              ) : (
                <div className="live-transcript-placeholder">Your words will appear here as you speak...</div>
              )}
            </div>
          </div>
        </div>

        <div className="practice-right">
          <div className="coaching-card">
            <div className="coaching-header">
              <div className="coaching-label">Answer Coaching</div>
              <div className="coaching-target">Target 1–2 min</div>
            </div>
            <div className="coaching-item coaching-item--active">
              <div className="coaching-badge">1</div>
              <div className="coaching-text">
                <strong>Start with principle:</strong> Explain that accessibility is part of product quality, not a final
                checklist.
              </div>
            </div>
            <div className="coaching-item coaching-item--upcoming">
              <div className="coaching-badge">2</div>
              <div className="coaching-text">
                <strong>Add one workflow example:</strong> Mention audits, semantic structure, annotations, or design QA in
                handoff.
              </div>
            </div>
            <div className="coaching-item coaching-item--completed">
              <div className="coaching-badge">✓</div>
              <div className="coaching-text">
                <strong>Close with collaboration:</strong> Reference partnering with engineers, PMs, or research to validate
                decisions.
              </div>
            </div>
          </div>
          <div className="structure-card">
            <div className="structure-header">
              <div className="structure-label">Suggested Structure</div>
              <div className="structure-note">3-part answer</div>
            </div>
            <div className="structure-item stepper">
              <div className="stepper-dot active" />
              <div>
                <div className="structure-title">Mindset</div>
                <div className="structure-desc">Accessibility is considered from discovery and wireframes, not after launch.</div>
              </div>
            </div>
            <div className="structure-item stepper">
              <div className="stepper-dot" />
              <div>
                <div className="structure-title">Example</div>
                <div className="structure-desc">Share a project where you checked contrast, focus order, or screen reader behavior.</div>
              </div>
            </div>
            <div className="structure-item stepper">
              <div className="stepper-dot" />
              <div>
                <div className="structure-title">Outcome</div>
                <div className="structure-desc">Explain what improved for users or how it changed collaboration and quality.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="practice-footer">
        <Link href={`/sessions/${sessionId}/practice`} className="practice-skip-link">
          Skip for Now
        </Link>
        <div className="practice-footer-actions">
          <button type="button" className="rec-btn" onClick={onRestart}>
            Restart
          </button>
          {!finished ? (
            <>
              <button type="button" className="rec-btn" onClick={onTogglePause}>
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                className="footer-submit"
                onClick={onFinishAnswer}
              >
                Finish Answer
              </button>
            </>
          ) : (
            <Link
              href={`/sessions/${sessionId}/evaluation?q=${questionIndex}${
                questionId ? `&qid=${encodeURIComponent(questionId)}` : ""
              }&transcript=${encodeURIComponent(
                finalTranscript || snapshotTranscript()
              )}&total=${totalQuestions}`}
              className="footer-submit"
            >
              Submit for Feedback →
            </Link>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

