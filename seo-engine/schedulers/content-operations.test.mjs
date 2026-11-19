import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runContentOperations } from "./content-operations.mjs";

const now=new Date("2026-11-19T12:00:00.000Z");
const safeEnv={DRY_RUN:"true",PUBLISH_ENABLED:"false",CONTENT_UPDATE_ENABLED:"false",PRODUCTION_CONTENT_WRITE_ALLOWED:"false",GITHUB_RUN_ATTEMPT:"1"};
const opportunity={
 id:"00000000-0000-4000-8000-000000000789",
 opportunity_key:"gsc-opportunity-1",target_url:"https://www.finflowtrack.com/blog/small-business-bookkeeping-checklist",
 query_text:"small business bookkeeping records checklist",opportunity_type:"REVIEW_EXISTING_PAGE",score:70,
 evidence:{
  source:"Google Search Console",decision:"REVIEW_REQUIRED",
  dateRange:{startDate:"2026-11-01",endDate:"2026-11-16"},
  clicks:4,impressions:120,ctr:4/120,averagePosition:14.2,
  sampleQueries:[{query:"small business bookkeeping records checklist",clicks:4,impressions:120,ctr:4/120,position:14.2}],
 },
};
const mockFetch=async url=>{
 const u=String(url);
 const body=u.includes("irs.gov/")
  ? "<html><head><title>Recordkeeping for small business</title></head><body>Good records help identify income sources, track expenses and prepare financial statements. A recordkeeping system should clearly show business income and expenses. Keep supporting documents including invoices, receipts and bank statements. Financial statements and books of accounts should be accurate.</body></html>"
  : "<html><head><title>What kind of records should I keep</title></head><body>Supporting documents include invoices, receipts, paid bills and bank records. Keep these documents to support entries in business books and records.</body></html>";
 return new Response(body,{status:200,headers:{"content-type":"text/html"}});
};
async function setup(){
 const root=await mkdtemp(path.join(os.tmpdir(),"scheduler-2-"));
 const contentDir=path.join(root,"blog"),outputDir=path.join(root,"output"),researchDir=path.join(root,"research");
 await mkdir(contentDir,{recursive:true});
 const article=path.join(contentDir,"small-business-bookkeeping-checklist.md");
 const markdown='---\ntitle: "Small Business Bookkeeping Checklist"\ndescription: "Bookkeeping records and receipts"\nslug: "small-business-bookkeeping-checklist"\ntags: [bookkeeping, records]\n---\n\nA practical guide to bookkeeping records, invoices, receipts and monthly account review.\n';
 await writeFile(article,markdown);
 return {root,contentDir,outputDir,researchDir,article,markdown};
}
function makeStore(rows,calls){
 const operationsByKey=new Map(),researchBySource=new Map(),revisionsByHash=new Map();
 return {
  listPersistedOpportunities:async args=>{calls.read=args;return rows;},
  recordRun:async args=>{calls.runs.push(args);return "00000000-0000-4000-8000-000000000123";},
  recordContentOperation:async args=>{
   calls.operations.push(args);
   if(!operationsByKey.has(args.operationKey)) operationsByKey.set(args.operationKey,"00000000-0000-4000-8000-000000000456");
   calls.operationPayload=args.payload;
   return operationsByKey.get(args.operationKey);
  },
  recordResearchRecord:async args=>{
   const key=args.opportunityId+":"+args.sourceUrl;
   if(!researchBySource.has(key)) researchBySource.set(key,{id:"00000000-0000-4000-8000-"+String(researchBySource.size+100).padStart(12,"0"),source_url:args.sourceUrl,opportunity_id:args.opportunityId});
   const record=researchBySource.get(key);
   record.supported_claims=args.supportedClaims;
   record.unresolved_claims=args.unresolvedClaims;
   calls.research=[...researchBySource.values()];
   return record.id;
  },
  recordContentRevision:async args=>{
   if(!revisionsByHash.has(args.contentHash)) revisionsByHash.set(args.contentHash,{id:"00000000-0000-4000-8000-000000000777",content_hash:args.contentHash,markdown:args.markdown,revision_state:args.revisionState,operation_id:args.operationId});
   calls.revisions=[...revisionsByHash.values()];
   return revisionsByHash.get(args.contentHash).id;
  },
  getContentOperation:async ({operationId})=>{
   const operation=[...calls.operations].reverse().find(item=>operationsByKey.get(item.operationKey)===operationId);
   return operation?{id:operationId,operation_key:operation.operationKey,target_path:operation.targetPath,proposed_content_hash:operation.proposedContentHash,status:"PROPOSED",payload:calls.operationPayload}:null;
  },
  listResearchRecords:async ({opportunityId})=>(calls.research||[]).filter(row=>row.opportunity_id===opportunityId),
  listContentRevisions:async ({operationId})=>(calls.revisions||[]).filter(row=>row.operation_id===operationId),
 };
}
test("Scheduler 2 reads persisted Scheduler 1 rows and writes only a draft proposal",async()=>{
 const env=await setup(),calls={runs:[],operations:[]};
 try{
  const inputPath=path.join(env.root,"scheduler-1.json");
  await writeFile(inputPath,JSON.stringify({scheduler:"SEARCH_INTELLIGENCE",dateRange:{startDate:"2026-11-01",endDate:"2026-11-16"},opportunities:[],persistence:{status:"PERSISTED",schedulerRunId:"00000000-0000-4000-8000-000000000001"}}));
  const result=await runContentOperations({
   inputPath,outputDir:env.outputDir,researchDir:env.researchDir,contentDir:env.contentDir,
   env:safeEnv,store:makeStore([opportunity],calls),fetchImpl:mockFetch,now,
  });
  const report=JSON.parse(await readFile(result.path,"utf8"));
  assert.deepEqual(calls.read,{schedulerRunId:"00000000-0000-4000-8000-000000000001"});
  assert.equal(report.persistedOpportunityCount,1);
  assert.equal(report.candidateCount,1);
  assert.equal(report.readyDraftCount,1,JSON.stringify(report.results.map(item=>({status:item.status,reasons:item.rejectionReasons,quality:item.quality}))));
  assert.equal(report.results[0].candidate.metrics.impressions,120);
  assert.equal(report.results[0].draft.publicationStatus,"draft");
  assert.equal(report.results[0].persistence.status,"PERSISTED");
  assert.equal(report.results[0].persistence.independentReadback.verified,true);
  assert.equal(calls.operations.length,3);
  assert.equal(calls.operations[0].status,"PROPOSED");
  assert.equal(calls.operations[0].operationType,"EXISTING_ARTICLE_UPDATE");
  assert.equal(calls.operations[0].payload.execution,"DRY_RUN_ONLY");
  assert.equal(calls.operations.at(-1).payload.workflowState,"READY_FOR_HUMAN_REVIEW");
  assert.equal(await readFile(env.article,"utf8"),env.markdown);
 }finally{await rm(env.root,{recursive:true,force:true});}
});
test("Scheduler 2 rejects artifact-only opportunities without a persisted Scheduler 1 run",async()=>{
 const env=await setup();
 try{
  const inputPath=path.join(env.root,"scheduler-1.json");
  await writeFile(inputPath,JSON.stringify({scheduler:"SEARCH_INTELLIGENCE",opportunities:[opportunity],persistence:{status:"FAILED",schedulerRunId:null}}));
  await assert.rejects(runContentOperations({inputPath,outputDir:env.outputDir,researchDir:env.researchDir,contentDir:env.contentDir,env:safeEnv,store:null,now}),/successfully persisted run ID/);
 }finally{await rm(env.root,{recursive:true,force:true});}
});
test("Scheduler 2 preserves missing query metrics and rejects the candidate",async()=>{
 const env=await setup(),calls={runs:[],operations:[]};
 try{
  const inputPath=path.join(env.root,"scheduler-1.json");
  await writeFile(inputPath,JSON.stringify({scheduler:"SEARCH_INTELLIGENCE",opportunities:[],persistence:{status:"PERSISTED",schedulerRunId:"00000000-0000-4000-8000-000000000001"}}));
  const missing={...opportunity,evidence:{...opportunity.evidence,sampleQueries:[{query:"small business bookkeeping records checklist",clicks:4,impressions:120,ctr:null,position:14.2}]}};
  const result=await runContentOperations({inputPath,outputDir:env.outputDir,researchDir:env.researchDir,contentDir:env.contentDir,env:safeEnv,store:makeStore([missing],calls),fetchImpl:mockFetch,now});
  const report=JSON.parse(await readFile(result.path,"utf8"));
  assert.equal(report.results[0].candidate.metrics.ctr,null);
  assert.ok(report.results[0].rejectionReasons.includes("INCOMPLETE_GSC_METRICS"));
  assert.equal(calls.operations.length,0);
 }finally{await rm(env.root,{recursive:true,force:true});}
});
test("Scheduler 2 marks non-GSC persisted fixtures as fixtures and blocks them",async()=>{
 const env=await setup(),calls={runs:[],operations:[]};
 try{
  const inputPath=path.join(env.root,"scheduler-1.json");
  await writeFile(inputPath,JSON.stringify({scheduler:"SEARCH_INTELLIGENCE",opportunities:[],persistence:{status:"PERSISTED",schedulerRunId:"00000000-0000-4000-8000-000000000001"}}));
  const fixture={...opportunity,evidence:{...opportunity.evidence,source:"TEST_FIXTURE"}};
  const result=await runContentOperations({inputPath,outputDir:env.outputDir,researchDir:env.researchDir,contentDir:env.contentDir,env:safeEnv,store:makeStore([fixture],calls),fetchImpl:mockFetch,now});
  const report=JSON.parse(await readFile(result.path,"utf8"));
  assert.equal(report.results[0].candidate.evidenceMode,"FIXTURE");
  assert.ok(report.results[0].rejectionReasons.includes("FIXTURE_EVIDENCE_NOT_ALLOWED_IN_SCHEDULED_RUN"));
  assert.equal(calls.operations.length,0);
 }finally{await rm(env.root,{recursive:true,force:true});}
});

test("Scheduler 2 fails closed when a persisted opportunity has no valid UUID",async()=>{
 const env=await setup(),calls={runs:[],operations:[]};
 try{
  const inputPath=path.join(env.root,"scheduler-1.json");
  await writeFile(inputPath,JSON.stringify({scheduler:"SEARCH_INTELLIGENCE",opportunities:[],persistence:{status:"PERSISTED",schedulerRunId:"00000000-0000-4000-8000-000000000001"}}));
  await assert.rejects(runContentOperations({
   inputPath,outputDir:env.outputDir,researchDir:env.researchDir,contentDir:env.contentDir,
   env:safeEnv,store:makeStore([{...opportunity,id:null}],calls),fetchImpl:mockFetch,now,
  }),/missing or invalid UUID/);
 }finally{await rm(env.root,{recursive:true,force:true});}
});
