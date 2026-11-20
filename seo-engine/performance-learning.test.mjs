import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collect, collectPartial } from "./collect.mjs";
import { resolveSchedulerAttempt, runPerformanceLearning } from "./schedulers/performance-learning.mjs";

const dateRange = { startDate: "2026-11-17", endDate: "2026-11-18" };
const ok = (body) => new Response(JSON.stringify(body), { status: 200 });
const denied = () => new Response("provider unavailable", { status: 403 });

test("partial collector preserves GSC when GA4 is unavailable", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-partial-"));
  try {
    const result = await collectPartial({
      dateRange, token: "test-token", outputDir,
      fetchImpl: async (url) => String(url).includes("analyticsdata.googleapis.com") ? denied() : ok({ rows: [] }),
    });
    const snapshot = JSON.parse(await readFile(result.file, "utf8"));
    assert.deepEqual(snapshot.sourceStatus, { gsc: "AVAILABLE", ga4: "UNAVAILABLE" });
    assert.equal(snapshot.gsc.pages.length, 0);
    assert.equal(snapshot.ga4, null);
    assert.match(snapshot.sourceErrors.ga4, /HTTP 403/);
    assert.equal(snapshot.counts.ga4Rows, null);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("partial collector preserves GA4 when GSC is unavailable", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-partial-"));
  try {
    const result = await collectPartial({
      dateRange, token: "test-token", outputDir,
      fetchImpl: async (url) => String(url).includes("googleapis.com/webmasters") ? denied() : ok({ rows: [] }),
    });
    const snapshot = JSON.parse(await readFile(result.file, "utf8"));
    assert.deepEqual(snapshot.sourceStatus, { gsc: "UNAVAILABLE", ga4: "AVAILABLE" });
    assert.equal(snapshot.gsc, null);
    assert.deepEqual(snapshot.ga4, []);
    assert.match(snapshot.sourceErrors.gsc, /HTTP 403/);
    assert.equal(snapshot.counts.gscPageRows, null);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("Scheduler 3 reports partial data and retains the available source", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-performance-"));
  try {
    const result = await runPerformanceLearning({
      dateRange, outputDir, env: {},
      collectFn: async ({ outputDir: dir }) => {
        const file = path.join(dir, "fixture.json");
        const snapshot = {
          sourceStatus: { gsc: "AVAILABLE", ga4: "UNAVAILABLE" },
          sourceErrors: { gsc: null, ga4: "GA4 unavailable" },
          gsc: { pages: [{ clicks: 3, impressions: 20 }] },
          ga4: null,
        };
        const { writeFile } = await import("node:fs/promises");
        await writeFile(file, JSON.stringify(snapshot));
        return { file };
      },
    });
    const report = JSON.parse(await readFile(result.path, "utf8"));
    assert.equal(report.dataQuality.collectionStatus, "PARTIAL");
    assert.equal(report.search.clicks, 3);
    assert.equal(report.search.impressions, 20);
    assert.equal(report.analytics.status, "UNAVAILABLE");
    assert.equal(report.analytics.organicSessions, null);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("Scheduler 3 keeps missing metric values null and successful empty rows at zero",async()=>{
 const outputDir=await mkdtemp(path.join(os.tmpdir(),"seo-performance-null-"));
 try{
  const result=await runPerformanceLearning({
   dateRange,outputDir,env:{},
   collectFn:async({outputDir:dir})=>{
    const file=path.join(dir,"fixture-null.json");
    const snapshot={sourceStatus:{gsc:"AVAILABLE",ga4:"AVAILABLE"},sourceErrors:{gsc:null,ga4:null},
     gsc:{pages:[{clicks:null,impressions:null}]},ga4:[{sessions:null,engagedSessions:null}]};
    await writeFile(file,JSON.stringify(snapshot));return {file};
   },
  });
  const report=JSON.parse(await readFile(result.path,"utf8"));
  assert.equal(report.search.clicks,null);assert.equal(report.search.impressions,null);assert.equal(report.search.ctr,null);
  assert.equal(report.analytics.organicSessions,null);assert.equal(report.analytics.engagedSessions,null);assert.equal(report.analytics.engagementRate,null);
 }finally{await rm(outputDir,{recursive:true,force:true});}
});

test("Scheduler 3 writes a blocked report and fails when the project guard rejects persistence", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-performance-guard-"));
  try {
    await assert.rejects(
      runPerformanceLearning({
        dateRange, outputDir,
        env: {
          SEO_OPS_ALLOWED_PROJECT_REF: "bufbyfwstdqvwnkhyrea",
          SUPABASE_URL: "https://production-project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-key",
        },
        collectFn: async ({ outputDir: dir }) => {
          const file = path.join(dir, "fixture-guard.json");
          const snapshot = {
            sourceStatus: { gsc: "AVAILABLE", ga4: "UNAVAILABLE" },
            sourceErrors: { gsc: null, ga4: "GA4 unavailable" },
            gsc: { pages: [{ clicks: 3, impressions: 20 }] }, ga4: null,
          };
          await writeFile(file, JSON.stringify(snapshot));
          return { file };
        },
      }),
      /does not match the explicitly allowed SEO acceptance project/,
    );
    const report = JSON.parse(await readFile(path.join(outputDir, "scheduler-3-performance-report.json"), "utf8"));
    assert.equal(report.dataQuality.collectionStatus, "PARTIAL");
    assert.equal(report.search.clicks, 3);
    assert.equal(report.analytics.organicSessions, null);
    assert.equal(report.persistence.status, "BLOCKED");
    assert.match(report.persistence.error, /does not match the explicitly allowed SEO acceptance project/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("Scheduler 1 retains genuine GSC collection when supplementary GA4 fails", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-scheduler-1-"));
  try {
    const result = await collect({
      dateRange, token: "test-token", outputDir,
      fetchImpl: async (url) => String(url).includes("analyticsdata.googleapis.com") ? denied() : ok({ rows: [] }),
    });
    const snapshot = JSON.parse(await readFile(result.file, "utf8"));
    assert.deepEqual(snapshot.sourceStatus, { gsc: "AVAILABLE", ga4: "UNAVAILABLE" });
    assert.equal(snapshot.gsc.pages.length, 0);
    assert.equal(snapshot.ga4, null);
    assert.match(snapshot.sourceErrors.ga4, /HTTP 403/);
    assert.equal(snapshot.counts.ga4Rows, null);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});


test("Scheduler 3 fails closed and writes an explicit report when required persistence credentials are missing", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-performance-required-"));
  try {
    await assert.rejects(
      runPerformanceLearning({
        dateRange, outputDir,
        env: { SEO_PERSISTENCE_REQUIRED: "true" },
        collectFn: async ({ outputDir: dir }) => {
          const file = path.join(dir, "fixture-required.json");
          await writeFile(file, JSON.stringify({
            sourceStatus: { gsc: "AVAILABLE", ga4: "AVAILABLE" },
            sourceErrors: { gsc: null, ga4: null },
            gsc: { pages: [] }, ga4: [],
          }));
          return { file };
        },
      }),
      /Required SEO persistence needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/,
    );
    const report = JSON.parse(await readFile(path.join(outputDir, "scheduler-3-performance-report.json"), "utf8"));
    assert.equal(report.persistence.status, "BLOCKED");
    assert.equal(report.persistence.reason, "REQUIRED_PERSISTENCE_UNAVAILABLE");
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("Scheduler 3 fails the job after recording an explicit persistence failure", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-performance-rpc-failure-"));
  try {
    const store = {
      recordRun: async () => { throw new Error("simulated database outage"); },
      recordPerformanceSnapshot: async () => { throw new Error("should not be reached"); },
    };
    await assert.rejects(
      runPerformanceLearning({
        dateRange, outputDir, env: { SEO_PERSISTENCE_REQUIRED: "true" }, store,
        collectFn: async ({ outputDir: dir }) => {
          const file = path.join(dir, "fixture-rpc-failure.json");
          await writeFile(file, JSON.stringify({
            sourceStatus: { gsc: "AVAILABLE", ga4: "AVAILABLE" },
            sourceErrors: { gsc: null, ga4: null },
            gsc: { pages: [] }, ga4: [],
          }));
          return { file };
        },
      }),
      /simulated database outage/,
    );
    const report = JSON.parse(await readFile(path.join(outputDir, "scheduler-3-performance-report.json"), "utf8"));
    assert.equal(report.persistence.status, "FAILED");
    assert.match(report.persistence.error, /simulated database outage/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("Scheduler 3 derives unique persistence attempts for separate workflow runs and reruns", () => {
  assert.equal(resolveSchedulerAttempt({ GITHUB_RUN_NUMBER: "42", GITHUB_RUN_ATTEMPT: "1" }), 4201);
  assert.equal(resolveSchedulerAttempt({ GITHUB_RUN_NUMBER: "42", GITHUB_RUN_ATTEMPT: "2" }), 4202);
  assert.equal(resolveSchedulerAttempt({ GITHUB_RUN_NUMBER: "43", GITHUB_RUN_ATTEMPT: "1" }), 4301);
  assert.equal(resolveSchedulerAttempt({}), 1);
});


test("Scheduler 3 does not undercount when any row in an aggregate is incomplete", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-performance-mixed-null-"));
  try {
    const result = await runPerformanceLearning({
      dateRange, outputDir, env: {},
      collectFn: async ({ outputDir: dir }) => {
        const file = path.join(dir, "fixture-mixed-null.json");
        await writeFile(file, JSON.stringify({
          sourceStatus: { gsc: "AVAILABLE", ga4: "AVAILABLE" },
          sourceErrors: { gsc: null, ga4: null },
          gsc: { pages: [{ clicks: 5, impressions: 10 }, { clicks: null, impressions: 20 }] },
          ga4: [{ sessions: 3, engagedSessions: 2 }, { sessions: null, engagedSessions: 1 }],
        }));
        return { file };
      },
    });
    const report = JSON.parse(await readFile(result.path, "utf8"));
    assert.equal(report.search.clicks, null);
    assert.equal(report.search.impressions, 30);
    assert.equal(report.search.ctr, null);
    assert.equal(report.analytics.organicSessions, null);
    assert.equal(report.analytics.engagedSessions, 3);
    assert.equal(report.analytics.engagementRate, null);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
