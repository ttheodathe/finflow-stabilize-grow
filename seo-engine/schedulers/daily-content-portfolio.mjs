import { analyzeCannibalization } from "../research/pipeline.mjs";

function evidenceScore(candidate) {
  const impressions = Number.isFinite(candidate.metrics?.impressions) ? candidate.metrics.impressions : 0;
  const clicks = Number.isFinite(candidate.metrics?.clicks) ? candidate.metrics.clicks : 0;
  const position = candidate.metrics?.averagePosition;
  const rankingOpportunity = Number.isFinite(position) && position >= 4 && position <= 20 ? 1.25 : 1;
  const ctrOpportunity = Number.isFinite(candidate.metrics?.ctr) && candidate.metrics.ctr < 0.02 ? 1.15 : 1;
  return (Math.log10(impressions + 1) * 10 + clicks * 2) * rankingOpportunity * ctrOpportunity;
}

/**
 * Selects one evidence-backed update and one genuinely new-topic candidate.
 * Missing slots remain explicitly unfilled; the selector never fabricates topics
 * or relaxes the research pipeline's freshness, source, or quality gates.
 */
export function selectDailyContentPortfolio(candidates, inventory) {
  if (!Array.isArray(candidates) || !Array.isArray(inventory)) {
    throw new TypeError("Daily content portfolio requires candidate and inventory arrays.");
  }

  const classified = candidates
    .filter(candidate => candidate.evidenceMode !== "FIXTURE"
      && candidate.dataSource === "Google Search Console"
      && Number.isFinite(candidate.metrics?.impressions) && candidate.metrics.impressions > 0
      && Number.isFinite(candidate.metrics?.clicks)
      && Number.isFinite(candidate.metrics?.ctr)
      && Number.isFinite(candidate.metrics?.averagePosition))
    .map(candidate => {
    const analysis = analyzeCannibalization(candidate.targetQuery, inventory, candidate.targetUrl);
    let slot = null;
    if (
      analysis.decision === "UPDATE_EXISTING_ARTICLE" &&
      analysis.targetQueryMatch === "EXACT_LANDING_PAGE_INTENT_MATCH" &&
      !analysis.unresolved &&
      analysis.target &&
      inventory.some(item => item.slug === analysis.target.slug)
    ) {
      slot = "UPDATE_EXISTING_ARTICLE";
    } else if (
      analysis.decision === "NEW_ARTICLE_CANDIDATE" &&
      !analysis.target &&
      !analysis.unresolved
    ) {
      slot = "NEW_ARTICLE";
    }
    return { candidate, analysis, slot, score: evidenceScore(candidate) };
  });

  const choose = slot => classified
    .filter(item => item.slot === slot)
    .sort((a, b) => b.score - a.score || String(a.candidate.id).localeCompare(String(b.candidate.id)))[0] || null;

  const update = choose("UPDATE_EXISTING_ARTICLE");
  const create = choose("NEW_ARTICLE");
  const selected = [create, update].filter(Boolean);
  const slots = {
    newArticle: create
      ? { status: "SELECTED", candidateId: create.candidate.id, targetQuery: create.candidate.targetQuery }
      : { status: "UNFILLED_NO_QUALIFIED_CANDIDATE" },
    articleUpdate: update
      ? { status: "SELECTED", candidateId: update.candidate.id, targetQuery: update.candidate.targetQuery, targetSlug: update.analysis.target.slug }
      : { status: "UNFILLED_NO_QUALIFIED_CANDIDATE" },
  };

  return {
    selectedCandidates: selected.map(item => ({
      ...item.candidate,
      dailyPortfolioSlot: item.slot,
    })),
    slots,
    evaluatedCandidateCount: classified.length,
    selectedCandidateCount: selected.length,
    excludedCandidateCount: candidates.length - selected.length,
    policy: "ONE_NEW_ARTICLE_AND_ONE_EXISTING_ARTICLE_UPDATE_PER_DAY_WHEN_EVIDENCE_AND_QUALITY_GATES_ALLOW",
  };
}
