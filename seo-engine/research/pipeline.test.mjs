import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runResearchPipeline, freshnessFor, analyzeCannibalization, retrieveSource, detectUnsupportedNumericClaims } from "./pipeline.mjs";

const now=new Date("2026-11-19T10:00:00.000Z");
const fixtures=[
 {id:"fixture-recordkeeping",targetUrl:"https://www.finflowtrack.com/blog/small-business-bookkeeping-checklist",targetQuery:"small business bookkeeping records checklist",metrics:{impressions:120,clicks:4,ctr:4/120,averagePosition:14.2},reportingPeriodEnd:"2026-11-16",dataSource:"TEST_FIXTURE",evidenceMode:"FIXTURE"},
 {id:"fixture-cashflow",targetUrl:"https://www.finflowtrack.com/blog/13-week-cash-flow-forecast-template",targetQuery:"13-week cash flow forecast template",metrics:{impressions:95,clicks:3,ctr:3/95,averagePosition:11.8},reportingPeriodEnd:"2026-11-16",dataSource:"TEST_FIXTURE",evidenceMode:"FIXTURE"},
 {id:"fixture-receivables",targetUrl:"https://www.finflowtrack.com/blog/break-even-analysis-small-business",targetQuery:"small business break-even analysis formula",metrics:{impressions:80,clicks:2,ctr:2/80,averagePosition:17.1},reportingPeriodEnd:"2026-11-16",dataSource:"TEST_FIXTURE",evidenceMode:"FIXTURE"},
];
function mockFetch(url){
 const content=String(url).includes("irs.gov/") ? "<html><head><title>Recordkeeping for small business</title></head><body>A recordkeeping system should clearly show business income and expenses. Keep supporting documents including invoices, receipts and bank statements. Financial statements and books of accounts should be accurate.</body></html>"
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
test("three fixture opportunities generate unpublished source-mapped drafts",async()=>{
 const env=await setup();
 try{
  const report=await runResearchPipeline({opportunities:fixtures,contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:mockFetch,now,store:null,allowFixture:true});
  assert.equal(report.readyDraftCount,3,JSON.stringify(report.results.map(r=>({status:r.status,reasons:r.rejectionReasons,quality:r.quality}))));
  for(const result of report.results){
   const markdown=await readFile(result.draftPath,"utf8");
   assert.match(markdown,/publicationStatus: "draft"/);
   assert.ok(result.draft.claims.every(claim=>claim.sourceUrls.length>0));
   assert.ok(result.quality.verifiedSourceCount>=2);
   assert.equal(result.persistence,"LOCAL_DRY_RUN_ONLY");
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

test("draft queue persistence is stable across duplicate runs and stores full evidence",async()=>{
 const env=await setup(), calls=[];
 const store={recordContentOperation:async input=>{calls.push(input);return "fixture-operation-id";}};
 try{
  await runResearchPipeline({opportunities:fixtures,contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:mockFetch,now,store,allowFixture:true});
  await runResearchPipeline({opportunities:fixtures,contentDir:env.contentDir,outputDir:env.outputDir,fetchImpl:mockFetch,now,store,allowFixture:true});
  assert.equal(calls.length,6);
  for(let i=0;i<3;i++){
   assert.equal(calls[i].operationKey,calls[i+3].operationKey);
   assert.equal(calls[i].status,"DRAFTED");
   assert.equal(calls[i].payload.publicationStatus,"draft");
   assert.equal(calls[i].payload.execution,"DRY_RUN_ONLY");
   assert.ok(calls[i].payload.sources.length>=2);
   assert.ok(calls[i].payload.draftMarkdown.includes('publicationStatus: "draft"'));
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
});
