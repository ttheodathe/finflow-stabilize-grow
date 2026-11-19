import test from "node:test";
import assert from "node:assert/strict";
import { validateDraft } from "./validate-draft.mjs";
const validDraft={
 title:"A practical guide to cash flow",description:"Learn the basics of cash flow planning.",
 slug:"cash-flow-planning-guide",status:"draft",publicationStatus:"draft",
 canonicalUrl:"https://www.finflowtrack.com/blog/cash-flow-planning-guide",
 editorialReviewed:false,author:null,internalLinks:[],
 evidence:[{sourceUrl:"https://www.sba.gov/",sourceType:"government",verifiedAt:"2026-11-19",supports:"Cash flow planning context"}],
 claims:[{text:"A balance sheet can support cash-flow projections.",sourceUrls:["https://www.sba.gov/"],verificationStatus:"KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED"}],
};
test("valid draft metadata and registered sources pass deterministic hard gates",()=>{
 const result=validateDraft(validDraft);
 assert.equal(result.decision,"REVIEW_REQUIRED");assert.deepEqual(result.errors,[]);
 assert.ok(result.warnings.includes("AUTHOR_NOT_ASSIGNED_PENDING_APPROVAL"));
});
test("blocks product capabilities outside the verified allowlist",()=>{
 const result=validateDraft({...validDraft,claims:[{text:"The product provides payroll.",type:"product",capability:"Free payroll",sourceUrls:["https://www.sba.gov/"]}]});
 assert.equal(result.decision,"BLOCKED");assert.ok(result.errors.includes("UNVERIFIED_PRODUCT_CAPABILITY"));
});
test("blocks claims without a source in the evidence register",()=>{
 const result=validateDraft({...validDraft,claims:[{text:"An unsourced claim",sourceUrls:["https://example.com/"]}]});
 assert.ok(result.errors.includes("CLAIM_SOURCE_NOT_IN_REGISTER"));
});
test("blocks missing metadata and malformed slugs",()=>{
 const result=validateDraft({...validDraft,title:"",slug:"Bad Slug"});
 assert.ok(result.errors.includes("MISSING_METADATA:title"));assert.ok(result.errors.includes("INVALID_SLUG"));
});
test("blocks absent evidence",()=>{
 const result=validateDraft({...validDraft,evidence:[]});assert.ok(result.errors.includes("NO_SOURCE_EVIDENCE"));
});
test("blocks unsupported claims even when a source is registered",()=>{
 const result=validateDraft({...validDraft,claims:[{text:"A factual claim",sourceUrls:["https://www.sba.gov/"],verificationStatus:"UNVERIFIED"}]});
 assert.ok(result.errors.includes("UNVERIFIED_CLAIM"));
});
test("allows an existing slug only for an explicitly bound update",()=>{
 assert.equal(validateDraft({...validDraft,slug:"existing-page"},{existingSlugs:["existing-page"],operationType:"EXISTING_ARTICLE_UPDATE",targetSlug:"existing-page"}).decision,"REVIEW_REQUIRED");
 assert.ok(validateDraft({...validDraft,slug:"existing-page"},{existingSlugs:["existing-page"],operationType:"NEW_ARTICLE"}).errors.includes("DUPLICATE_SLUG"));
});
test("rejects publication status and unapproved author attribution",()=>{
 const result=validateDraft({...validDraft,status:"published",author:"Unapproved Author"});
 assert.ok(result.errors.includes("PUBLICATION_STATUS_NOT_DRAFT"));assert.ok(result.errors.includes("UNAPPROVED_AUTHOR_ATTRIBUTION"));
});
