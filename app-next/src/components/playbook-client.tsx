"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PlaybookTip = {
  id: string;
  title: string;
  body: string;
  whyForYou: string;
  actionLabel: string;
  personaName: string;
  personaRole: string;
};

type PlaybookGroup = {
  query: string;
  tips: PlaybookTip[];
};

type PlaybookResponse = {
  queries: string[];
  results: PlaybookGroup[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatUpdatedAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const hours = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
  if (hours < 1) return "Updated just now";
  if (hours === 1) return "Updated 1 hour ago";
  return `Updated ${hours} hours ago`;
}

function flattenAllTips(groups: PlaybookGroup[]) {
  return groups.flatMap((group) => group.tips);
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function PlaybookClient({
  userId,
  weakestModule,
  biggestRiskArea,
  targetRole,
  readinessScore,
}: {
  userId: string;
  displayName: string;
  weakestModule: string;
  biggestRiskArea: string;
  targetRole: string;
  readinessScore: number;
}) {
  const cacheKey = `playbook_${userId}_${weakestModule}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PlaybookResponse | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [savedTips, setSavedTips] = useState<string[]>([]);

  const fetchPlaybook = useCallback(
    async (skipCache = false) => {
      setLoading(true);
      setError("");

      if (!skipCache) {
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as { timestamp: number; payload: PlaybookResponse };
            const stillValid = Date.now() - cached.timestamp < DAY_MS;
            if (stillValid) {
              setData(cached.payload);
              setUpdatedAt(cached.timestamp);
              setSelectedFilter("All");
              setLoading(false);
              return;
            }
          }
        } catch {
          // Ignore cache parse failures and continue with network request.
        }
      }

      try {
        const res = await fetch("/api/playbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weakestModule,
            biggestRiskArea,
            targetRole,
            readinessScore,
          }),
        });
        const payload = (await res.json()) as PlaybookResponse & { error?: string };
        if (!res.ok) {
          throw new Error(payload.error || "Failed to load playbook");
        }
        setData(payload);
        setSelectedFilter("All");
        const timestamp = Date.now();
        setUpdatedAt(timestamp);
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp, payload }));
      } catch {
        setError("Couldn't load recommendations. Try refreshing.");
      } finally {
        setLoading(false);
      }
    },
    [biggestRiskArea, cacheKey, readinessScore, targetRole, weakestModule]
  );

  useEffect(() => {
    void fetchPlaybook(false);
  }, [fetchPlaybook]);

  const queryGroups = data?.results || [];
  const filters = useMemo(() => ["All", ...queryGroups.map((group) => group.query)], [queryGroups]);

  const filteredTips = useMemo(() => {
    if (selectedFilter === "All") return flattenAllTips(queryGroups);
    return queryGroups.find((group) => group.query === selectedFilter)?.tips || [];
  }, [queryGroups, selectedFilter]);

  const featuredTips = useMemo(() => flattenAllTips(queryGroups).slice(0, 4), [queryGroups]);

  return (
    <div id="view-playbook" className="view playbook-view">
      <div className="overview-header">
        <div>
          <h1>Playbook</h1>
          <p>Recruiting tips picked for your weakest areas.</p>
        </div>
      </div>

      {loading ? (
        <>
          <div className="playbook-banner playbook-banner-skeleton pulse" />
          <div className="playbook-loading-label">Building your personalized recruiting feed...</div>
          <div className="playbook-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <article key={`skeleton-${i}`} className="playbook-card playbook-skeleton-card pulse" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="playbook-banner">
            <div>
              <div className="playbook-banner-label">Working on:</div>
              <div className="playbook-banner-title">{weakestModule}</div>
            </div>
            <div className="playbook-score-pill">{readinessScore}% ready</div>
          </div>

          <div className="playbook-hero-card">
            <div className="playbook-hero-title">People-powered recruiting advice for {targetRole}</div>
            <div className="playbook-hero-subtitle">{biggestRiskArea}</div>
          </div>

          {updatedAt ? (
            <div className="playbook-updated-row">
              <span>{formatUpdatedAgo(updatedAt)}</span>
              <button
                type="button"
                className="playbook-refresh-btn"
                onClick={() => {
                  localStorage.removeItem(cacheKey);
                  void fetchPlaybook(true);
                }}
              >
                Refresh
              </button>
            </div>
          ) : null}

          <div className="playbook-filters">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`playbook-filter-pill${selectedFilter === filter ? " active" : ""}`}
                onClick={() => setSelectedFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {error ? <div className="playbook-state-msg">{error}</div> : null}

          {!error && featuredTips.length > 0 ? (
            <>
              <div className="playbook-section-label">Featured tips</div>
              <div className="playbook-featured-row">
                {featuredTips.map((tip) => (
                  <article key={`featured-${tip.id}`} className="playbook-tip-card playbook-tip-card-featured">
                    <div className="playbook-tip-persona">
                      <div className="playbook-tip-avatar">{initialsFromName(tip.personaName)}</div>
                      <div>
                        <div className="playbook-tip-name">{tip.personaName}</div>
                        <div className="playbook-tip-role">{tip.personaRole}</div>
                      </div>
                    </div>
                    <h4 className="playbook-tip-title">{tip.title}</h4>
                    <p className="playbook-tip-body">{tip.body}</p>
                    <div className="playbook-tip-why">{tip.whyForYou}</div>
                    <div className="playbook-tip-actions">
                      <button
                        type="button"
                        className="playbook-tip-action-btn"
                        onClick={() =>
                          setSavedTips((prev) => (prev.includes(tip.id) ? prev.filter((id) => id !== tip.id) : [...prev, tip.id]))
                        }
                      >
                        {savedTips.includes(tip.id) ? "Saved" : "Save tip"}
                      </button>
                      <button type="button" className="playbook-tip-link-btn">
                        {tip.actionLabel}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {!error && filteredTips.length === 0 ? (
            <div className="playbook-state-msg">
              No tips found for your current prep data. Complete a prep session to get personalized picks.
            </div>
          ) : null}

          {!error && filteredTips.length > 0 ? (
            <>
              <div className="playbook-section-label">Across your prep</div>
              <div className="playbook-grid">
                {filteredTips.map((tip) => (
                  <article key={tip.id} className="playbook-tip-card">
                    <div className="playbook-tip-persona">
                      <div className="playbook-tip-avatar">{initialsFromName(tip.personaName)}</div>
                      <div>
                        <div className="playbook-tip-name">{tip.personaName}</div>
                        <div className="playbook-tip-role">{tip.personaRole}</div>
                      </div>
                    </div>
                    <h4 className="playbook-tip-title">{tip.title}</h4>
                    <p className="playbook-tip-body">{tip.body}</p>
                    <div className="playbook-tip-why">{tip.whyForYou}</div>
                    <div className="playbook-tip-actions">
                      <button
                        type="button"
                        className="playbook-tip-action-btn"
                        onClick={() =>
                          setSavedTips((prev) => (prev.includes(tip.id) ? prev.filter((id) => id !== tip.id) : [...prev, tip.id]))
                        }
                      >
                        {savedTips.includes(tip.id) ? "Saved" : "Save tip"}
                      </button>
                      <button type="button" className="playbook-tip-link-btn">
                        {tip.actionLabel}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
