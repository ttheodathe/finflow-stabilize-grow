import { mkdir, writeFile } from "node:fs/promises";
import { runResearchPipeline } from "./pipeline.mjs";

const opportunities = [
  { id:"fixture-recordkeeping", targetUrl:"https://www.finflowtrack.com/blog/small-business-bookkeeping-checklist", targetQuery:"small business bookkeeping records checklist", metrics:{impressions:120,clicks:4,ctr:4/120,averagePosition:14.2}, reportingPeriodEnd:"2026-11-16", dataSource:"TEST_FIXTURE", evidenceMode:"FIXTURE" },
  { id:"fixture-cashflow", targetUrl:"https://www.finflowtrack.com/blog/13-week-cash-flow-forecast-template", targetQuery:"13-week cash flow forecast template", metrics:{impressions:95,clicks:3,ctr:3/95,averagePosition:11.8}, reportingPeriodEnd:"2026-11-16", dataSource:"TEST_FIXTURE", evidenceMode:"FIXTURE" },
  { id:"fixture-receivables", targetUrl:"https://www.finflowtrack.com/blog/break-even-analysis-small-business", targetQuery:"small business break-even analysis formula", metrics:{impressions:80,clicks:2,ctr:2/80,averagePosition:17.1}, reportingPeriodEnd:"2026-11-16", dataSource:"TEST_FIXTURE", evidenceMode:"FIXTURE" },
];
const mockFetch = async url => {
  const target=String(url);
  let body="";
  if(target.includes("irs.gov/")) body="<html><head><title>Recordkeeping for small business</title></head><body>A recordkeeping system should clearly show business income and expenses. Keep supporting documents including invoices, receipts and bank statements. Financial statements and books of accounts should be accurate.</body></html>";
  else if(target.includes("sba.gov/counseling/plan-your-business") || target.includes("legacy.sba.gov")) body="<html><head><title>Break-even point</title></head><body>The break-even point is where total cost equals total revenue. Fixed costs divided by price less variable costs gives the break-even point in units. Contribution margin is the difference between price and variable costs. Semi-variable costs combine fixed and variable parts. This calculation is an estimate and is not intended to determine accounting or financing outcomes exactly.</body></html>";
  else if(target.includes("sba.gov/counseling/manage-your-business")) body="<html><head><title>Manage your business</title></head><body>A balance sheet helps track your capital and provide a cash flow projection. Use financial records to review cash flow and operating costs.</body></html>";
  else if(target.includes("business.gov.au")) body="<html><head><title>Guide to managing cash flow</title></head><body>Keep records of all sales and costs. Invoice promptly and follow up unpaid invoices. Choose payment terms to help manage cash flow.</body></html>";
  else if(target.includes("smallbusinesscommissioner")) body="<html><head><title>Building good payment practice</title></head><body>Agree payment terms in writing. Invoice promptly and monitor payments. Keep a record of all invoices and payment status to support cash flow.</body></html>";
  else body="<html><head><title>Payment obligations</title></head><body>Payment date and late payment rules depend on applicable legal conditions. The UK payment obligation may specify 30 days where no payment date is agreed.</body></html>";
  return new Response(body,{status:200,headers:{"content-type":"text/html"}});
};
const outputDir="seo-output/b7.1-fixture";
await mkdir(outputDir,{recursive:true});
const result=await runResearchPipeline({opportunities,outputDir,fetchImpl:mockFetch,store:null,allowFixture:true,now:new Date("2026-11-19T12:00:00.000Z")});
const summary={mode:"FIXTURE_TEST_ONLY",gscEvidence:"SYNTHETIC_NOT_LIVE_GSC",candidateCount:result.results.length,readyDraftCount:result.readyDraftCount,rejectedCount:result.rejectedCount,results:result.results.map(item=>({id:item.candidate.id,query:item.candidate.targetQuery,decision:item.cannibalization?.decision,status:item.status,slug:item.draft?.slug,sourceCount:item.quality?.sourceCount,reasons:item.rejectionReasons}))};
await writeFile("seo-output/b7.1-fixture/fixture-summary.json",JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
