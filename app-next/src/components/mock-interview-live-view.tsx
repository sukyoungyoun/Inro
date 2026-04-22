"use client";

import Link from "next/link";
import { useState } from "react";
import { WaveformBars } from "@/components/waveform-bars";

type Props = {
  sessionId: string;
  category: string;
  question: string;
  insight: string;
};

export function MockInterviewLiveView({ sessionId, category, question, insight }: Props) {
  const [elapsedPct, setElapsedPct] = useState(59);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [transcript, setTranscript] = useState(
    "I try to build accessibility in from the earliest planning stage by checking hierarchy, keyboard behavior, and contrast before the UI gets too polished. One example was…"
  );

  const warning = elapsedPct >= 80;
  const timerLabel = elapsedPct === 0 ? "00:00 / 2:00" : "01:18 / 2:00";

  function onRestart() {
    setElapsedPct(0);
    setPaused(false);
    setFinished(false);
    setTranscript("");
  }

  return (
    <div id="view-practice" className="view">
      <div className="practice-topbar">
        <Link href={`/sessions/${sessionId}`} className="back-btn">
          ← Back to Prep Sessions
        </Link>
      </div>
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
                {finished ? "Finished" : paused ? "Paused" : "Recording Now"}
              </div>
            </div>
            <div className="timer-target-bar timer-target-bar--practice">
              <div
                className={`timer-target-fill${warning ? " warning" : ""}`}
                style={{ width: `${Math.max(2, elapsedPct)}%` }}
              />
            </div>

            <div className="waveform-section waveform-section--merged">
              <WaveformBars />
            </div>

            <div className="live-transcript-panel live-transcript-panel--fill">
              {transcript ? (
                <div className="live-transcript">{transcript}</div>
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
        <Link href={`/sessions/${sessionId}`} className="practice-skip-link">
          Skip for Now
        </Link>
        <div className="practice-footer-actions">
          <button type="button" className="rec-btn" onClick={onRestart}>
            Restart
          </button>
          {!finished ? (
            <>
              <button type="button" className="rec-btn" onClick={() => setPaused((v) => !v)}>
                {paused ? "Resume" : "Pause"}
              </button>
              <button type="button" className="footer-submit" onClick={() => setFinished(true)}>
                Finish Answer
              </button>
            </>
          ) : (
            <Link href={`/sessions/${sessionId}/evaluation`} className="footer-submit">
              Submit for Feedback →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

