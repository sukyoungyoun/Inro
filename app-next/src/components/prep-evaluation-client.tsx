"use client";

import { useEffect, useMemo, useState } from "react";

type InsightsPayload = {
  score: number;
  strengths: Array<{ title: string; desc: string }>;
  gaps: Array<{ title: string; mitigation: string }>;
};

type EvaluationInsightsCardProps = {
  transcript: string;
  question: string;
  category: string;
  roleTitle: string;
  company: string;
};

export function EvaluationInsightsCard({ transcript, question, category, roleTitle, company }: EvaluationInsightsCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InsightsPayload | null>(null);

  useEffect(() => {
    const t = transcript.trim();
    if (!t) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/evaluation-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: t,
            question,
            category,
            roleTitle,
            company,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as Partial<InsightsPayload> & { error?: string };
        if (!res.ok) {
          throw new Error(json.error || "Could not load evaluation.");
        }
        if (cancelled) return;
        setData({
          score: Number(json.score),
          strengths: Array.isArray(json.strengths) ? json.strengths : [],
          gaps: Array.isArray(json.gaps) ? json.gaps : [],
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load evaluation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [transcript, question, category, roleTitle, company]);

  if (!transcript.trim()) {
    return (
      <div className="eval-card">
        <div className="eval-header">
          <div className="eval-label">inro Evaluation</div>
          <div className="eval-score">—/100</div>
        </div>
        <p className="answer-feedback-desc" style={{ marginTop: 8 }}>
          Submit an answer with a transcript to see scoring and strengths based on your response.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="eval-card">
        <div className="eval-header">
          <div className="eval-label">inro Evaluation</div>
          <div className="eval-score">…</div>
        </div>
        <p className="eval-rewrite-loading">Analyzing your response...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="eval-card">
        <div className="eval-header">
          <div className="eval-label">inro Evaluation</div>
          <div className="eval-score">—/100</div>
        </div>
        <p className="answer-feedback-desc" style={{ marginTop: 8 }}>
          {error || "Something went wrong. Try again in a moment."}
        </p>
      </div>
    );
  }

  return (
    <div className="eval-card">
      <div className="eval-header">
        <div className="eval-label">inro Evaluation</div>
        <div className="eval-score">{data.score}/100</div>
      </div>

      <div className="eval-section-label green">Strengths</div>
      {data.strengths.slice(0, 2).map((s, i) => (
        <div key={i} className="eval-item">
          <div className="eval-item-title">✓ {s.title}</div>
          <div className="eval-item-desc">{s.desc}</div>
          <div className="tag-row">
            <div className="tag jd-tag">Based on your answer</div>
          </div>
        </div>
      ))}

      <div className="eval-section-label terra" style={{ marginTop: 14 }}>
        Areas to Improve
      </div>
      {data.gaps.slice(0, 2).map((g, i) => (
        <div key={i} className="eval-item">
          <div className="eval-item-title">⚠ {g.title}</div>
          <div className="eval-item-desc">{g.mitigation}</div>
          <div className="tag-row">
            <div className="tag warn-tag">Tailored to this response</div>
          </div>
        </div>
      ))}

      <div className="traceability-note">
        <strong>Answer-based feedback:</strong> This score and bullets reflect how well your spoken answer addressed the
        question — not your full resume or prep session analysis.
      </div>
    </div>
  );
}

type EvaluationOptionalRewriteProps = {
  transcript: string;
  roleTitle: string;
  company: string;
};

export function EvaluationOptionalRewrite({ transcript, roleTitle, company }: EvaluationOptionalRewriteProps) {
  const wordCount = useMemo(() => transcript.trim().split(/\s+/).filter(Boolean).length, [transcript]);
  const [loading, setLoading] = useState(false);
  const [rewrite, setRewrite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = transcript.trim();
    if (!t || wordCount < 30) {
      setRewrite(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setRewrite(null);

    void (async () => {
      try {
        const res = await fetch("/api/evaluation-rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: t, roleTitle, company }),
        });
        const json = (await res.json().catch(() => ({}))) as { rewrite?: string; error?: string };
        if (!res.ok) {
          throw new Error(json.error || "Could not generate rewrite.");
        }
        if (cancelled) return;
        setRewrite(String(json.rewrite || "").trim() || null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not generate rewrite.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [transcript, wordCount, roleTitle, company]);

  return (
    <div className="answer-feedback-card" style={{ marginTop: 12 }}>
      <div className="transcript-label">Optional Rewrite</div>
      {wordCount < 30 ? (
        <p className="answer-feedback-desc">
          Your response was too brief to rewrite. Try answering for at least 60 seconds.
        </p>
      ) : loading ? (
        <p className="eval-rewrite-loading">Generating rewrite based on your response...</p>
      ) : error ? (
        <p className="answer-feedback-desc">{error}</p>
      ) : rewrite ? (
        <div className="answer-feedback-desc">{rewrite}</div>
      ) : (
        <p className="answer-feedback-desc">No rewrite available.</p>
      )}
    </div>
  );
}
