"use client";

import { useEffect } from "react";
import { flagBriefToast, setQuestionProgress } from "@/lib/mock-interview-questions";

export function EvaluationMarkQuestionDone({
  sessionId,
  questionId,
  hasTranscript,
}: {
  sessionId: string;
  questionId: string | null | undefined;
  hasTranscript: boolean;
}) {
  useEffect(() => {
    if (!questionId || !hasTranscript) return;
    setQuestionProgress(sessionId, questionId, "done");
    flagBriefToast(sessionId);
  }, [sessionId, questionId, hasTranscript]);

  return null;
}
