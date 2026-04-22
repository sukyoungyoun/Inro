import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDisplayNameSourceForUser } from "@/lib/user-display-name";
import { AppShell } from "@/components/app-shell";
import { EvaluationMarkQuestionDone } from "@/components/evaluation-mark-question-done";
import { EvaluationInsightsCard, EvaluationOptionalRewrite } from "@/components/prep-evaluation-client";

function highlightTranscript(transcript: string) {
  const text = transcript.trim();
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const mindset = ["principle", "mindset", "accessibility", "quality", "approach", "strategy"];
  const example = ["example", "workflow", "process", "audit", "figma", "annotation", "checked"];
  const outcome = ["outcome", "result", "impact", "improved", "collaboration", "handoff", "changed"];
  return sentences
    .map((sentence) => {
      const normalized = sentence.toLowerCase();
      const hit =
        mindset.some((k) => normalized.includes(k)) ||
        example.some((k) => normalized.includes(k)) ||
        outcome.some((k) => normalized.includes(k));
      const safe = sentence.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return hit ? `<mark>${safe}</mark>` : safe;
    })
    .join(" ");
}

function buildAnswerFeedback(transcript: string) {
  const normalized = transcript.toLowerCase();
  const checks = [
    {
      key: "mindset",
      title: "Mindset",
      keywords: ["principle", "accessibility", "quality", "strategy", "approach"],
      hint: "Open with the core principle you followed.",
    },
    {
      key: "example",
      title: "Example",
      keywords: ["example", "workflow", "figma", "audit", "annotation", "process"],
      hint: "Include one concrete workflow or project example.",
    },
    {
      key: "outcome",
      title: "Outcome",
      keywords: ["impact", "improved", "result", "collaboration", "handoff", "changed"],
      hint: "Close with measurable impact or collaboration outcome.",
    },
  ] as const;

  return checks.map((check) => ({
    ...check,
    hit: check.keywords.some((kw) => normalized.includes(kw)),
  }));
}

type RubricStatus = "good" | "warn" | "bad";

type RubricSection = {
  key: string;
  title: string;
  status: RubricStatus;
  label: string;
  note: string;
  suggestions: string[];
};

function getRoleLens(category: string, question: string) {
  const context = `${category} ${question}`.toLowerCase();
  if (/(design|ux|ui|accessibility|research|prototype)/.test(context)) {
    return {
      roleName: "Design",
      signalKeywords: ["user", "tradeoff", "research", "prototype", "accessibility", "usability", "journey"],
      lens: "systems thinking, user insight, and tradeoff decisions",
    };
  }
  if (/(engineer|engineering|system|architecture|backend|frontend|performance|technical)/.test(context)) {
    return {
      roleName: "Engineering",
      signalKeywords: ["debug", "architecture", "latency", "reliability", "incident", "scal", "tradeoff", "root cause"],
      lens: "technical depth, problem-solving, and engineering judgment",
    };
  }
  if (/(consult|product|pm|strategy|business|market|gtm|stakeholder)/.test(context)) {
    return {
      roleName: "Consulting/Product",
      signalKeywords: ["decision", "priorit", "stakeholder", "hypothesis", "metric", "roadmap", "tradeoff"],
      lens: "structured thinking, decision-making, and business impact",
    };
  }
  return {
    roleName: "General",
    signalKeywords: ["decision", "tradeoff", "impact", "analysis", "result", "learned"],
    lens: "problem solving, judgment, and impact orientation",
  };
}

function evaluateCandidateAnswer(transcript: string, category: string, question: string) {
  const text = transcript.trim();
  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const roleLens = getRoleLens(category, question);

  const mentionsContext = /(when|at|while|situation|context|problem|challenge|task)/.test(normalized);
  const mentionsAction = /(i did|i led|i built|i created|i changed|i implemented|i worked|i decided|i collaborated)/.test(
    normalized
  );
  const mentionsInsight = /(learned|realized|insight|in hindsight|i found|synthesi|root cause|because)/.test(normalized);
  const mentionsOutcome = /(result|impact|improv|reduc|increas|faster|sla|conversion|retention|saved|launched)/.test(normalized);
  const hasNumbers = /\b\d+([.,]\d+)?%?\b/.test(normalized);
  const hasOwnership = /\bi\b/.test(normalized);
  const weOnly = /\bwe\b/.test(normalized) && !hasOwnership;
  const longSentences = text.split(/[.!?]/).some((s) => s.trim().split(/\s+/).length > 28);
  const vagueTerms = (normalized.match(/\b(thing|stuff|basically|kind of|sort of|somehow)\b/g) || []).length;
  const roleSignalHits = roleLens.signalKeywords.filter((k) => normalized.includes(k)).length;
  const rootCauseSignals = /(root cause|because|why|constraint|tradeoff|assumption)/.test(normalized);

  const structureScore = Number(mentionsContext) + Number(mentionsAction) + Number(mentionsInsight) + Number(mentionsOutcome);
  const clarityScore = Number(!longSentences) + Number(vagueTerms === 0) + Number(words.length >= 40);
  const insightScore = Number(mentionsInsight) + Number(rootCauseSignals) + Number(/(combined|synthesi|across|signal|input)/.test(normalized));
  const ownershipScore = Number(hasOwnership) + Number(!weOnly);
  const impactScore = Number(mentionsOutcome) + Number(hasNumbers);

  const toStatus = (score: number, goodAt: number, warnAt: number): RubricStatus =>
    score >= goodAt ? "good" : score >= warnAt ? "warn" : "bad";
  const toLabel = (status: RubricStatus, good: string, warn: string, bad: string) =>
    status === "good" ? `✓ ${good}` : status === "warn" ? `⚠️ ${warn}` : `❌ ${bad}`;

  const structureStatus = toStatus(structureScore, 4, 2);
  const clarityStatus = toStatus(clarityScore, 3, 2);
  const roleStatus = toStatus(roleSignalHits, 2, 1);
  const insightStatus = toStatus(insightScore, 2, 1);
  const ownershipStatus = toStatus(ownershipScore, 2, 1);
  const impactStatus = toStatus(impactScore, 2, 1);

  const sections: RubricSection[] = [
    {
      key: "structure",
      title: "1. Structure",
      status: structureStatus,
      label: toLabel(structureStatus, "Covered well", "Needs improvement", "Missing"),
      note:
        structureStatus === "good"
          ? "Your answer includes context, actions, insight, and outcome in a logical flow."
          : "Your answer would be stronger with a clearer Context → Actions → Insight → Outcome sequence.",
      suggestions: [
        "Open with one sentence on the exact situation and stakes.",
        "End with explicit results and one takeaway you now apply.",
      ],
    },
    {
      key: "clarity",
      title: "2. Clarity",
      status: clarityStatus,
      label: toLabel(clarityStatus, "Clear", "Somewhat unclear", "Hard to follow"),
      note:
        clarityStatus === "good"
          ? "The response is mostly concise and easy to follow."
          : "Tighten wording and replace generic phrasing with concrete details.",
      suggestions: [
        "Use shorter sentences and concrete verbs (e.g., led, shipped, reduced).",
        "Replace abstract terms with specific actions, constraints, or decisions.",
      ],
    },
    {
      key: "role",
      title: "3. Role-Relevant Signal",
      status: roleStatus,
      label: toLabel(roleStatus, "Strong signal", "Partial signal", "Weak signal"),
      note: `Current lens: ${roleLens.roleName}. Interviewers look for ${roleLens.lens}.`,
      suggestions: [
        "Name the hardest decision/tradeoff and why you chose that path.",
        "Tie your actions to role-relevant criteria and performance signals.",
      ],
    },
    {
      key: "insight",
      title: "4. Insight Quality",
      status: insightStatus,
      label: toLabel(insightStatus, "Strong insight", "Basic insight", "No clear insight"),
      note:
        insightStatus === "good"
          ? "You show reasoning beyond surface-level execution."
          : "Add what you learned, why it mattered, and how it changed your approach.",
      suggestions: [
        "Explicitly state root cause, not just symptoms.",
        "Show synthesis: what multiple signals led to your conclusion.",
      ],
    },
    {
      key: "ownership",
      title: "5. Ownership",
      status: ownershipStatus,
      label: toLabel(ownershipStatus, "Clear ownership", "Somewhat unclear", "Unclear contribution"),
      note:
        ownershipStatus === "good"
          ? "Your personal contribution is identifiable."
          : "Clarify exactly what you personally owned versus what the team did.",
      suggestions: [
        "Use 'I' for your decisions and execution, then mention team collaboration.",
      ],
    },
    {
      key: "impact",
      title: "6. Outcome / Impact",
      status: impactStatus,
      label: toLabel(impactStatus, "Clear impact", "Vague impact", "Missing impact"),
      note:
        impactStatus === "good"
          ? "You connect actions to outcomes clearly."
          : "State tangible outcomes and connect them directly to your actions.",
      suggestions: [
        "Include one metric or concrete before/after result.",
        "If no hard metric exists, use tangible signals (time saved, errors reduced, adoption, quality).",
      ],
    },
  ];

  const strengths = sections
    .filter((s) => s.status === "good")
    .slice(0, 2)
    .map((s) => s.title.replace(/^\d+\.\s*/, ""));
  const improvements = sections
    .filter((s) => s.status !== "good")
    .slice(0, 2)
    .map((s) => s.title.replace(/^\d+\.\s*/, ""));

  return { sections, strengths, improvements };
}

export default async function EvaluationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; transcript?: string; qid?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [data, sidebarUserName] = await Promise.all([
    prisma.prepSession.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        title: true,
        company: true,
        questions: { orderBy: { order: "asc" } },
      },
    }),
    getDisplayNameSourceForUser(session.user.id, session.user.email),
  ]);
  if (!data) notFound();

  const requestedIndex = Math.max(0, Number(sp.q || 0) || 0);
  const safeIndex = Math.min(requestedIndex, Math.max(0, data.questions.length - 1));
  const q = data.questions[safeIndex];
  const nextIndex = safeIndex + 1;
  const hasNextQuestion = nextIndex < data.questions.length;
  let transcriptRaw = "";
  if (typeof sp.transcript === "string") {
    try {
      transcriptRaw = decodeURIComponent(sp.transcript);
    } catch {
      // Next.js can already provide decoded params; fallback avoids URI malformed crashes.
      transcriptRaw = sp.transcript;
    }
  }
  const highlightedTranscript = highlightTranscript(transcriptRaw);
  const answerFeedback = buildAnswerFeedback(transcriptRaw);
  const rubric = evaluateCandidateAnswer(transcriptRaw, q?.category || "", q?.question || "");
  let questionIdForProgress: string | null =
    typeof sp.qid === "string" && sp.qid.trim() ? sp.qid.trim() : null;
  if (questionIdForProgress) {
    try {
      questionIdForProgress = decodeURIComponent(questionIdForProgress);
    } catch {
      /* keep raw */
    }
  }
  if (!questionIdForProgress && q?.id) questionIdForProgress = q.id;

  return (
    <AppShell
      crumb="PREP EVALUATION"
      active="mock"
      userName={sidebarUserName}
      roleTitle={data.title}
      roleCompany={data.company || "Company"}
      prepHref="/sessions/new"
      briefHref={`/sessions/${data.id}`}
      mockInterviewHref={`/sessions/${data.id}/practice`}
      mobileTab="prep"
      contentFill
    >
      <div id="view-eval" className="view">
        <EvaluationMarkQuestionDone
          sessionId={id}
          questionId={questionIdForProgress}
          hasTranscript={Boolean(transcriptRaw.trim())}
        />
        <div className="eval-topbar">
          <Link href={`/sessions/${id}`} className="back-btn">
            ← Back to Prep Sessions
          </Link>
        </div>
        <div className="eval-body">
          <div>
            <div className="q-header" style={{ marginBottom: 16 }}>
              <div className="q-eyebrow">{(q?.category || "Priority Question").toUpperCase()}</div>
              <div className="q-title">{q?.question || "Question"}</div>
              <div className="insight-bar">
                <span className="insight-icon">💡</span>
                <div>
                  <strong>Insight:</strong>{" "}
                  <span>
                    {q?.insight ||
                      "Assesses awareness of inclusive design principles and whether it is built into your workflow."}
                  </span>
                </div>
              </div>
            </div>

            <div className="playback-card">
              <div className="playback-header">
                <div className="playback-label">Your Response</div>
                <div className="playback-time">01:42</div>
              </div>
              <div className="playback-controls">
                <button type="button" className="play-btn" aria-label="Play">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                    <path d="M1 1l10 6-10 6V1z" />
                  </svg>
                </button>
                <div className="progress-bar">
                  <div className="progress-fill" />
                </div>
              </div>
              <div className="transcript-label">Transcript</div>
              {transcriptRaw.trim() ? (
                <div className="transcript-text" dangerouslySetInnerHTML={{ __html: highlightedTranscript }} />
              ) : (
                <div className="transcript-text transcript-empty">
                  No transcript captured. Try again or type your answer manually.
                </div>
              )}
            </div>
            <div className="answer-feedback-card">
              <div className="transcript-label">Answer Feedback</div>
              <div className="answer-feedback-list">
                {answerFeedback.map((item) => (
                  <div key={item.key} className="answer-feedback-item">
                    <div className={`answer-feedback-badge${item.hit ? " hit" : ""}`}>{item.hit ? "✓" : "•"}</div>
                    <div>
                      <div className="answer-feedback-title">{item.title}</div>
                      <div className="answer-feedback-desc">{item.hit ? "Covered in your response." : item.hint}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="answer-feedback-card" style={{ marginTop: 12 }}>
              <div className="transcript-label">Structured Coaching Feedback</div>
              {rubric.sections.map((section) => (
                <div key={section.key} className="answer-feedback-item" style={{ alignItems: "flex-start", marginBottom: 10 }}>
                  <div className={`answer-feedback-badge${section.status === "good" ? " hit" : ""}`}>
                    {section.status === "good" ? "✓" : section.status === "warn" ? "⚠️" : "✕"}
                  </div>
                  <div>
                    <div className="answer-feedback-title">{section.title}</div>
                    <div className="answer-feedback-desc" style={{ marginBottom: 4 }}>
                      <strong>{section.label}</strong>
                    </div>
                    <div className="answer-feedback-desc">{section.note}</div>
                    <div className="answer-feedback-desc">- {section.suggestions[0]}</div>
                    {section.suggestions[1] ? <div className="answer-feedback-desc">- {section.suggestions[1]}</div> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="answer-feedback-card" style={{ marginTop: 12 }}>
              <div className="transcript-label">Summary</div>
              <div className="answer-feedback-desc">
                <strong>Top 2 strengths:</strong>{" "}
                {rubric.strengths.length ? rubric.strengths.join("; ") : "No strong signals yet."}
              </div>
              <div className="answer-feedback-desc" style={{ marginTop: 6 }}>
                <strong>Top 2 areas to improve:</strong>{" "}
                {rubric.improvements.length ? rubric.improvements.join("; ") : "Maintain current level and add more metrics."}
              </div>
            </div>
            <EvaluationOptionalRewrite
              transcript={transcriptRaw}
              roleTitle={data.title || "Candidate"}
              company={data.company || "Company"}
            />
          </div>

          <div>
            <EvaluationInsightsCard
              transcript={transcriptRaw}
              question={q?.question || ""}
              category={q?.category || ""}
              roleTitle={data.title || "Candidate"}
              company={data.company || "Company"}
            />
          </div>
        </div>
        <div className="eval-footer">
          <Link href={`/sessions/${id}/practice?q=${safeIndex}`} className="btn-ghost">
            Retry Question
          </Link>
          {hasNextQuestion ? (
            <Link href={`/sessions/${id}/practice?q=${nextIndex}`} className="btn-primary">
              Next Question →
            </Link>
          ) : (
            <Link href={`/sessions/${id}`} className="btn-primary">
              Done →
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
