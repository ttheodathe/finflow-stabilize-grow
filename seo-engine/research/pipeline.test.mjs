import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { runResearchPipeline, freshnessFor, analyzeCannibalization, retrieveSource, detectUnsupportedNumericClaims, findUnsupportedNumericClaims, classifySearchIntent, selectCompatibleSourcePack, assessNumericClaims } from "./pipeline.mjs";

const now=new Date("2026-11-19T10:00:00.000Z");
const fixtures=[
 {id:"fixture-recordkeeping",targetUrl:"https://www.finflowtrack.com/blog/small-business-bookkeeping-checklist",targetQuery:"small business bookkeeping records checklist",metrics:{impressions:120,clicks:4,ctr:4/120,averagePosition:14.2},reportingPeriodEnd:"2026-11-16",dataSource:"TEST_FIXTURE",evidenceMode:"FIXTURE"},
 {id:"fixture-cashflow",targetUrl:"https://www.finflowtrack.com/blog/13-week-cash-flow-forecast-template",targetQuery:"13-week cash flow forecast template",metrics:{impressions:95,clicks:3,ctr:3/95,averagePosition:11.8},reportingPeriodEnd:"2026-11-16",dataSource:"TEST_FIXTURE",evidenceMode:"FIXTURE"},
 {id:"fixture-break-even",targetUrl:"https://www.finflowtrack.com/blog/break-even-analysis-small-business",targetQuery:"small business break-even analysis formula",metrics:{impressions:80,clicks:2,ctr:2/80,averagePosition:17.1},reportingPeriodEnd:"2026-11-16",dataSource:"TEST_FIXTURE",evidenceMode:"FIXTURE"},
];
function mockSoftwareSelectionFetch(url) {
 const address=String(url);
 const pages=[
  ["waveapps.com", "<title>Wave Pricing</title><body>STARTER Plan $0 Create unlimited estimates invoices bills and bookkeeping records. Online payments include 2.9% + $0.60 per credit card transaction. Pro plan adds auto-import bank transactions and digitally capture unlimited receipts.</body>"],
  ["zoho.com", "<title>Zoho Books US Pricing</title><body>FREE $0 create invoices expenses journals P&L Balance Sheet and reports. 1 User + 1 Accountant.</body>"],
  ["zipbooks.com", "<title>ZipBooks Pricing</title><body>Starter Free. Send unlimited invoices. Manage unlimited vendors and customers. View Basic Reports. Connect 1 bank account.</body>"],
  ["irs.gov", "<title>What kind of records should I keep</title><body>Keep business records that clearly show income and expenses. Supporting documents include invoices, receipts and bank records.</body>"],
 ];
 const found=pages.find(([domain])=>address.includes(domain));
 return Promise.resolve(new Response(found?.[1] || "<html><body>not found</body></html>",{status:200,headers:{"content-type":"text/html"}}));
}
function mockFetch(url){
 const content=String(url).includes("irs.gov/") ? "<html><head><title>Recordkeeping for small business</title></head><body>Good records help identify income sources, track expenses and prepare financial statements. A recordkeeping system should clearly show business income and expenses. Keep supporting documents including invoices, receipts and bank statements. Financial statements and books of accounts should be accurate.</body></html>"
 : String(url).includes("sba.gov/counseling/plan-your-business") || String(url).includes("legacy.sba.gov") ? "<html><head><title>Break-even point</title></head><body>The break-even point is where total cost equals total revenue. Fixed costs divided by price less variable costs gives the break-even point in units. Contribution margin is the difference between price and variable costs. Semi-variable costs combine fixed and variable parts. This calculation is an estimate and is not intended to determine accounting or financing outcomes exactly.</body></html>"
 : String(url).includes("sba.gov/counseling/manage-your-business") ? "<html><head><title>Manage your business</title></head><body>A balance sheet helps track your capital and provide a cash flow projection. Use financial records to review cash flow and operating costs.</body></html>"
 : String(url).includes("business.gov.au") ? "<html><head><title>Guide to managing cash flow</title></head><body>Keep records of all sales and costs. Invoice promptly and follow up unpaid invoices. Choose payment terms to help manage cash flow.</body></html>"
 : String(url).includes("smallbusinesscommissioner") ? "<html><head><title>Building good payment practice</title></head><body>Agree payment terms in writing. Invoice promptly and monitor payments. Keep a record of all invoices and payment status to support cash flow.</body></html>"
 : "<html><head><title>Payment obligations</title></head><body>Payment date and late payment rules depend on applicable legal conditions. The UK payment obligation may specify 30 days where no payment date is agreed.</body></html>";
 return Promise.resolve(new Response(content,{status:200,headers:{"content-type":"text/html"}}));
}
async function setup(){
 const root=await mkdtemp(path.join(os.tmpdir(),"b71-research-"));
 const contentDir=path.join(root,"blog"), outputDir=path.join(root,"research");
 await mkdir(contentDir,{recursive:true});
 const articles=[
  ["small-business-bookkeeping-checklist","Small Business Bookkeeping Checklist","bookkeeping records, receipts, accounts and month end"],
  ["cash-flow-forecasting-small-business","Cash Flow Forecasting for Small Business","forecast receipts payments and cash balances"],
  ["reducing-late-invoice-payments","How to Reduce Late Invoice Payments","invoice follow up and payment collection"],
  ["complete-guide-to-small-business-accounting","Complete Guide to Small Business Accounting","accounting records and bookkeeping basics"],
  ["accounts-receivable-management","Accounts Receivable Management","unpaid invoices and collections"],
  ["13-week-cash-flow-forecast-template","13 Week Cash Flow Forecast Template","cash flow forecast spreadsheet"],
  ["how-to-keep-track-of-business-expenses","How to Keep Track of Business Expenses","expense tracking and receipts"],
  ["small-business-cash-flow-management","Small Business Cash Flow Management","cash flow management"],
  ["break-even-analysis-small-business","Break-Even Analysis for Small Business","break even point fixed costs variable costs"],
  ["how-to-create-an-invoice","How to Create an Invoice","invoice requirements and billing"],
 ];
 for(const [slug,title,description] of articles) await writeFile(path.join(contentDir,slug+".md"),`---\ntitle: "${title}"\ndescription: "${description}"\nslug: "${slug}"\ntags: [small business, bookkeeping]\n---\n\nExisting article body about ${description}.\n`);
 return {root,contentDir,outputDir};
}
test("freshness preserves unknown and flags stale evidence",()=>{
 assert.equal(freshnessFor({reportingPeriodEnd:null},now).status,"UNKNOWN");
 assert.equal(freshnessFor({reportingPeriodEnd:"2026-11-16"},now).status,"FRESH");
 assert.equal(freshnessFor({reportingPeriodEnd:"2026-09-01"},now).status,"STALE");
});
test("inventory analysis detects existing intent and recommends an update",async()=>{
 const env=await setup();
 try{
  const report=await runResearchPipeline({opportunities:[fixtures[0]],contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:mockFetch,now,store:null,allowFixture:true});
  assert.equal(report.results[0].cannibalization.decision,"UPDATE_EXISTING_ARTICLE");
 }finally{await rm(env.root,{recursive:true,force:true});}
});
test("compatible fixture opportunities generate unpublished drafts while an exact-target mismatch stays blocked",async()=>{
 const env=await setup();
 try{
  const report=await runResearchPipeline({opportunities:fixtures,contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:mockFetch,now,store:null,allowFixture:true});
  assert.equal(report.draftGeneratedCount,2,JSON.stringify(report.results.map(r=>({status:r.status,reasons:r.rejectionReasons,quality:r.quality}))));
  assert.equal(report.readyDraftCount,0);
  assert.equal(report.rejectedCount,1);
  const blocked=report.results.find(result=>result.status==="REJECTED");
  assert.equal(blocked.editorialDecision,"HUMAN_REVIEW_REQUIRED");
  assert.ok(blocked.rejectionReasons.includes("EXACT_TARGET_INTENT_MISMATCH_REQUIRES_HUMAN_REVIEW"));
  for(const result of report.results.filter(item=>item.draft)){
   const markdown=await readFile(result.draftPath,"utf8");
   assert.match(markdown,/publicationStatus:\s*draft/);
   assert.ok(result.draft.claims.every(claim=>claim.sourceUrls.length>0));
   assert.ok(result.quality.verifiedSourceCount>=2);
   assert.equal(result.persistence,"LOCAL_DRY_RUN_ONLY");
   assert.equal(result.status,"DRAFT_GENERATED_NOT_ELIGIBLE");
  }
 }finally{await rm(env.root,{recursive:true,force:true});}
});
test("scheduled run rejects fixture evidence and stale/missing data",async()=>{
 const env=await setup();
 try{
  const result=await runResearchPipeline({opportunities:[
   {...fixtures[0],reportingPeriodEnd:"2026-09-01"},
   {...fixtures[1],evidenceMode:"FIXTURE"},
   {...fixtures[2],metrics:{impressions:null,clicks:2,ctr:null,averagePosition:17}},
  ],contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:mockFetch,now,store:null,allowFixture:false});
  assert.equal(result.readyDraftCount,0);
  assert.ok(result.results[0].rejectionReasons.includes("GSC_EVIDENCE_STALE"));
  assert.ok(result.results[1].rejectionReasons.includes("FIXTURE_EVIDENCE_NOT_ALLOWED_IN_SCHEDULED_RUN"));
  assert.ok(result.results[2].rejectionReasons.includes("INCOMPLETE_GSC_METRICS"));
 }finally{await rm(env.root,{recursive:true,force:true});}
});
test("official source retrieval records title, publisher, retrieval date and a short excerpt",async()=>{
 const record=await retrieveSource({url:"https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping",expectedPublisher:"IRS",terms:["recordkeeping","income","expenses"]},{fetchImpl:mockFetch,now});
 assert.equal(record.status,"RETRIEVED_RELEVANT");
 assert.equal(record.publisher,"Internal Revenue Service");
 assert.equal(record.retrievedAt,now.toISOString());
 assert.ok(record.excerpt.split(/\s+/).length<=25);
});
test("unresolved cannibalization is not silently converted into a new article",()=>{
 const inventory=[{slug:"a",title:"Small business bookkeeping records",description:"bookkeeping records",tags:[]}];
 const result=analyzeCannibalization("small business bookkeeping records",inventory,null);
 assert.equal(result.decision,"UPDATE_EXISTING_ARTICLE");
});

test("draft queue persistence is idempotent and requires independent operation, research and revision readback",async()=>{
 const env=await setup(), calls={operations:[],research:[],revisions:[]};
 const jsonbLike=value=>Array.isArray(value)?value.map(jsonbLike):value&&typeof value==="object"?Object.fromEntries(Object.entries(value).sort(([left],[right])=>left.localeCompare(right)).map(([key,item])=>[key,jsonbLike(item)])):value;
 const operationIds=new Map(),researchIds=new Map(),revisionIds=new Map(),operationPayloads=new Map(),researchClaims=new Map();
 const store={
  recordContentOperation:async input=>{
   calls.operations.push(input);
   if(!operationIds.has(input.operationKey)) operationIds.set(input.operationKey,"00000000-0000-4000-8000-"+String(450+operationIds.size).padStart(12,"0"));
   operationPayloads.set(input.operationKey,input.payload);
   return operationIds.get(input.operationKey);
  },
  recordResearchRecord:async input=>{
   const key=input.opportunityId+":"+input.sourceUrl;
   if(!researchIds.has(key)) researchIds.set(key,"00000000-0000-4000-8000-"+String(100+researchIds.size).padStart(12,"0"));
   researchClaims.set(key,{supportedClaims:input.supportedClaims,unresolvedClaims:input.unresolvedClaims});
   calls.research=[...researchIds].map(([k,id])=>({
    id,source_url:k.split(":").slice(1).join(":"),opportunity_id:k.split(":")[0],
    supported_claims:jsonbLike(researchClaims.get(k)?.supportedClaims || []),
    unresolved_claims:jsonbLike(researchClaims.get(k)?.unresolvedClaims || []),
   }));
   return researchIds.get(key);
  },
  recordContentRevision:async input=>{
   if(!revisionIds.has(input.contentHash)){
    const id="00000000-0000-4000-8000-"+String(700+revisionIds.size).padStart(12,"0");
    revisionIds.set(input.contentHash,id);
   }
   const id=revisionIds.get(input.contentHash);
   calls.revisionsById ||= new Map();
   calls.revisionsById.set(id,{id,content_hash:input.contentHash,markdown:input.markdown,revision_state:"PROPOSED",operation_id:input.operationId});
   calls.revisions=[...calls.revisionsById.values()];
   return id;
  },
  getContentOperation:async({operationId})=>{
   const entry=[...operationIds.entries()].find(([,id])=>id===operationId);
   if(!entry) return null;
   const payload=operationPayloads.get(entry[0]);
   const operationInput=calls.operations.filter(item=>item.operationKey===entry[0]).at(-1);
   return {id:operationId,operation_key:entry[0],target_path:operationInput.targetPath,proposed_content_hash:operationInput.proposedContentHash,status:"PROPOSED",payload};
  },
  listResearchRecords:async({opportunityId})=>calls.research.filter(row=>row.opportunity_id===opportunityId),
  listContentRevisions:async({operationId})=>calls.revisions.filter(row=>row.operation_id===operationId),
 };
 const persistedFixtures=fixtures.map((item,index)=>({
  ...item,
  id:"00000000-0000-4000-8000-00000000000"+(index+1),
  persistedOpportunityId:"00000000-0000-4000-8000-00000000001"+(index+1),
 }));
 try{
  const first=await runResearchPipeline({opportunities:persistedFixtures,contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:mockFetch,now,store,allowFixture:true});
  const second=await runResearchPipeline({opportunities:persistedFixtures,contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:mockFetch,now,store,allowFixture:true});
  assert.equal(first.readyDraftCount,2);
  assert.equal(second.readyDraftCount,2);
  assert.equal(calls.operations.length,12);
  for(const result of second.results){
   if(result.draft){
    assert.equal(result.persistence.status,"PERSISTED");
    assert.equal(result.persistence.independentReadback.verified,true);
    assert.ok(result.persistence.researchRecordIds.length>=2);
    assert.ok(result.persistence.revisionId);
    assert.equal(result.status,"DRAFT_READY_FOR_HUMAN_REVIEW");
   }else{
    assert.equal(result.status,"REJECTED");
    assert.ok(result.rejectionReasons.includes("EXACT_TARGET_INTENT_MISMATCH_REQUIRES_HUMAN_REVIEW"));
   }
  }
  for(let i=0;i<2;i++){
   const firstOperation=calls.operations[i*3];
   const repeatedOperation=calls.operations[6+i*3];
   assert.equal(firstOperation.operationKey,repeatedOperation.operationKey);
   assert.equal(firstOperation.status,"PROPOSED");
   assert.equal(firstOperation.payload.publicationStatus,"draft");
   assert.equal(firstOperation.payload.execution,"DRY_RUN_ONLY");
   assert.ok(firstOperation.payload.sources.length>=2);
   assert.ok(/publicationStatus:\s*draft/.test(firstOperation.payload.draftMarkdown));
  }
 }finally{await rm(env.root,{recursive:true,force:true});}
});
test("unavailable or irrelevant official sources block draft generation",async()=>{
 const env=await setup();
 try{
  const result=await runResearchPipeline({opportunities:[fixtures[0]],contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:async()=>new Response("Not found",{status:404}),now,store:null,allowFixture:true});
  assert.equal(result.readyDraftCount,0);
  assert.ok(result.results[0].rejectionReasons.includes("SOURCE_VERIFICATION_INCOMPLETE"));
 }finally{await rm(env.root,{recursive:true,force:true});}
});

test("unsupported numerical claims are blocked unless explicitly labelled illustrative",()=>{
 assert.equal(detectUnsupportedNumericClaims("The software saves $500 per month."),true);
 assert.equal(detectUnsupportedNumericClaims("The product serves 100 customers."),true);
 assert.equal(detectUnsupportedNumericClaims("Example (illustrative figures only): fixed costs are $2,000 and the break-even point is 100 units."),false);
 assert.deepEqual(findUnsupportedNumericClaims("1. Record invoices.\n2. Review expenses."),[]);
});

test("an exact GSC landing page remains an update candidate despite low token overlap",()=>{
 const inventory=[{slug:"break-even-analysis-small-business",title:"Operating Cash Management and Monthly Budget Review for Growing Organisations",description:"A practical guide to working capital, monthly costs, financial statements, reporting routines and business resources.",tags:["cash management","budgeting","working capital","monthly reporting","operating costs","business resources"]}];
 const result=analyzeCannibalization(
  "small business break-even analysis formula",
  inventory,
  "https://www.finflowtrack.com/blog/break-even-analysis-small-business",
 );
 assert.equal(result.decision,"UPDATE_EXISTING_ARTICLE");
 assert.equal(result.targetQueryMatch,"EXACT_LANDING_PAGE_REVIEW_REQUIRED");
 assert.equal(result.target.slug,"break-even-analysis-small-business");
});

test("classifies software-selection queries without treating them as generic recordkeeping", () => {
  const queries = [
    "free bookkeeping platforms with reporting features",
    "free business accounting apps worth considering",
    "which free accounting programs can track invoices",
    "recommend free accounting software for tracking sales",
  ];
  for (const query of queries) {
    const intent = classifySearchIntent(query);
    assert.equal(intent, "Software selection");
    const selection = selectCompatibleSourcePack(query, intent);
    assert.equal(selection.compatible, true);
    assert.equal(selection.matchedPackId, "software-selection");
    assert.equal(selection.reason, null);
    for (const spec of selection.pack.claimSpecs) {
      const mapped = spec.sourceIndexes.map(index => selection.pack.sources[index]);
      for (const term of spec.terms) {
        assert.ok(mapped.some(source => source.terms.includes(term)), `Source pack claim term lacks an approved source term: ${spec.id} / ${term}`);
      }
    }
  }
  assert.equal(classifySearchIntent("unclear business finance question"), "REVIEW_REQUIRED");
});

test("an exact GSC target with matching editorial intent remains an update despite low lexical overlap", () => {
  const result = analyzeCannibalization(
    "free business accounting apps worth considering",
    [{
      slug: "free-accounting-software-for-small-business",
      title: "Free Accounting Software for Small Business",
      description: "A guide to free accounting software and small-business bookkeeping apps",
      tags: ["accounting software", "small business"],
      content: "Compare accounting software options for small businesses.",
    }],
    "https://www.finflowtrack.com/blog/free-accounting-software-for-small-business",
  );
  assert.equal(result.target.exactTarget, true);
  assert.equal(result.target.intentMatch, true);
  assert.equal(result.targetQueryMatch, "EXACT_LANDING_PAGE_INTENT_MATCH");
  assert.equal(result.editorialDecision, "UPDATE_EXISTING_ARTICLE");
  assert.equal(result.requiresHumanReview, false);
});

test("the exact GSC landing page is assessed as an update, not a new article", async () => {
  const env = await setup();
  try {
    await writeFile(path.join(env.contentDir, "free-accounting-software-for-small-business.md"),
      '---\ntitle: "Free Accounting Software for Small Business"\ndescription: "A guide to free accounting software and small-business bookkeeping apps"\nslug: "free-accounting-software-for-small-business"\ntags: [accounting software, small business]\n---\n\nCompare accounting software selection criteria, invoice features, reporting and sales tracking for small businesses.\n\n## Free Accounting Software Options: A Practical Comparison\n\nOld provider comparison that must be replaced by the current source-backed comparison.\n\n## What Does "Free Accounting Software" Actually Mean?\n\nThis original explanatory section must remain unchanged.\n');
    const result = await runResearchPipeline({
      opportunities: [{
        id: "gsc-software-selection",
        targetUrl: "https://www.finflowtrack.com/blog/free-accounting-software-for-small-business",
        targetQuery: "free business accounting apps worth considering",
        metrics: { impressions: 31, clicks: 0, ctr: 0, averagePosition: 9.77 },
        reportingPeriodEnd: "2026-11-15",
        dataSource: "Google Search Console",
        evidenceMode: "HISTORICAL_GSC_ARTIFACT",
        historicalProvenance: {
          artifactId: "fixture-artifact",
          sha256: "b".repeat(64),
          evidenceMode: "HISTORICAL_GSC_ARTIFACT",
        },
      }],
      contentDir: env.contentDir, outputDir: env.outputDir, fetchImpl: mockSoftwareSelectionFetch, now, store: null,
    });
    const item = result.results[0];
    assert.deepEqual(item.candidate.historicalProvenance, {
      artifactId: "fixture-artifact",
      sha256: "b".repeat(64),
      evidenceMode: "HISTORICAL_GSC_ARTIFACT",
    });
    assert.equal(item.intent, "Software selection");
    assert.equal(item.cannibalization.decision, "UPDATE_EXISTING_ARTICLE");
    assert.equal(item.editorialDecision, "UPDATE_EXISTING_ARTICLE");
    assert.equal(item.status, "DRAFT_GENERATED_NOT_ELIGIBLE", JSON.stringify({reasons:item.rejectionReasons,quality:item.quality,numeric:item.quality?.numericClaims}));
    assert.deepEqual(item.rejectionReasons, []);
    assert.deepEqual(item.quality.numericClaims.unsupported, []);
    assert.equal(item.draft.claims.find(claim => claim.id === "zoho-us-free").verificationStatus, "KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED");
    assert.doesNotMatch(item.draft.content, /\$50,000|1,000 invoices|1,000 expenses/);
    assert.match(item.draft.content, /one-user allowance/i);
    assert.equal(item.sourcePackCompatibility.compatible, true);
    assert.equal(item.sourcePackCompatibility.matchedPackId, "software-selection");
    assert.equal(item.draft.slug, "free-accounting-software-for-small-business");
    assert.equal(item.draft.operationType, "EXISTING_ARTICLE_UPDATE");
    assert.equal(result.draftGeneratedCount, 1);
    assert.equal(result.readyDraftCount, 0);
    assert.equal(item.quality.productCapabilities, "VERIFIED_FROM_REPOSITORY");
    assert.match(item.draft.content, /What Does "Free Accounting Software" Actually Mean\?/);
    assert.match(item.draft.content, /This original explanatory section must remain unchanged\./);
    assert.match(item.draft.content, /ZipBooks Starter/);
    assert.match(item.draft.content, /\| Product \| What the free plan lists \| Limits or costs to verify \|/);
    assert.match(item.draft.content, /Zoho Books US Free/);
    assert.equal(matter(item.draft.content).data.updatedAt, "2026-11-19");
    assert.equal(matter(item.draft.content).data.draft, true);
  } finally {
    await rm(env.root, { recursive: true, force: true });
  }
});

test("source retrieval records redirect, HTTP and content-type evidence and rejects unsafe redirects", async () => {
  const good = await retrieveSource({
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping",
    expectedPublisher: "Internal Revenue Service",
    terms: ["recordkeeping", "income", "expenses"],
  }, {
    fetchImpl: async () => new Response("<html><head><title>Records</title></head><body>Recordkeeping helps track income and expenses.</body></html>", {
      status: 200, headers: { "content-type": "text/html; charset=utf-8" },
    }),
    now,
  });
  assert.equal(good.httpStatus, 200);
  assert.equal(good.contentType, "text/html");
  assert.equal(good.finalUrl, good.url);
  assert.equal(good.verificationStatus, "KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED");

  const redirected = await retrieveSource({
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping",
    expectedPublisher: "Internal Revenue Service",
    terms: ["recordkeeping", "income", "expenses"],
  }, {
    fetchImpl: async () => ({
      ok:true,status:200,url:"https://unrelated.example/source",
      headers:new Headers({"content-type":"text/html"}),
      text:async()=>"<html></html>",
    }),
    now,
  });
  assert.equal(redirected.status, "UNAVAILABLE");
  assert.equal(redirected.verificationStatus, "REJECTED");
  assert.equal(redirected.error, "UNEXPECTED_REDIRECT_OR_PUBLISHER_MISMATCH");
});

test("numeric claims require matching source numbers and claim-source mappings", () => {
  const source = {url:"https://www.zoho.com/us/books/pricing/",numericTokens:["1 User"]};
  const claims = [{
    text:"The plan allows 1 user and lists a US$50,000 revenue threshold.",
    sourceUrls:[source.url],
  }];
  const result = assessNumericClaims("1 user; $50,000.",claims,[source]);
  assert.deepEqual(result.verified,["1 user"]);
  assert.deepEqual(result.unsupported,["$50,000"]);
  const missingMapping = assessNumericClaims("$50,000.",[{text:"Revenue threshold is $50,000.",sourceUrls:[]}],[source]);
  assert.deepEqual(missingMapping.unsupported,["$50,000"]);
});
