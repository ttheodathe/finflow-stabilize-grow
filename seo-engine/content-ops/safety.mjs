const BOOLEAN_FLAGS = [
  "DRY_RUN",
  "PUBLISH_ENABLED",
  "CONTENT_UPDATE_ENABLED",
  "PRODUCTION_CONTENT_WRITE_ALLOWED",
];

function parseFlag(value, name, fallback) {
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly "true" or "false".`);
}

export function readExecutionPolicy(env = process.env) {
  const policy = {
    DRY_RUN: parseFlag(env.DRY_RUN, "DRY_RUN", true),
    PUBLISH_ENABLED: parseFlag(env.PUBLISH_ENABLED, "PUBLISH_ENABLED", false),
    CONTENT_UPDATE_ENABLED: parseFlag(env.CONTENT_UPDATE_ENABLED, "CONTENT_UPDATE_ENABLED", false),
    PRODUCTION_CONTENT_WRITE_ALLOWED: parseFlag(env.PRODUCTION_CONTENT_WRITE_ALLOWED, "PRODUCTION_CONTENT_WRITE_ALLOWED", false),
    targetEnvironment: env.CONTENT_TARGET_ENV || "production",
    targetBranch: env.CONTENT_TARGET_BRANCH || "main",
  };

  if (policy.DRY_RUN && (policy.PUBLISH_ENABLED || policy.CONTENT_UPDATE_ENABLED || policy.PRODUCTION_CONTENT_WRITE_ALLOWED)) {
    throw new Error("Contradictory execution policy: DRY_RUN=true cannot coexist with content-write authorization.");
  }
  if (policy.PRODUCTION_CONTENT_WRITE_ALLOWED && policy.targetEnvironment !== "production") {
    throw new Error("Production write authorization is valid only for CONTENT_TARGET_ENV=production.");
  }
  return Object.freeze(policy);
}

export function assertExecutionAllowed(operationType, policy) {
  if (policy.DRY_RUN) throw new Error("DRY_RUN is enabled; content mutations are blocked.");
  const isNew = operationType === "NEW_ARTICLE";
  const enabled = isNew ? policy.PUBLISH_ENABLED : policy.CONTENT_UPDATE_ENABLED;
  if (!enabled) throw new Error(`${operationType} execution is disabled.`);
  if (policy.targetEnvironment === "production") {
    if (!policy.PRODUCTION_CONTENT_WRITE_ALLOWED || policy.targetBranch !== "main") {
      throw new Error("Production content writes require explicit production authorization and the main branch.");
    }
    return;
  }
  if (policy.targetEnvironment !== "staging" || policy.targetBranch === "main") {
    throw new Error("Non-production execution is restricted to a staging environment on a non-main branch.");
  }
}

export function assertProductionWritesBlocked(env = process.env) {
  const policy = readExecutionPolicy(env);
  if (!policy.DRY_RUN || policy.PUBLISH_ENABLED || policy.CONTENT_UPDATE_ENABLED || policy.PRODUCTION_CONTENT_WRITE_ALLOWED) {
    throw new Error("Current production safety contract is not satisfied.");
  }
  return policy;
}
