"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PlaybookTip = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  personaName: string;
  personaRole: string;
  category: string;
  relevanceRank: number;
  libraryIndex: number;
};

type PlaybookGroup = {
  query: string;
  tips: PlaybookTip[];
};

type PlaybookResponse = {
  queries: string[];
  results: PlaybookGroup[];
};

type SortMode = "relevant" | "recent" | "saved";

const DAY_MS = 24 * 60 * 60 * 1000;

function storageSavedKey(userId: string) {
  return `inro-playbook-saved-${userId}`;
}

function storageDismissedKey(userId: string) {
  return `inro-playbook-dismissed-${userId}`;
}

function readIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x)));
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

function formatUpdatedAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const hours = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
  if (hours < 1) return "Updated just now";
  if (hours === 1) return "Updated 1 hour ago";
  return `Updated ${hours} hours ago`;
}

function flattenAllTips(groups: PlaybookGroup[]) {
  return groups.flatMap((group) =>
    group.tips.map((t) => ({
      ...t,
      category: t.category || group.query,
      relevanceRank: typeof t.relevanceRank === "number" ? t.relevanceRank : 0,
      libraryIndex: typeof t.libraryIndex === "number" ? t.libraryIndex : 0,
    }))
  );
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

/** Keep first 2–3 sentences for scannable cards */
function truncateBody(text: string, maxSentences = 3) {
  const t = text.trim();
  if (!t) return "";
  const parts = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length <= maxSentences) return parts.join(" ");
  return `${parts.slice(0, maxSentences).join(" ")}`.trim();
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3.5 1.75h7c.28 0 .5.22.5.5v9.45L7 9.1l-4 2.6V2.25c0-.28.22-.5.5-.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function PlaybookClient({
  userId,
  weakestModule,
  biggestRiskArea,
  targetRole,
  readinessScore,
}: {
  userId: string;
  weakestModule: string;
  biggestRiskArea: string;
  targetRole: string;
  readinessScore: number;
}) {
  const cacheKey = `playbook_v2_${userId}_${weakestModule}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PlaybookResponse | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [sortMode, setSortMode] = useState<SortMode>("relevant");

  useEffect(() => {
    setSavedIds(readIdSet(storageSavedKey(userId)));
    setDismissedIds(readIdSet(storageDismissedKey(userId)));
  }, [userId]);

  const persistSaved = useCallback(
    (next: Set<string>) => {
      setSavedIds(next);
      writeIdSet(storageSavedKey(userId), next);
    },
    [userId]
  );

  const persistDismissed = useCallback(
    (next: Set<string>) => {
      setDismissedIds(next);
      writeIdSet(storageDismissedKey(userId), next);
    },
    [userId]
  );

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
          // ignore
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

  const allTips = useMemo(() => flattenAllTips(queryGroups), [queryGroups]);

  const tipsForCurrentFilter = useMemo(() => {
    if (selectedFilter === "All") return allTips;
    return queryGroups.find((g) => g.query === selectedFilter)?.tips || [];
  }, [allTips, queryGroups, selectedFilter]);

  const visibleTips = useMemo(() => {
    return tipsForCurrentFilter.filter((t) => !dismissedIds.has(t.id));
  }, [tipsForCurrentFilter, dismissedIds]);

  const sortedTips = useMemo(() => {
    const copy = [...visibleTips];
    if (sortMode === "relevant") {
      copy.sort((a, b) => b.relevanceRank - a.relevanceRank);
    } else if (sortMode === "recent") {
      copy.sort((a, b) => b.libraryIndex - a.libraryIndex);
    } else {
      copy.sort((a, b) => {
        const sa = savedIds.has(a.id) ? 1 : 0;
        const sb = savedIds.has(b.id) ? 1 : 0;
        if (sb !== sa) return sb - sa;
        return b.relevanceRank - a.relevanceRank;
      });
    }
    return copy;
  }, [visibleTips, sortMode, savedIds]);

  const allDismissedInCategory =
    tipsForCurrentFilter.length > 0 && tipsForCurrentFilter.every((t) => dismissedIds.has(t.id));

  const totalDismissed = dismissedIds.size;

  const toggleSaved = useCallback(
    (id: string) => {
      const next = new Set(savedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistSaved(next);
    },
    [savedIds, persistSaved]
  );

  const requestDismiss = useCallback(
    (id: string) => {
      setExitingIds((prev) => new Set(prev).add(id));
      window.setTimeout(() => {
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          writeIdSet(storageDismissedKey(userId), next);
          return next;
        });
        setExitingIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }, 240);
    },
    [userId]
  );

  const resetDismissed = useCallback(() => {
    persistDismissed(new Set());
    setExitingIds(new Set());
  }, [persistDismissed]);

  const focusPillLabel = `Working on: ${weakestModule}`;

  return (
    <div id="view-playbook" className="view playbook-view">
      <header className="playbook-page-head">
        <div className="playbook-head-top">
          <div className="playbook-head-titles">
            <h1 className="playbook-page-title">Playbook</h1>
            <p className="playbook-page-sub">Recruiting tips for your weakest areas</p>
          </div>
          <div className="playbook-focus-pill" title={focusPillLabel}>
            <span className="playbook-focus-pill-label">{focusPillLabel}</span>
            <span className="playbook-focus-pill-pct">{readinessScore}%</span>
          </div>
        </div>
        {updatedAt && !loading ? (
          <div className="playbook-meta-row">
            <span className="playbook-meta-muted">
              {formatUpdatedAgo(updatedAt)}
              <span aria-hidden> · </span>
              <button
                type="button"
                className="playbook-meta-link"
                onClick={() => {
                  localStorage.removeItem(cacheKey);
                  void fetchPlaybook(true);
                }}
              >
                Refresh
              </button>
            </span>
            {totalDismissed > 0 ? (
              <span className="playbook-meta-muted playbook-meta-dismiss">
                {totalDismissed} dismissed
                <span aria-hidden> · </span>
                <button type="button" className="playbook-meta-link" onClick={resetDismissed}>
                  Reset
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {loading ? (
        <>
          <div className="playbook-loading-label">Building your personalized recruiting feed…</div>
          <div className="playbook-grid playbook-grid--skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="playbook-card playbook-skeleton-card pulse" aria-hidden />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="playbook-filters-row">
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
            <div className="playbook-sort-wrap">
              <label htmlFor="playbook-sort" className="playbook-sort-label">
                Sort
              </label>
              <select
                id="playbook-sort"
                className="playbook-sort-select"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
              >
                <option value="relevant">Most relevant</option>
                <option value="recent">Most recent</option>
                <option value="saved">Saved first</option>
              </select>
            </div>
          </div>

          {error ? <div className="playbook-state-msg">{error}</div> : null}

          {!error && allTips.length === 0 ? (
            <div className="playbook-state-msg">
              No tips found for your current prep data. Complete a prep session to get personalized picks.
            </div>
          ) : null}

          {!error && allDismissedInCategory ? (
            <div className="playbook-empty-category">
              <p className="playbook-empty-category-title">No tips left in this category</p>
              <button type="button" className="playbook-meta-link playbook-empty-reset" onClick={resetDismissed}>
                Reset dismissed
              </button>
            </div>
          ) : null}

          {!error && sortedTips.length > 0 ? (
            <div className="playbook-grid">
              {sortedTips.map((tip) => {
                const saved = savedIds.has(tip.id);
                const exiting = exitingIds.has(tip.id);
                return (
                  <article key={tip.id} className={`playbook-tip-card${exiting ? " playbook-tip-card--exiting" : ""}`}>
                    <button
                      type="button"
                      className={`playbook-bookmark${saved ? " playbook-bookmark--saved" : ""}`}
                      onClick={() => toggleSaved(tip.id)}
                      aria-label={saved ? "Remove bookmark" : "Save tip"}
                      aria-pressed={saved}
                    >
                      <BookmarkIcon filled={saved} />
                    </button>
                    <div className="playbook-tip-persona">
                      <div className="playbook-tip-avatar">{initialsFromName(tip.personaName)}</div>
                      <div>
                        <div className="playbook-tip-name">{tip.personaName}</div>
                        <div className="playbook-tip-role">{tip.personaRole}</div>
                      </div>
                    </div>
                    <h2 className="playbook-tip-title">{tip.title}</h2>
                    <p className="playbook-tip-body">{truncateBody(tip.body)}</p>
                    <span className="playbook-tip-cat">{tip.category}</span>
                    <div className="playbook-tip-card-footer">
                      <button type="button" className="playbook-dismiss" onClick={() => requestDismiss(tip.id)}>
                        Dismiss
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
