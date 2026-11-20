export function resolveSchedulerAttempt(env = process.env, explicitAttempt = null) {
  if (Number.isInteger(explicitAttempt) && explicitAttempt >= 1) return explicitAttempt;
  const runNumber = Number.parseInt(env.GITHUB_RUN_NUMBER || "", 10);
  const runAttempt = Math.max(1, Number.parseInt(env.GITHUB_RUN_ATTEMPT || "1", 10) || 1);
  // Reserve three decimal digits for run_attempt so retries cannot collide
  // with the next workflow run. The database column is a signed 32-bit integer.
  if (Number.isInteger(runNumber) && runNumber >= 1) {
    if (runAttempt >= 1_000) throw new Error("GITHUB_RUN_ATTEMPT exceeds the reserved idempotency-key range.");
    const combined = runNumber * 1_000 + runAttempt;
    if (combined > 2_147_483_647) throw new Error("GITHUB_RUN_NUMBER exceeds the supported scheduler persistence range.");
    return combined;
  }
  return runAttempt;
}
