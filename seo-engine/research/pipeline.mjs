import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import matter from "gray-matter";
import productCapabilityRecord from "../../content/operations/research/verified-product-capabilities.json" with { type: "json" };
import editorialBacklog from "./editorial-backlog.json" with { type: "json" };
import { validateDraft } from "../content-ops/validate-draft.mjs";
import { runArticleProduction } from "./article-production.mjs";
import { createArticleGeneratorFromEnv } from "./article-generator-provider.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";

const CONTENT_DIR = "content/blog";
const RESEARCH_DIR = "content/operations/research";
const MAX_EXCERPT_WORDS = 25;
const STALE_AFTER_DAYS = 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requireUuid(value, label) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} did not return a valid persisted UUID.`);
  }
  return value;
}
const SOURCE_PACKS = [
  {
    id: "software-selection",
    supportedIntents: ["Software selection", "Feature evaluation", "Pricing and alternatives"],
    subjectCoverage: ["accounting software", "free accounting software", "bookkeeping platforms", "accounting apps", "invoice tracking", "reporting features"],
    audience: "Small-business owners, freelancers and microbusinesses comparing financial software",
    jurisdiction: "Provider-specific plan and regional terms; Zoho source is the United States edition only",
    approvedSourceTypes: ["OFFICIAL_VENDOR", "OFFICIAL_GOVERNMENT"],
    match: /free.{0,45}(accounting|bookkeeping).{0,45}(software|apps?|platforms?|programs?|tools?)|(?:accounting|bookkeeping).{0,45}(software|apps?|platforms?|programs?).{0,45}(compare|free|best|recommend|worth)/i,
    intent: "Commercial investigation",
    updateSectionHeading: "## Free Accounting Software Options: A Practical Comparison",
    sources: [
      { url: "https://www.waveapps.com/pricing", expectedPublisher: "Wave", supports: ["Wave Starter is listed at $0 and includes unlimited estimates, invoices, bills and bookkeeping records; payment processing fees may apply."], terms: ["STARTER", "$0", "invoices", "bookkeeping records", "credit card transaction"] },
      { url: "https://www.zoho.com/us/books/pricing/", expectedPublisher: "Zoho", supports: ["The United States edition of Zoho Books lists a Free plan with invoicing, expenses, reports and a one-user allowance; check the current US pricing page for eligibility and plan limits."], terms: ["FREE", "invoices", "expenses", "reports", "1 User"] },
      { url: "https://zipbooks.com/pricing", expectedPublisher: "ZipBooks", supports: ["ZipBooks Starter is listed as free and includes unlimited invoices, vendors and customers, basic reports and one connected bank account."], terms: ["Starter", "Free", "invoices", "customers", "Basic Reports", "1 bank account"] },
      { url: "https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep", expectedPublisher: "Internal Revenue Service", supports: ["Business records should clearly show income and expenses and retain supporting documents."], terms: ["records", "income", "expenses", "invoices", "receipts"] },
    ],
    claimSpecs: [
      { id: "wave-starter", text: "Wave Starter is listed at $0 and includes unlimited estimates, invoices, bills and bookkeeping records; payment processing can involve separate transaction fees.", terms: ["STARTER", "$0", "invoices", "bookkeeping records", "credit card transaction"], sourceIndexes: [0] },
      { id: "zoho-us-free", text: "Zoho Books' United States Free plan lists invoicing, expenses and reports with a one-user allowance; check the current US pricing page for eligibility and plan limits.", terms: ["FREE", "invoices", "expenses", "reports", "1 User"], sourceIndexes: [1] },
      { id: "zipbooks-starter", text: "ZipBooks Starter is listed as free and includes unlimited invoices, customers and vendors, basic reports and one connected bank account.", terms: ["Starter", "Free", "invoices", "customers", "Basic Reports", "1 bank account"], sourceIndexes: [2] },
      { id: "recordkeeping", text: "A suitable recordkeeping process should clearly show business income and expenses and retain supporting documents.", terms: ["records", "income", "expenses", "invoices", "receipts"], sourceIndexes: [3] },
    ],
    productMention: "free accounting software",
    title: "Free Accounting Software for Small Business",
    description: "Compare free accounting software plans for small businesses, including invoicing, expenses, reports, user limits, regional eligibility and payment costs.",
    sections: [
      ["Wave Starter: invoicing and bookkeeping records", "Wave lists Starter at $0 and describes unlimited estimates, invoices, bills and bookkeeping records. Its pricing page also lists transaction fees when online card payments are used. The Pro plan adds automated bank transaction imports, transaction merging and categorization, receipt capture and other paid features. A business should therefore compare the $0 subscription with the cost of payment processing and any paid workflow it expects to need. Do not assume that bank automation or receipt capture is part of the Starter plan; check the current feature comparison and the availability of payment services in the business's country."],
      ["Zoho Books US Free: features with eligibility limits", "The United States edition of Zoho Books lists a Free plan with invoices, expenses, reports and a one-user allowance. Plan eligibility and limits can change, so verify the current US pricing page before relying on any feature or limit. This US edition should not be treated as a global offer: a business operating elsewhere should open the provider's local edition and check the terms that apply there."],
      ["ZipBooks Starter: basic invoicing and reporting", "ZipBooks lists Starter as a free plan with unlimited invoices, vendors and customers, basic reports and one connected bank account. The next tiers add workflows such as recurring invoices, reminders, additional bank connections, time tracking and larger team access. A business that only needs straightforward invoicing and basic reporting may find the Starter plan worth assessing, while a business that depends on recurring billing, reconciliation or multiple bank accounts should check the paid-tier requirements."],
      ["Compare the workflow and the total cost", "Before choosing a plan, list the tasks the business must complete each month: creating invoices, recording expenses, maintaining customer records, reviewing reports, reconciling transactions and exporting records. Then check which tasks are included in the free tier, which are limited by user or transaction counts, and which require a paid plan or a separate transaction fee. A free subscription does not automatically mean every payment, add-on or financial workflow is free. Confirm data export, support, regional availability and the terms that apply to the business's location."],
    ],
    related: ["how-to-create-an-invoice", "how-to-keep-track-of-business-expenses", "complete-guide-to-small-business-accounting"],
  },
  {
    id: "bank-reconciliation",
    supportedIntents: ["How-to/tutorial", "Bookkeeping guidance"],
    subjectCoverage: ["bank reconciliation", "reconcile bank statement", "reconcile business bank account", "bank statement reconciliation"],
    audience: "Small-business owners, freelancers and bookkeepers maintaining transaction records",
    jurisdiction: "United States IRS recordkeeping example; other jurisdictions must use their own local guidance",
    approvedSourceTypes: ["OFFICIAL_GOVERNMENT"],
    match: /bank reconciliation|reconcil(?:e|ing).*bank|bank.*reconcil/i,
    intent: "Informational",
    sources: [
      {
        url: "https://www.irs.gov/publications/p583",
        expectedPublisher: "Internal Revenue Service",
        supports: ["Compare the bank statement, checkbook and books; identify bank charges and deposits not yet shown; reconcile the checking account regularly."],
        terms: ["bank statement", "checkbook", "books", "bank charges", "deposits", "reconcile your checking account each month"],
      },
      {
        url: "https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep",
        expectedPublisher: "Internal Revenue Service",
        supports: ["Bank statements, invoices, receipts and other supporting documents help substantiate business records."],
        terms: ["bank statements", "invoices", "receipts", "supporting documents"],
      },
    ],
    title: "How to Reconcile a Business Bank Statement: A Monthly Checklist",
    description: "Learn how to compare bank statements with business records, investigate timing differences and document a repeatable monthly reconciliation.",
    sections: [
      ["What bank reconciliation checks", "Bank reconciliation compares the activity and balance shown by a financial institution with the transactions recorded in the business books. The purpose is to identify differences that need explanation, such as transactions recorded in one place but not yet shown in the other, bank charges, or recording mistakes. The IRS describes this process in its United States recordkeeping publication. Businesses in other countries should follow the recordkeeping guidance that applies locally."],
      ["Prepare the records before comparing", "Gather the statement for the period, the business cash or bank ledger, transaction records, deposit details, payment records and supporting documents. Confirm that the statement and books cover the same account and period. Keep invoices and receipts organized so an entry can be traced to its supporting evidence. Do not treat an unexplained difference as a confirmed error until its timing and source have been checked."],
      ["Compare transactions and explain differences", "Match deposits and incoming transfers between the statement and the books. Then compare payments, transfers, fees and other withdrawals. Mark items that appear in both records, and list unmatched items for investigation. A deposit made near the statement closing date may appear in the books before it appears on the statement. A bank fee may appear on the statement before it has been entered in the books. Record each explanation clearly."],
      ["Correct records and keep an audit trail", "Investigate amount or date differences against the original supporting documents. Record missing bank fees or other confirmed items in the books using the business's normal accounting process. Correct data-entry mistakes with a traceable adjustment rather than silently changing historical records. Retain the statement, reconciliation summary and supporting documents together so another reviewer can understand how the final balance was reached."],
      ["Use a consistent monthly review", "Complete the reconciliation on a consistent schedule, review unresolved items, and assign follow-up actions. The IRS publication recommends reconciling a checking account each month for the recordkeeping example it describes. That is useful United States guidance, not a universal legal deadline. The right review process depends on the business, account activity and local requirements."],
    ],
    claimSpecs: [
      { id: "bank-reconciliation-purpose", text: "Bank reconciliation compares the bank statement with the checkbook and business books to identify differences.", terms: ["bank statement", "checkbook", "books"], sourceIndexes: [0] },
      { id: "bank-reconciliation-differences", text: "Differences can arise from bank charges and deposits that are not yet shown on the bank statement.", terms: ["bank charges", "deposits", "statement"], sourceIndexes: [0] },
      { id: "bank-reconciliation-frequency", text: "The IRS publication recommends reconciling the checking account each month in its United States recordkeeping guidance.", terms: ["reconcile your checking account each month"], sourceIndexes: [0], jurisdiction: "United States" },
      { id: "bank-supporting-records", text: "Bank statements, invoices and receipts are examples of supporting business documents.", terms: ["bank statements", "invoices", "receipts"], sourceIndexes: [1] },
    ],
    related: ["complete-guide-to-small-business-accounting", "content-blog-how-to-do-bookkeeping-for-a-small-business", "content-blog-small-business-bookkeeping-checklist"],
  },
  {
    id: "cash-vs-accrual",
    supportedIntents: ["Accounting education", "How-to/tutorial", "Bookkeeping guidance"],
    subjectCoverage: ["cash vs accrual accounting", "cash method", "accrual method", "cash basis accounting", "accrual basis accounting"],
    audience: "Small-business owners learning how timing affects bookkeeping and reporting",
    jurisdiction: "United States federal tax-method overview only; rules and eligibility differ by entity and jurisdiction",
    approvedSourceTypes: ["OFFICIAL_GOVERNMENT"],
    match: /cash.{0,25}accrual|accrual.{0,25}cash|cash method|accrual method/i,
    intent: "Informational",
    sources: [
      {
        url: "https://www.irs.gov/publications/p583",
        expectedPublisher: "Internal Revenue Service",
        supports: ["The cash method generally reports income when received and expenses when paid; the accrual method generally reports income when earned and expenses when incurred."],
        terms: ["cash method", "tax year you receive it", "accrual method", "year you earn it", "year you incur them"],
      },
    ],
    title: "Cash vs. Accrual Accounting: How the Methods Differ",
    description: "Understand the timing difference between cash and accrual accounting, what each method shows and why local accounting and tax rules matter.",
    sections: [
      ["The core difference is timing", "Cash and accrual methods can record the same business activity in different periods because they recognize income and expenses at different points. Under a cash method, timing is generally tied to receiving or paying money. Under an accrual method, timing is generally tied to earning income or incurring an expense. This distinction helps explain why profit reported for a period and cash available in the bank are not necessarily the same."],
      ["How the cash method works", "In the United States federal tax overview published by the IRS, the cash method generally reports income in the tax year it is received and deducts or capitalizes expenses in the year they are paid. This can make the timing easier to follow from cash receipts and payments, but it does not by itself show every amount earned or owed during the period. Do not assume that every business is eligible to use this method."],
      ["How the accrual method works", "The IRS describes the accrual method as generally reporting income in the year it is earned, even if payment arrives later, and accounting for expenses in the year they are incurred, even if payment happens later. This can make unpaid invoices and supplier bills visible in the period they relate to. The detailed rules and exceptions depend on the business and applicable tax requirements."],
      ["Why reports and cash balances can differ", "A business may issue an invoice near the end of a month and receive payment in the next month. The timing of that transaction can differ between cash and accrual records. The same issue can occur with supplier bills. A cash flow report focuses on cash movement, while an accrual-based profit and loss report can include income earned and expenses incurred but not yet settled."],
      ["Check the rules before choosing or changing a method", "The IRS publication explains that accounting-method requirements can depend on inventory, the type of business and other conditions, and that changing a method may require approval. This is United States federal guidance, not a global rule or individualized tax advice. Businesses should confirm eligibility and reporting requirements with the relevant tax authority or a qualified professional in their jurisdiction."],
    ],
    claimSpecs: [
      { id: "cash-method-timing", text: "Under the IRS description, the cash method generally reports income in the tax year it is received.", terms: ["cash method", "tax year you receive it"], sourceIndexes: [0], jurisdiction: "United States" },
      { id: "accrual-income-timing", text: "Under the IRS description, the accrual method generally reports income in the year it is earned, even if payment arrives later.", terms: ["accrual method", "year you earn it"], sourceIndexes: [0], jurisdiction: "United States" },
      { id: "accrual-expense-timing", text: "Under the IRS description, accrual accounting generally accounts for expenses in the year they are incurred.", terms: ["year you incur them"], sourceIndexes: [0], jurisdiction: "United States" },
    ],
    related: ["content-blog-bookkeeping-vs-accounting", "complete-guide-to-small-business-accounting", "cash-flow-forecasting-small-business"],
  },
  {
    id: "journals-and-ledgers",
    supportedIntents: ["Bookkeeping guidance", "Accounting education", "How-to/tutorial"],
    subjectCoverage: ["accounting journals and ledgers", "journal vs ledger", "general ledger", "business transaction journal"],
    audience: "Small-business owners, bookkeepers and accounting students",
    jurisdiction: "General bookkeeping concepts with United States IRS recordkeeping source",
    approvedSourceTypes: ["OFFICIAL_GOVERNMENT"],
    match: /journal.{0,25}ledger|ledger.{0,25}journal|general ledger|accounting journal/i,
    intent: "Informational",
    sources: [
      {
        url: "https://www.irs.gov/businesses/small-businesses-self-employed/how-should-i-record-my-business-transactions",
        expectedPublisher: "Internal Revenue Service",
        supports: ["A journal records transactions from supporting documents; a ledger contains journal totals organized into accounts; double-entry bookkeeping records equal debits and credits."],
        terms: ["journal", "ledger", "supporting documents", "accounts", "debits", "credits"],
      },
    ],
    title: "Accounting Journals vs. Ledgers: A Small-Business Guide",
    description: "Learn how journals capture transactions, how ledgers organize account balances and how the two records work together in bookkeeping.",
    sections: [
      ["What an accounting journal records", "A journal is a chronological record of business transactions drawn from supporting documents. An entry should be traceable to the underlying invoice, receipt, payment record or other evidence. Some businesses maintain separate journals for transaction types that occur frequently. The right structure depends on the business's activity and the level of detail needed to review its records."],
      ["What a ledger organizes", "A ledger groups recorded activity by account, such as income, expenses, assets and liabilities. Rather than simply listing transactions in date order, it helps show the accumulated activity and balance for each account. The IRS describes journals and ledgers as ordinary parts of a business recordkeeping system, while noting that the system should suit the type of business."],
      ["How journal entries flow into ledger accounts", "In a double-entry system, transactions are first entered in a journal and then posted to ledger accounts. Each transaction affects at least two accounts, with debit and credit entries. The total debits must equal the total credits after posting. This structure helps keep the accounting equation in balance, but it does not remove the need to check that the original transaction was recorded accurately."],
      ["Keep entries connected to evidence", "Use consistent dates, descriptions, account names and references to supporting documents. Review entries for missing information, duplicate recording and incorrect account classification. Keep source documents in an orderly system so a reviewer can move from a ledger balance to the related journal entries and then to the evidence supporting the transaction."],
      ["Choose a process the business can maintain", "A small operation may use a simple set of books, while a business with more activity may need separate journals and more detailed ledger accounts. Electronic accounting systems can organize these records, but the owner still needs a consistent process for entering transactions and reviewing exceptions. The IRS source describes United States recordkeeping expectations; businesses elsewhere should check local requirements."],
    ],
    claimSpecs: [
      { id: "journal-definition", text: "A journal is where a business records each transaction shown by its supporting documents.", terms: ["journal", "transactions", "supporting documents"], sourceIndexes: [0] },
      { id: "ledger-definition", text: "A ledger contains totals from journals and is organized into accounts.", terms: ["ledger", "journals", "accounts"], sourceIndexes: [0] },
      { id: "double-entry-balance", text: "In a double-entry system, total debits must equal total credits after journal entries are posted to the ledger.", terms: ["debits", "credits", "ledger"], sourceIndexes: [0] },
    ],
    related: ["complete-guide-to-small-business-accounting", "content-blog-how-to-do-bookkeeping-for-a-small-business", "content-blog-bookkeeping-vs-accounting"],
  },
  {
    id: "recordkeeping",
    supportedIntents: ["Bookkeeping guidance", "How-to/tutorial", "Accounting education"],
    subjectCoverage: ["bookkeeping", "business records", "income", "expenses", "receipts", "invoices"],
    audience: "Small-business owners and operators",
    jurisdiction: "United States; jurisdiction-specific limitations must remain explicit",
    approvedSourceTypes: ["OFFICIAL_GOVERNMENT"],
    match: /record|bookkeep|accounting|expense|receipt|financial records/i,
    intent: "Informational",
    sources: [
      { url: "https://www.irs.gov/businesses/small-businesses-self-employed/why-should-i-keep-records", expectedPublisher: "Internal Revenue Service", supports: ["Good records help identify income sources, track expenses and prepare financial statements"], terms: ["records", "income", "expenses", "financial statements"] },
      { url: "https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep", expectedPublisher: "Internal Revenue Service", supports: ["A suitable recordkeeping system should clearly show income and expenses; supporting documents include invoices, receipts and bank records"], terms: ["recordkeeping", "income", "expenses", "invoices", "receipts", "bank"] },
    ],
    title: "A Practical Small-Business Recordkeeping Checklist",
    description: "Build a repeatable small-business recordkeeping routine for income, expenses, invoices, receipts, reconciliations and financial reviews.",
    sections: [
      ["Why records matter", "Good records help an owner understand business activity, prepare financial statements and support the entries recorded in the books. The IRS says a business may choose a recordkeeping system suited to its activity, provided it clearly shows income and expenses. That is US federal guidance; businesses elsewhere should check their own local requirements."],
      ["What to capture", "For each transaction, keep enough information to identify what happened, when it happened, who was involved, the amount and the business purpose. Supporting documents can include invoices, receipts, paid bills, deposit records and bank statements. A document should be organized so that it can be connected to the relevant entry."],
      ["A repeatable weekly routine", "1. Record sales and other income close to the transaction date.\n2. Record business purchases and expenses with clear descriptions.\n3. Attach or file supporting documents.\n4. Review unpaid customer invoices and supplier bills.\n5. Compare recorded transactions with bank and payment statements.\n6. Investigate missing, duplicated or unclear entries.\n7. Review summary reports and follow up on questions."],
      ["Keep records usable", "Choose a system that fits the size and complexity of the business. Use consistent categories, avoid mixing unrelated personal and business activity in the same record, and make a backup of important digital records. The key is a routine that is maintained, not a complicated process that is abandoned."],
      ["When software can help", "A spreadsheet can be enough for a very small operation with few transactions, provided it is kept consistently. As invoice volume, expenses or reporting needs grow, accounting software may make it easier to keep transaction records and review financial reports. Compare the specific features, export options, access controls and limits before choosing a tool."],
    ],
    claimSpecs: [
      { id: "records-purpose", text: "Good records help identify income sources, track expenses and prepare financial statements.", terms: ["records", "income", "expenses", "financial statements"], sourceIndexes: [0] },
      { id: "recordkeeping-system", text: "A suitable recordkeeping system should clearly show business income and expenses.", terms: ["recordkeeping", "income", "expenses"], sourceIndexes: [1] },
      { id: "supporting-documents", text: "Invoices, receipts and bank records can support entries in business books.", terms: ["invoices", "receipts", "bank"], sourceIndexes: [1] },
    ],
    productMention: "recordkeeping",
    related: ["complete-guide-to-small-business-accounting", "how-to-keep-track-of-business-expenses", "small-business-bookkeeping-checklist"],
  },
  {
    id: "cashflow",
    supportedIntents: ["How-to/tutorial", "Accounting education", "Bookkeeping guidance"],
    subjectCoverage: ["cash flow", "cash flow forecast", "working capital", "cash flow projection"],
    audience: "Small-business owners and operators",
    jurisdiction: "United States and Australia; claims must identify the applicable jurisdiction",
    approvedSourceTypes: ["OFFICIAL_GOVERNMENT"],
    match: /cash.?flow|cash flow forecast|cash flow projection|working capital/i,
    intent: "Informational",
    sources: [
      { url: "https://www.sba.gov/counseling/manage-your-business/", expectedPublisher: "U.S. Small Business Administration", supports: ["A balance sheet helps track capital and supports cash-flow projections"], terms: ["balance sheet", "cash flow", "projection", "capital"] },
      { url: "https://business.gov.au/guide/guide-to-managing-cash-flow", expectedPublisher: "Australian Government business.gov.au", supports: ["Record sales and costs, invoice promptly, follow up unpaid invoices and choose payment terms"], terms: ["cash flow", "sales", "costs", "invoice", "payment terms", "unpaid"] },
    ],
    title: "How to Build a Practical Small-Business Cash Flow Forecast",
    description: "Learn how to forecast cash coming in and going out, review timing gaps and update a small-business cash flow plan.",
    sections: [
      ["Start with timing, not just profit", "Cash flow is about when money enters and leaves the business. A sale recorded today may not be collected until later, while rent, suppliers and other bills may be due sooner. A useful forecast therefore tracks expected dates as well as amounts."],
      ["Set up the forecast", "Choose a regular planning period that suits the business. List the opening cash balance, expected customer receipts, other expected inflows, operating payments, supplier bills, payroll and other known outflows. Use the due dates and the best available evidence for each estimate. Mark uncertain receipts separately instead of treating them as guaranteed."],
      ["Update it every week", "1. Replace estimates with actual receipts and payments.\n2. Move delayed customer payments to a realistic expected date.\n3. Add new bills and planned purchases.\n4. Compare the forecast balance with the payments due.\n5. Investigate any week where expected outflows exceed available cash.\n6. Record the decision and update the forecast."],
      ["Use financial records to improve the forecast", "A balance sheet provides a snapshot of assets, liabilities and equity. The U.S. Small Business Administration explains that it can help a business track capital and support cash-flow projections. Keep the forecast connected to current records, but do not confuse a forecast with a guarantee: estimates change when customers pay late, costs change or plans move."],
      ["Make the forecast useful", "Separate confirmed payments from uncertain ones, explain large assumptions, and compare actual results with the prior forecast. A forecast is most useful when it is updated as new information arrives and when the owner acts on timing problems early."],
    ],
    claimSpecs: [
      { id: "balance-sheet-forecast", text: "A balance sheet can help a business track capital and support cash-flow projections.", terms: ["balance sheet", "capital", "cash flow", "projection"], sourceIndexes: [0] },
      { id: "cashflow-practices", text: "Keeping records of sales and costs, invoicing promptly and following up unpaid invoices are practical cash-flow management steps.", terms: ["sales", "costs", "invoice", "cash flow"], sourceIndexes: [1] },
    ],
    productMention: "cashflow",
    related: ["13-week-cash-flow-forecast-template", "cash-flow-forecasting-small-business", "small-business-cash-flow-management"],
  },
  {
    id: "receivables",
    supportedIntents: ["How-to/tutorial", "Bookkeeping guidance"],
    subjectCoverage: ["unpaid invoice", "invoice payment", "accounts receivable", "payment terms"],
    audience: "Small-business owners and operators",
    jurisdiction: "United Kingdom for legal payment obligations; general process guidance otherwise",
    approvedSourceTypes: ["OFFICIAL_GOVERNMENT"],
    match: /late payment|unpaid invoice|invoice payment|accounts receivable|collect invoice/i,
    intent: "Informational",
    sources: [
      { url: "https://www.smallbusinesscommissioner.gov.uk/help-and-guidance/all-advice/building-good-payment-practice-in-your-new-business/", expectedPublisher: "Office of the Small Business Commissioner (UK)", supports: ["Agree payment terms in writing, invoice promptly and monitor invoice status"], terms: ["payment terms", "invoice", "payment status", "cash flow"] },
      { url: "https://www.gov.uk/invoicing-and-taking-payment-from-customers/payment-obligations", expectedPublisher: "GOV.UK", supports: ["UK payment obligations depend on agreed payment dates and specific legal conditions"], terms: ["payment date", "30 days", "late payment", "interest"] },
    ],
    title: "A Practical System for Following Up Unpaid Business Invoices",
    description: "Create a consistent invoice follow-up process: confirm payment terms, send complete invoices, monitor due dates and resolve delays professionally.",
    sections: [
      ["Make payment expectations clear", "Agree payment terms before work begins and put them in the contract or written agreement. Confirm who receives the invoice, which details are required and how it should be submitted. Payment terms and legal rights vary by jurisdiction, so do not copy another country's rules without checking local guidance."],
      ["Send an invoice that can be processed", "Invoice promptly after the agreed delivery point. Include the invoice number, date, clear description of the work, amount, agreed due date and payment instructions. Ask whether a purchase-order number or a particular portal is required. Keep a copy and note when the customer acknowledges receipt."],
      ["Use a simple follow-up schedule", "1. Record the invoice and its due date when it is sent.\n2. Check that the correct person or finance team received it.\n3. Send a courteous reminder before the due date when appropriate.\n4. If it becomes overdue, confirm that there is no dispute or missing information.\n5. Contact the customer professionally and agree the next update date.\n6. Record the response and any revised payment commitment."],
      ["Review the receivables list", "Keep a list of unpaid invoices with the customer, invoice date, due date, amount, current status and next follow-up action. Review it regularly. This makes it easier to distinguish a simple processing delay from a disputed invoice or a customer who needs a different conversation."],
      ["Understand local payment rules", "The UK government publishes payment-obligation guidance for UK business transactions. It describes how agreed payment dates and statutory rules interact. That guidance is specific to the UK and should not be treated as legal advice or applied automatically in another country. Check the rules that apply to the business and contract."],
    ],
    claimSpecs: [
      { id: "invoice-process", text: "Agree payment terms in writing, send invoices promptly and monitor invoice status to support payment processes.", terms: ["payment terms", "invoice", "payment status"], sourceIndexes: [0] },
      { id: "uk-payment-rules", text: "UK payment obligations depend on agreed payment dates and the applicable statutory rules.", terms: ["payment date", "late payment", "30 days"], sourceIndexes: [1], jurisdiction: "United Kingdom" },
    ],
    productMention: "receivables",
    related: ["accounts-receivable-management", "reducing-late-invoice-payments", "how-to-create-an-invoice"],
  },
  {
    id: "break-even",
    supportedIntents: ["Accounting education", "How-to/tutorial"],
    subjectCoverage: ["break-even", "fixed costs", "variable costs", "contribution margin"],
    audience: "Small-business owners and operators",
    jurisdiction: "United States; general arithmetic concepts only",
    approvedSourceTypes: ["OFFICIAL_GOVERNMENT"],
    match: /break[- ]even|fixed costs.*variable costs/i,
    intent: "Informational",
    sources: [
      { url: "https://www.sba.gov/counseling/plan-your-business/", expectedPublisher: "U.S. Small Business Administration", supports: ["Break-even units use fixed costs, selling price and variable costs per unit"], terms: ["break-even point", "fixed costs", "variable costs", "price"] },
      { url: "https://legacy.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point", expectedPublisher: "U.S. Small Business Administration", supports: ["The break-even point is where total cost equals total revenue, with no loss or gain"], terms: ["break-even point", "total cost", "total revenue", "contribution margin", "price", "variable costs", "semi-variable costs", "fixed costs", "estimate", "not intended"] },
    ],
    title: "Break-Even Analysis for a Small Business: Formula and Example",
    description: "Learn how to calculate a small-business break-even point using fixed costs, selling price and variable costs, then interpret the result for planning.",
    sections: [
      ["What the break-even point tells you", "The break-even point is where total costs and total revenue are equal. At that point, the business has neither a profit nor a loss from the activity being measured. It is a planning measure that helps an owner understand the sales level needed to cover the costs included in the calculation."],
      ["Identify the inputs", "Start by separating fixed costs from variable costs. Fixed costs are tied to a time period and generally do not change with sales volume over that period. Variable costs change with the number of units or services delivered. If a cost has both fixed and variable elements, separate the parts where possible rather than counting the full amount twice."],
      ["Use the break-even formula", "For a single product or service, the break-even point in units is calculated as: fixed costs divided by the selling price per unit minus variable cost per unit. The difference between selling price and variable cost is the contribution per unit. Make sure all figures use the same time period."],
      ["Example: calculate a break-even point", "Example (illustrative figures only): suppose monthly fixed costs are $2,000, the selling price is $50 per unit and variable cost is $30 per unit. The contribution per unit is $20. Dividing $2,000 by $20 gives a break-even point of 100 units for that period. This is a worked arithmetic example, not an industry benchmark or a forecast for a real business."],
      ["Check the assumptions before using the result", "A break-even calculation is only as useful as the inputs. Include relevant costs, use a consistent time period, distinguish fixed from variable costs and review any semi-variable costs. The single-product formula may not describe a business that sells several products or services with different prices and costs."],
      ["Use break-even analysis as one planning tool", "The result can help frame pricing and sales targets, but it is not a guarantee that a business will reach that level of sales. Update the inputs when costs, prices or the product mix change, and use the calculation alongside current financial records and other planning information."],
    ],
    claimSpecs: [
      { id: "break-even-definition", text: "The break-even point is where total costs and total revenue are equal, resulting in no loss or gain.", terms: ["break-even point", "total cost", "total revenue"], sourceIndexes: [1] },
      { id: "break-even-formula", text: "For one product or service, break-even units use fixed costs divided by selling price less variable cost per unit.", terms: ["fixed costs", "price", "variable costs"], sourceIndexes: [0] },
      { id: "break-even-contribution", text: "Contribution margin is based on the difference between selling price and variable cost.", terms: ["contribution margin", "price", "variable costs"], sourceIndexes: [1] },
      { id: "semi-variable-costs", text: "Semi-variable costs combine fixed and variable components, which should be separated when possible.", terms: ["semi-variable costs", "fixed costs", "variable costs"], sourceIndexes: [1] },
      { id: "break-even-estimate", text: "A break-even calculation is an estimate and is not an exact accounting or financing outcome.", terms: ["estimate", "not intended"], sourceIndexes: [1] },
    ],
    related: ["how-to-create-a-business-budget", "profit-and-loss-statement-small-business", "financial-ratios-for-small-business"],
  },
];

const ACTIVE_SOURCE_PACK_IDS = new Set(editorialBacklog.activePackIds);
const UNKNOWN_BACKLOG_PACKS = [...ACTIVE_SOURCE_PACK_IDS].filter(id => !SOURCE_PACKS.some(pack => pack.id === id));
if (UNKNOWN_BACKLOG_PACKS.length) throw new Error(`Editorial backlog references missing source packs: ${UNKNOWN_BACKLOG_PACKS.join(", ")}`);

const VERIFIED_PRODUCT = Object.freeze({
  checkedAtCommit: productCapabilityRecord.verifiedAtCommit,
  sourceFiles: productCapabilityRecord.sourceFiles,
  verifiedCapabilities: productCapabilityRecord.capabilities
    .filter(item => item.status === "VERIFIED")
    .map(item => ({ name:item.name, plan:item.plan, source:item.sourceFile, evidence:item.evidence, articleClaimAllowed:item.articleClaimAllowed === true })),
  explicitlyNotVerifiedOrExcluded: productCapabilityRecord.notApprovedForClaims,
});

function cleanText(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
}
function htmlMeta(html, pattern) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (pattern.test(tag)) return tag.match(/content=["']([^"']+)["']/i)?.[1] || null;
  }
  return null;
}
function sourcePublisher(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host.endsWith("sba.gov")) return "U.S. Small Business Administration";
  const publishers = {
    "irs.gov":"Internal Revenue Service",
    "business.gov.au":"Australian Government business.gov.au",
    "gov.uk":"GOV.UK",
    "smallbusinesscommissioner.gov.uk":"Office of the Small Business Commissioner (UK)",
    "waveapps.com":"Wave",
    "zoho.com":"Zoho",
    "zipbooks.com":"ZipBooks",
    "finflowtrack.com":"FinFlow Track",
  };
  return publishers[host] || host;
}
function sourceReliability(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (/(^|\.)((irs|sba)\.gov|business\.gov\.au|gov\.uk|smallbusinesscommissioner\.gov\.uk)$/.test(host)) return "OFFICIAL_GOVERNMENT";
  if (["waveapps.com","zoho.com","zipbooks.com","finflowtrack.com"].some(domain => host === domain || host.endsWith(`.${domain}`))) return "OFFICIAL_VENDOR";
  return "UNVERIFIED_PUBLISHER";
}
function dateFromHtml(html) {
  const raw = htmlMeta(html, /property=["']article:published_time["']/i)
    || htmlMeta(html, /name=["']datePublished["']/i)
    || html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1]
    || null;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
function excerptFor(text, terms) {
  const lower = text.toLowerCase();
  let index = -1;
  for (const term of terms) { const found = lower.indexOf(term.toLowerCase()); if (found >= 0 && (index < 0 || found < index)) index = found; }
  if (index < 0) return null;
  const start = Math.max(0, index - 90);
  const snippet = text.slice(start, Math.min(text.length, start + 360)).trim();
  return snippet.split(/\s+/).slice(0, MAX_EXCERPT_WORDS).join(" ");
}
export function classifySearchIntent(query) {
  const value = String(query || "").trim().toLowerCase();
  if (!value) return "REVIEW_REQUIRED";
  if (/login|sign in|website|support contact|customer service/.test(value)) return "Navigational";
  if (/create account|download|sign up|start free|register/.test(value)) return "Transactional";
  if (/pricing|price|cost|alternatives?|cheaper|free alternative/.test(value)) return "Pricing and alternatives";
  if (/(free|best|top|which|recommend|compare|worth considering).{0,55}(accounting|bookkeeping).{0,45}(software|app|platform|program|tool)/.test(value)
    || /(accounting|bookkeeping).{0,45}(software|apps?|platforms?|programs?|tools?).{0,45}(best|free|compare|review|recommend|worth)/.test(value)
    || /software selection|accounting software comparison/.test(value)) return "Software selection";
  if (/reporting features?|track invoices?|track sales|expense tracking|invoice tracking|features? of/.test(value)) return "Feature evaluation";
  if (/\b(?:how to|step[- ]by[- ]step|tutorial|template|checklist|guide|create|build|set up|track(?:ing)?|manage(?:ment|ing)?)\b/.test(value)) return "How-to/tutorial";
  if (/cash.{0,25}accrual|accrual.{0,25}cash|cash method|accrual method/.test(value)) return "Accounting education";
  if (/bank reconciliation|reconcil(?:e|ing).*bank|bank.*reconcil/.test(value)) return "Bookkeeping guidance";
  if (/journal.{0,25}ledger|ledger.{0,25}journal|general ledger|accounting journal/.test(value)) return "Bookkeeping guidance";
  if (/bookkeep|recordkeeping|financial records|receipts?|ledger|transaction records/.test(value)) return "Bookkeeping guidance";
  if (/what is|meaning of|definition|accounting basics|formula|calculate|principles of|accounting education/.test(value)) return "Accounting education";
  return "REVIEW_REQUIRED";
}

export function selectCompatibleSourcePack(query, intent) {
  const matchedPacks = SOURCE_PACKS.filter(pack => ACTIVE_SOURCE_PACK_IDS.has(pack.id)
    && (pack.match.test(String(query || "")) || pack.subjectCoverage?.some(term => String(query || "").toLowerCase().includes(term.toLowerCase()))));
  const matchedPack = matchedPacks.find(pack => pack.supportedIntents?.includes(intent)) || matchedPacks[0] || null;
  if (intent === "REVIEW_REQUIRED") {
    return { pack: null, matchedPackId: matchedPack?.id || null, compatible: false, reason: "AMBIGUOUS_INTENT_REQUIRES_HUMAN_REVIEW" };
  }
  if (!matchedPack) {
    return { pack: null, matchedPackId: null, compatible: false, reason: "NO_APPROVED_SOURCE_PACK_FOR_INTENT" };
  }
  if (!matchedPack.supportedIntents?.includes(intent)) {
    return { pack: null, matchedPackId: matchedPack.id, compatible: false, reason: "SOURCE_PACK_INTENT_INCOMPATIBLE" };
  }
  return { pack: matchedPack, matchedPackId: matchedPack.id, compatible: true, reason: null };
}
export function freshnessFor(opportunity, now = new Date()) {
  const end = opportunity.reportingPeriodEnd || opportunity.dateRange?.endDate || opportunity.evidence?.dateRange?.endDate || null;
  if (!end) return { status: "UNKNOWN", ageDays: null, reportingPeriodEnd: null };
  const time = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(time)) return { status: "INVALID", ageDays: null, reportingPeriodEnd: end };
  const ageDays = Math.floor((now.getTime() - time) / 86400000);
  return { status: ageDays < 0 ? "FUTURE" : ageDays > STALE_AFTER_DAYS ? "STALE" : "FRESH", ageDays, reportingPeriodEnd: end };
}
export function findUnsupportedNumericClaims(markdown) {
  const withoutIllustrativeExamples = String(markdown || "").replace(
    /Example \(illustrative figures only\):[\s\S]*?(?=\n## |\n### |$)/i,
    " ",
  );
  const normalized = withoutIllustrativeExamples.replace(/^\s*\d+\.\s+/gm," ");
  const pattern = /(?:[$€£]\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:%|percent|customers?|users?|businesses?|days?|weeks?|months?|years?|units?)\b)/gi;
  return [...normalized.matchAll(pattern)].map(match => match[0]);
}
export function detectUnsupportedNumericClaims(markdown) {
  return findUnsupportedNumericClaims(markdown).length > 0;
}
function normalizeNumericToken(value) {
  return String(value || "").replace(/[^0-9.]/g, "").replace(/,/g, "");
}
export function assessNumericClaims(markdown, claims = [], sourceRecords = []) {
  const tokens = findUnsupportedNumericClaims(markdown);
  const verified = [];
  const unsupported = [];
  for (const token of tokens) {
    const normalized = normalizeNumericToken(token);
    const supported = claims.some(claim => {
      const claimHasNumber = findUnsupportedNumericClaims(claim.text).some(value => normalizeNumericToken(value) === normalized);
      if (!claimHasNumber) return false;
      return (claim.sourceUrls || []).some(url => {
        const source = sourceRecords.find(item => item.url === url);
        return (source?.numericTokens || []).some(value => normalizeNumericToken(value) === normalized);
      });
    });
    (supported ? verified : unsupported).push(token);
  }
  return { verified, unsupported };
}

export async function retrieveSource(source, { fetchImpl = fetch, now = new Date() } = {}) {
  const retrievedAt = now.toISOString();
  const baseRecord = {
    url: source.url,
    expectedPublisher: source.expectedPublisher || sourcePublisher(source.url),
    retrievedAt,
    publishedAt: null,
    sourceTitle: null,
    excerpt: null,
    supportedClaims: [],
    termMatches: [],
    httpStatus: null,
    responseStatus: null,
    contentType: null,
    finalUrl: source.url,
    redirectDestination: null,
    relevanceAssessment: null,
    verificationStatus: "RESEARCH_REQUIRED",
    reliability: sourceReliability(source.url),
  };
  try {
    const response = await fetchImpl(source.url, {
      redirect: "follow",
      headers: { "user-agent": "FinFlowTrack-EditorialResearch/1.0 (+https://www.finflowtrack.com)" },
    });
    const finalUrl = response.url || source.url;
    const contentType = (response.headers?.get?.("content-type") || "").split(";")[0].trim().toLowerCase() || null;
    const publisher = sourcePublisher(finalUrl);
    const basePublisher = sourcePublisher(source.url);
    const common = {
      ...baseRecord,
      publisher,
      httpStatus: response.status,
      responseStatus: response.status,
      contentType,
      finalUrl,
      redirectDestination: finalUrl !== source.url ? finalUrl : null,
    };
    if (!response.ok) {
      return { ...common, status: "UNAVAILABLE", verificationStatus: "REJECTED", error: `HTTP_${response.status}` };
    }
    if (!/^https:\/\//i.test(finalUrl) || publisher !== basePublisher) {
      return {
        ...common, status: "UNAVAILABLE", verificationStatus: "REJECTED",
        error: "UNEXPECTED_REDIRECT_OR_PUBLISHER_MISMATCH",
      };
    }
    if (!contentType || !["text/html", "application/xhtml+xml"].includes(contentType)) {
      return { ...common, status: "UNAVAILABLE", verificationStatus: "REJECTED", error: "UNSUPPORTED_CONTENT_TYPE" };
    }
    const html = await response.text();
    const text = cleanText(html);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || null;
    const excerpt = excerptFor(text, source.terms || []);
    const termMatches = (source.terms || []).filter(term => text.toLowerCase().includes(term.toLowerCase()));
    const numericTokens = findUnsupportedNumericClaims(text);
    const requiredTermCount = Math.min(2, (source.terms || []).length);
    const keywordMatchPass = requiredTermCount > 0 && termMatches.length >= requiredTermCount && Boolean(excerpt);
    return {
      ...common,
      sourceTitle: title || source.expectedPublisher || source.url,
      publishedAt: dateFromHtml(html),
      excerpt,
      termMatches,
      numericTokens,
      status: keywordMatchPass ? "RETRIEVED_RELEVANT" : "RETRIEVED_RELEVANCE_UNCONFIRMED",
      verificationStatus: keywordMatchPass ? "KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED" : "RESEARCH_REQUIRED",
      relevanceAssessment: {
        method: "KEYWORD_SCREENING_ONLY",
        matchedTerms: termMatches,
        requiredTermCount,
        keywordMatchPass,
        note: "Keyword occurrence does not establish factual support or semantic entailment; material claims require human review.",
      },
      supportedClaims: keywordMatchPass ? (source.supports || []) : [],
      limitations: [
        "Automated relevance uses keyword matching, not semantic fact-checking.",
        "Publication date is null when the source page does not expose a parseable date.",
        "A passing keyword screen is not SOURCE_VERIFIED.",
      ],
    };
  } catch (error) {
    return {
      ...baseRecord, publisher: baseRecord.expectedPublisher,
      status: "UNAVAILABLE", verificationStatus: "REJECTED",
      error: String(error.message || error),
    };
  }
}
function tokenize(value) {
  return new Set(String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(word => word.length > 2 && !["the","and","for","with","how","what","your","from","that","this","small","business"].includes(word)));
}
function similarity(a, b) {
  const aa = tokenize(a), bb = tokenize(b);
  if (!aa.size || !bb.size) return 0;
  let overlap = 0; for (const token of aa) if (bb.has(token)) overlap += 1;
  return overlap / (aa.size + bb.size - overlap);
}
export async function loadInventory({ contentDir = CONTENT_DIR } = {}) {
  const files = (await readdir(contentDir)).filter(file => file.endsWith(".md"));
  const items = [];
  for (const file of files) {
    const raw = await readFile(path.join(contentDir, file), "utf8");
    const parsed = matter(raw);
    const data = parsed.data || {};
    items.push({ file, slug: data.slug || file.replace(/\.md$/, ""), title: data.title || file, description: data.description || "", tags: Array.isArray(data.tags) ? data.tags : [], content: parsed.content, markdown: raw });
  }
  return items;
}
export function analyzeCannibalization(query, inventory, targetUrl = null) {
  let targetSlug = null;
  try { targetSlug = targetUrl ? new URL(targetUrl).pathname.split("/").filter(Boolean).pop() : null; }
  catch { targetSlug = null; }
  const queryIntent = classifySearchIntent(query);
  const scored = inventory.map(item => {
    const metadataText = [item.title, item.description, item.slug, ...(item.tags || [])].join(" ");
    const fullText = String(item.content || "");
    const metadataScore = similarity(query, metadataText);
    const fullTextScore = similarity(query, fullText);
    const score = Math.max(metadataScore, fullTextScore);
    const existingIntent = classifySearchIntent([item.title, item.description, item.slug].join(" "));
    return {
      slug: item.slug, title: item.title,
      score: Number(score.toFixed(3)),
      metadataScore: Number(metadataScore.toFixed(3)),
      fullTextScore: Number(fullTextScore.toFixed(3)),
      existingIntent,
      intentMatch: existingIntent === queryIntent && existingIntent !== "REVIEW_REQUIRED",
      url: `https://www.finflowtrack.com/blog/${item.slug}`,
      exactTarget: item.slug === targetSlug,
    };
  }).sort((a,b) => b.score-a.score);
  const exactTarget = scored.find(item => item.exactTarget) || null;
  const strongest = scored[0] || null;
  const inferredTarget = !exactTarget && strongest?.score >= 0.42 ? strongest : null;
  const target = exactTarget || inferredTarget;
  const conflict = Boolean(target);
  const targetQueryMatch = !target ? "NO_STRONG_MATCH"
    : exactTarget && !target.intentMatch ? "EXACT_LANDING_PAGE_REVIEW_REQUIRED"
    : exactTarget ? "EXACT_LANDING_PAGE_INTENT_MATCH"
    : "INFERRED_EXISTING_INTENT_MATCH";
  const decision = conflict ? "UPDATE_EXISTING_ARTICLE" : "NEW_ARTICLE_CANDIDATE";
  return {
    status: conflict ? "EXISTING_INTENT_MATCH" : "NO_STRONG_MATCH",
    decision,
    editorialDecision: targetQueryMatch === "EXACT_LANDING_PAGE_REVIEW_REQUIRED" || Boolean(inferredTarget)
      ? "HUMAN_REVIEW_REQUIRED" : decision,
    requiresHumanReview: targetQueryMatch === "EXACT_LANDING_PAGE_REVIEW_REQUIRED" || Boolean(inferredTarget),
    queryIntent,
    target,
    targetQueryMatch,
    related: scored.slice(0,5),
    unresolved: !exactTarget && Boolean(inferredTarget),
    method: "Full article text, title, description, slug, tags and query intent are compared; exact GSC landing-page URLs take precedence. Similarity is screening only and does not establish semantic originality.",
  };
}
function buildDraft(candidate, pack, sourceRecords, productEvidence, internalLinks, target, now, existingArticle = null) {
  const sourceLines = sourceRecords.filter(s => s.status === "RETRIEVED_RELEVANT")
    .map(s => `- [${s.publisher}: ${s.sourceTitle}](${s.url})`).join("\n");
  const productLine = productEvidence
    ? "\n\nFinFlow Track's Free plan includes invoice creation, expense tracking, customer management and basic reports. Check the current [plan details](/pricing) and confirm that the available limits fit your workflow.\n"
    : "";
  const links = internalLinks.map(item => `- [${item.title}](/blog/${item.slug})`).join("\n");
  const comparisonTable = pack.id === "software-selection" ? [
    "| Product | What the free plan lists | Limits or costs to verify |",
    "| --- | --- | --- |",
    "| FinFlow Track | Invoice creation, expense tracking, customer management and basic reports | Confirm the current plan limits and whether the required workflow is included |",
    "| Wave Starter | Unlimited estimates, invoices, bills and bookkeeping records | Payment processing fees may apply; automated bank imports and receipt capture are paid features |",
    "| Zoho Books US Free | Invoices, expenses, P&L, Balance Sheet and reports | One-user allowance; US edition only; confirm current eligibility and plan limits on the provider page |",
    "| ZipBooks Starter | Unlimited invoices, vendors and customers, basic reports and one bank account | Recurring invoices, multiple bank accounts and team features require checking higher tiers |",
  ].join("\n") : "";
  const claims = pack.claimSpecs.map(spec => {
    const mappedSources = spec.sourceIndexes.map(index => sourceRecords[index]).filter(Boolean);
    const termsVerified = spec.terms.every(term => mappedSources.some(source => source.termMatches?.some(match => match.toLowerCase() === term.toLowerCase())));
    const sourcesVerified = mappedSources.length > 0 && mappedSources.every(source => source.status === "RETRIEVED_RELEVANT");
    return {
      id: spec.id, text: spec.text, sourceUrls: mappedSources.map(source => source.url),
      verificationStatus: termsVerified && sourcesVerified ? "KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED" : "UNVERIFIED",
      jurisdiction: spec.jurisdiction || null,
    };
  });
  if (productEvidence) claims.push({
    id: "finflow-free-plan-capabilities",
    text: "FinFlow Track's Free plan includes invoice creation, expense tracking, customer management and basic reports.",
    type: "product", capability: "Invoice creation, expense tracking, customer management and basic reports (Free plan)",
    sourceUrls: ["https://www.finflowtrack.com/pricing"],
    verificationStatus: "VERIFIED_IN_CURRENT_REPOSITORY_SOURCE",
  });
  const evidence = sourceRecords.filter(s => s.status.startsWith("RETRIEVED")).map(s => ({
    sourceUrl: s.url, finalUrl: s.finalUrl, redirectDestination: s.redirectDestination,
    sourceType: s.reliability === "OFFICIAL_GOVERNMENT" ? "official_government" : "official_vendor",
    sourceTitle: s.sourceTitle, publisher: s.publisher, publishedAt: s.publishedAt, retrievedAt: s.retrievedAt,
    httpStatus: s.httpStatus, responseStatus: s.responseStatus, contentType: s.contentType,
    verificationStatus: s.verificationStatus, relevanceAssessment: s.relevanceAssessment,
    numericTokens: s.numericTokens || [],
    verifiedAt: s.retrievedAt.slice(0,10), supports: s.supportedClaims.join("; "),
    excerpt: s.excerpt, reliability: s.reliability, limitations: s.limitations,
  }));
  if (productEvidence) evidence.push({
    sourceUrl: "https://www.finflowtrack.com/pricing", sourceType: "first_party_product_documentation",
    sourceTitle: "FinFlow Track pricing page and feature catalog", publisher: "FinFlow Track",
    publishedAt: null, retrievedAt: now.toISOString(), verifiedAt: now.toISOString().slice(0,10),
    supports: "Free plan feature list in src/routes/pricing.tsx; plan gating in src/lib/features/catalog.ts",
    excerpt: null, reliability: "FIRST_PARTY_REPOSITORY_VERIFIED",
    limitations: ["Verified against repository source, not a live authenticated account."],
  });

  let markdown;
  if (candidate.operationType === "EXISTING_ARTICLE_UPDATE" && existingArticle?.markdown) {
    const parsed = matter(existingArticle.markdown);
    const existingBody = parsed.content || "";
    const heading = pack.updateSectionHeading || "## Updated plan details";
    const updatedSection = [
      heading,
      "",
      comparisonTable,
      ...pack.sections.map(([sectionHeading, body]) => `### ${sectionHeading}\n\n${body}`),
      productLine,
      "### Official plan references",
      sourceLines,
      "",
      "Plan features, payment fees and eligibility can change. Recheck the provider's official page and the terms for your country before choosing.",
    ].join("\n\n");
    const headingIndex = existingBody.indexOf(heading);
    let updatedBody;
    if (headingIndex >= 0) {
      const nextHeadingIndex = existingBody.indexOf("\n## ", headingIndex + heading.length);
      const sectionEnd = nextHeadingIndex >= 0 ? nextHeadingIndex : existingBody.length;
      updatedBody = existingBody.slice(0, headingIndex) + updatedSection + existingBody.slice(sectionEnd);
    } else {
      const firstSectionIndex = existingBody.indexOf("\n## ");
      const insertAt = firstSectionIndex >= 0 ? firstSectionIndex : existingBody.length;
      updatedBody = existingBody.slice(0, insertAt) + "\n\n" + updatedSection + existingBody.slice(insertAt);
    }
    const original = parsed.data || {};
    const tags = [...new Set([...(Array.isArray(original.tags) ? original.tags : []), "software selection", "free accounting software"])];
    const frontmatter = {
      ...original,
      title: pack.title,
      description: pack.description,
      slug: target.slug,
      tags,
      updatedAt: now.toISOString().slice(0,10),
      draft: true,
      status: "draft",
      publicationStatus: "draft",
    };
    markdown = matter.stringify(updatedBody, frontmatter);
  } else {
    const sections = pack.sections.map(([heading, body]) => `## ${heading}\n\n${body}`).join("\n\n");
    markdown = `---\ntitle: "${pack.title.replace(/"/g, '\\\"')}"\ndescription: "${pack.description.replace(/"/g, '\\\"')}"\nslug: "${target.slug}"\nstatus: "draft"\npublicationStatus: "draft"\ncategory: "small-business-finance"\ntags:\n  - small business\n  - ${pack.id}\n---\n\n# ${pack.title}\n\nA reliable process is easier to maintain when each step has a clear purpose and an owner. This guide focuses on practical routines rather than promises or one-size-fits-all rules.\n\n${sections}\n${productLine}\n## Related FinFlow Track guides\n\n${links}\n\n## Sources and scope\n\n${sourceLines}\n\nRequirements differ by country, contract and business structure. Government sources cited here are provided for the jurisdiction they cover; they are not a substitute for local professional advice.\n`;
  }
  return {
    title: pack.title, description: pack.description, slug: target.slug,
    publicationStatus: "draft", status: "draft", author: null, authorStatus: "NOT_ASSIGNED",
    intent: pack.intent, targetQuery: candidate.targetQuery, relatedQueries: candidate.relatedQueries || [],
    operationType: candidate.operationType || "EXISTING_ARTICLE_UPDATE", targetSlug: target.slug,
    canonicalUrl: `https://www.finflowtrack.com/blog/${target.slug}`,
    content: markdown, evidence, claims, productEvidence: productEvidence ? VERIFIED_PRODUCT : null,
    internalLinks, sourceRecords, candidate,
  };
}
export async function runResearchPipeline({
  opportunities, contentDir = CONTENT_DIR, outputDir = RESEARCH_DIR,
  fetchImpl = fetch, now = new Date(), store = createSupabaseSeoStoreFromEnv(process.env),
  allowFixture = false,
  articleGenerator = createArticleGeneratorFromEnv(process.env),
  articleOutputDir = path.join(outputDir, "article-production"),
} = {}) {
  if (!Array.isArray(opportunities)) throw new Error("Research pipeline requires an opportunities array.");
  const inventory = await loadInventory({ contentDir });
  await mkdir(outputDir, { recursive: true });
  const results = [];
  for (const raw of opportunities) {
    const queryRows = raw.evidence?.sampleQueries || [];
    const queryRow = queryRows.find(row => row.query === raw.queryText) || queryRows[0] || null;
    const candidate = {
      id: raw.id || raw.opportunityKey || null,
      persistedOpportunityId: raw.persistedOpportunityId || null,
      sourceCollectionRunId: raw.sourceCollectionRunId || null,
      sourceCollectionAt: raw.sourceCollectionAt || raw.evidence?.sourceCollectionAt || null,
      reportingPeriod: raw.reportingPeriod || raw.evidence?.dateRange || null,
      targetUrl: raw.targetUrl || null,
      targetQuery: raw.targetQuery || raw.queryText || queryRow?.query || "",
      relatedQueries: raw.relatedQueries || queryRows.map(row => row.query).filter(Boolean).slice(1,6),
      metrics: {
        impressions: raw.metrics && Object.hasOwn(raw.metrics,"impressions") ? raw.metrics.impressions : queryRow && Object.hasOwn(queryRow,"impressions") ? queryRow.impressions : raw.evidence?.impressions ?? null,
        clicks: raw.metrics && Object.hasOwn(raw.metrics,"clicks") ? raw.metrics.clicks : queryRow && Object.hasOwn(queryRow,"clicks") ? queryRow.clicks : raw.evidence?.clicks ?? null,
        ctr: raw.metrics && Object.hasOwn(raw.metrics,"ctr") ? raw.metrics.ctr : queryRow && Object.hasOwn(queryRow,"ctr") ? queryRow.ctr : raw.evidence?.ctr ?? null,
        averagePosition: raw.metrics && Object.hasOwn(raw.metrics,"averagePosition") ? raw.metrics.averagePosition : queryRow && Object.hasOwn(queryRow,"position") ? queryRow.position : raw.evidence?.averagePosition ?? null,
      },
      reportingPeriodEnd: raw.reportingPeriodEnd || raw.evidence?.dateRange?.endDate || raw.dateRange?.endDate || null,
      dataSource: raw.dataSource || raw.evidence?.source || "UNKNOWN",
      evidenceMode: raw.evidenceMode || (raw.dataSource === "TEST_FIXTURE" ? "FIXTURE" : "LIVE_OR_PERSISTED"),
      historicalProvenance: raw.historicalProvenance || raw.evidence?.historicalProvenance || null,
    };
    const freshness = freshnessFor(candidate, now);
    const intent = classifySearchIntent(candidate.targetQuery);
    const cannibalization = analyzeCannibalization(candidate.targetQuery, inventory, candidate.targetUrl);
    const base = { candidate, intent, freshness, cannibalization, draft: null, quality: null, rejectionReasons: [], editorialReviewQuestions: [] };
    base.editorialDecision = cannibalization.editorialDecision;
    base.humanReviewRequired = cannibalization.requiresHumanReview;
    if (cannibalization.targetQueryMatch === "EXACT_LANDING_PAGE_REVIEW_REQUIRED") {
      base.editorialReviewQuestions.push("The exact GSC landing page is an existing article, but text or intent alignment is uncertain; assess an update to that page before considering any new article.");
    }
    if (!candidate.targetQuery) base.rejectionReasons.push("MISSING_TARGET_QUERY");
    if (freshness.status === "STALE" || freshness.status === "FUTURE" || freshness.status === "INVALID") base.rejectionReasons.push(`GSC_EVIDENCE_${freshness.status}`);
    if (freshness.status === "UNKNOWN" && !allowFixture) base.rejectionReasons.push("GSC_FRESHNESS_UNKNOWN");
    if (candidate.evidenceMode === "FIXTURE" && !allowFixture) base.rejectionReasons.push("FIXTURE_EVIDENCE_NOT_ALLOWED_IN_SCHEDULED_RUN");
    if (candidate.metrics.impressions === null || candidate.metrics.clicks === null || candidate.metrics.ctr === null || candidate.metrics.averagePosition === null) base.rejectionReasons.push("INCOMPLETE_GSC_METRICS");
    if (base.rejectionReasons.length) { base.status = "REJECTED"; results.push(base); continue; }

    const packSelection = selectCompatibleSourcePack(candidate.targetQuery, intent);
    base.sourcePackCompatibility = {
      compatible: packSelection.compatible,
      matchedPackId: packSelection.matchedPackId,
      reason: packSelection.reason,
    };
    if (!packSelection.pack) {
      base.rejectionReasons.push(packSelection.reason || "NO_APPROVED_SOURCE_PACK_FOR_INTENT");
      base.status = "REJECTED";
      results.push(base);
      continue;
    }
    const pack = packSelection.pack;
    if (cannibalization.targetQueryMatch === "EXACT_LANDING_PAGE_REVIEW_REQUIRED") {
      base.rejectionReasons.push("EXACT_TARGET_INTENT_MISMATCH_REQUIRES_HUMAN_REVIEW");
      base.status = "REJECTED";
      results.push(base);
      continue;
    }
    if (cannibalization.unresolved) { base.rejectionReasons.push("UNRESOLVED_CANNIBALIZATION"); base.status = "REJECTED"; results.push(base); continue; }
    const operationType = cannibalization.decision === "UPDATE_EXISTING_ARTICLE" ? "EXISTING_ARTICLE_UPDATE" : "NEW_ARTICLE";
    const target = cannibalization.target || {
      slug: candidate.targetQuery.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
      title: pack.title,
    };
    candidate.operationType = operationType;
    candidate.opportunityRationale = `GSC reports ${candidate.metrics.impressions} impressions, ${candidate.metrics.clicks} clicks, CTR ${candidate.metrics.ctr}, and average position ${candidate.metrics.averagePosition} for the reporting period ending ${freshness.reportingPeriodEnd}. These are observed GSC values, not search-volume estimates.`;
    const sourceRecords = await Promise.all(pack.sources.map(source => retrieveSource(source,{fetchImpl,now})));
    const sourceFailures = sourceRecords.filter(source => source.status !== "RETRIEVED_RELEVANT");
    const unsupported = pack.claimSpecs.filter(spec => {
      const mapped = spec.sourceIndexes.map(index => sourceRecords[index]).filter(Boolean);
      return !mapped.length || mapped.some(source => source.status !== "RETRIEVED_RELEVANT") ||
        !spec.terms.every(term => mapped.some(source => source.termMatches?.some(match => match.toLowerCase() === term.toLowerCase())));
    });
    if (sourceFailures.length || unsupported.length) base.rejectionReasons.push("SOURCE_VERIFICATION_INCOMPLETE");
    const productEvidence = Boolean(pack.productMention) && ["Invoice creation","Expense tracking","Customer management","Basic reports"]
      .every(name => VERIFIED_PRODUCT.verifiedCapabilities.some(item => item.name === name && item.articleClaimAllowed));
    const related = pack.related.map(slug => inventory.find(item => item.slug === slug))
      .filter(item => item && item.slug !== target.slug).map(item => ({slug:item.slug,title:item.title}));
    const existingArticle = operationType === "EXISTING_ARTICLE_UPDATE" ? inventory.find(item => item.slug === target.slug) || null : null;
    const draft = buildDraft(candidate,pack,sourceRecords,productEvidence,related,target,now,existingArticle);
    base.sourceRecords = sourceRecords;
    base.internalLinks = related;
    base.audience = pack.audience;
    base.articleAngle = pack.angle || pack.sections.map(([heading]) => heading).join("; ");
    base.jurisdiction = pack.jurisdiction;
    base.productEvidence = productEvidence ? VERIFIED_PRODUCT : null;
    const duplicateSlug = operationType === "NEW_ARTICLE" && inventory.some(item => item.slug === draft.slug);
    const contentText = matter(draft.content);
    const frontmatterValid = contentText.data.status === "draft" && contentText.data.publicationStatus === "draft" &&
      contentText.data.title === draft.title && contentText.data.description === draft.description && contentText.data.slug === draft.slug;
    const bodyWords = contentText.content.trim().split(/\s+/).length;
    let numericReviewText = contentText.content;
    if (operationType === "EXISTING_ARTICLE_UPDATE") {
      const updateHeading = pack.updateSectionHeading || "## Updated plan details";
      const updatedBody = matter(draft.content).content || "";
      const sectionStart = updatedBody.indexOf(updateHeading);
      if (sectionStart >= 0) {
        const nextSection = updatedBody.indexOf("\n## ", sectionStart + updateHeading.length);
        numericReviewText = updatedBody.slice(sectionStart, nextSection >= 0 ? nextSection : updatedBody.length);
      }
      base.editorialReviewQuestions.push("The existing article content outside the updated section is preserved; verify its inherited numerical claims and citations before approval.");
    }
    const numericClaimAssessment = assessNumericClaims(numericReviewText, draft.claims, sourceRecords);
    const unsupportedNumericClaimMatches = numericClaimAssessment.unsupported;
    const unsupportedNumericClaims = unsupportedNumericClaimMatches.length > 0;
    if (unsupportedNumericClaims) base.rejectionReasons.push("UNSUPPORTED_NUMERIC_CLAIM");
    const existingComparisons = inventory.filter(item => !(operationType === "EXISTING_ARTICLE_UPDATE" && item.slug === target.slug)).map(item => ({
      slug:item.slug,
      title:item.title,
      titleDescriptionScore:Number(similarity(draft.title + " " + draft.description, [item.title,item.description,item.slug,...(item.tags || [])].join(" ")).toFixed(3)),
      fullTextScore:Number(similarity(contentText.content,item.content).toFixed(3)),
      score:Number(Math.max(
        similarity(draft.title + " " + draft.description, [item.title,item.description,item.slug,...(item.tags || [])].join(" ")),
        similarity(contentText.content,item.content),
      ).toFixed(3)),
      existingIntent:classifySearchIntent([item.title,item.description,item.slug].join(" ")),
      proposedIntent:intent,
    })).sort((a,b)=>Math.max(b.titleDescriptionScore,b.fullTextScore)-Math.max(a.titleDescriptionScore,a.fullTextScore));
    const originality = {
      highestSimilarity: existingComparisons[0] || null,
      status: existingComparisons[0]?.score >= 0.42 ? "POSSIBLE_REPETITION_REVIEW_REQUIRED" : "NO_HIGH_OVERLAP_DETECTED",
    };
    if (originality.status === "POSSIBLE_REPETITION_REVIEW_REQUIRED") {
      if (operationType === "NEW_ARTICLE") base.rejectionReasons.push("SUBSTANTIAL_REPETITION_WITH_EXISTING_ARTICLE");
      else base.editorialReviewQuestions.push("The proposed update overlaps with another existing article; compare both pages and confirm whether the information belongs on this target page or should be consolidated.");
    }
    const quality = validateDraft(draft, {
      existingSlugs: inventory.map(item=>item.slug), operationType, targetSlug: target.slug,
    });
    if (!frontmatterValid) base.rejectionReasons.push("INVALID_DRAFT_FRONTMATTER");
    if (duplicateSlug) base.rejectionReasons.push("DUPLICATE_SLUG");
    if (bodyWords < 250) base.rejectionReasons.push("DRAFT_TOO_THIN");
    if (quality.decision === "BLOCKED") base.rejectionReasons.push(...quality.errors);
    if (sourceFailures.length) base.rejectionReasons.push("UNVERIFIED_SOURCE");
    base.draft = draft;
    base.existingContentComparison = existingComparisons.slice(0,5);
    base.quality = {
      ...quality, frontmatterValid, bodyWords, duplicateSlug,
      numericClaims: numericClaimAssessment,
      sourceCount: sourceRecords.length,
      verifiedSourceCount: sourceRecords.filter(source=>source.status==="RETRIEVED_RELEVANT").length,
      originality, numericClaimsVerified: !unsupportedNumericClaims, numericClaimMatches: unsupportedNumericClaimMatches, productCapabilities: productEvidence ? "VERIFIED_FROM_REPOSITORY" : "NOT_VERIFIED",
    };
    base.status = base.rejectionReasons.length ? "REJECTED" : "DRAFT_READY_FOR_HUMAN_REVIEW";
    if (base.status === "DRAFT_READY_FOR_HUMAN_REVIEW" && typeof articleGenerator === "function") {
      const articleProduction = await runArticleProduction({
        research: { ...base, candidate, draft, sourceRecords, internalLinks: related,
          audience: pack.audience, jurisdiction: pack.jurisdiction,
          productEvidence: productEvidence ? VERIFIED_PRODUCT : null,
          outline: pack.sections.map(([heading]) => heading), readerQuestions: pack.readerQuestions || [],
          existingInventory: inventory },
        generateArticle: articleGenerator, outputDir: articleOutputDir, now,
      });
      if (articleProduction.status === "READY_FOR_HUMAN_REVIEW") {
        draft.content = articleProduction.articleMarkdown;
        base.articleProduction = { ...articleProduction, articleMarkdown: undefined };
      } else {
        base.rejectionReasons.push(...(articleProduction.blockers || [articleProduction.status]));
        base.status = "REJECTED";
        base.articleProduction = { ...articleProduction, articleMarkdown: undefined };
      }
    }
    if (base.status === "DRAFT_READY_FOR_HUMAN_REVIEW") {
      const hash = createHash("sha256").update(draft.content).digest("hex");
      const filename = `${candidate.id || draft.slug}-${hash.slice(0,10)}.md`.replace(/[^a-zA-Z0-9._-]/g,"-");
      const draftPath = path.join(outputDir,"drafts",filename);
      await mkdir(path.dirname(draftPath),{recursive:true});
      await writeFile(draftPath,draft.content,{flag:"wx"}).catch(async error => { if(error.code!=="EEXIST") throw error; });
      base.draftPath = draftPath;
      base.contentHash = hash;
      if (store) {
        requireUuid(candidate.persistedOpportunityId, "Persisted Scheduler 1 opportunity");
        for (const method of ["recordContentOperation","recordResearchRecord","recordContentRevision","getContentOperation","listResearchRecords","listContentRevisions"]) {
          if (typeof store[method] !== "function") {
            throw new Error(`Durable draft persistence requires store.${method} for independent readback.`);
          }
        }
        const scheduledFor = now.toISOString().slice(0,10);
        const operationKey = `research:${candidate.id || draft.slug}:${freshness.reportingPeriodEnd}:${hash.slice(0,16)}`;
        const operationInput = {
          operationKey, operationType,
          targetPath:`content/blog/${draft.slug}.md`, slug:draft.slug, status:"PROPOSED",
          proposedContentHash:hash,
        };
        const operationPayload = {
          pipelineVersion:"b7.2", workflowState:"RESEARCHING",
          evidenceMode:candidate.evidenceMode,
          sourceCollectionRunId:candidate.sourceCollectionRunId,
          persistedOpportunityId:candidate.persistedOpportunityId,
          candidate, intent, freshness, cannibalization, existingContentComparison:existingComparisons,
          editorialDecision:base.editorialDecision,
          editorialReviewQuestions:base.editorialReviewQuestions,
          sourcePackCompatibility:base.sourcePackCompatibility,
          sourcePackContext:base.sourcePackContext,
          sources:sourceRecords, claims:draft.claims, productEvidence:draft.productEvidence,
          quality:base.quality, draftMarkdown:draft.content,
          publicationStatus:"draft", execution:"DRY_RUN_ONLY",
          createdAt:now.toISOString(), scheduledFor,
        };
        let operationId = null;
        try {
          operationId = requireUuid(await store.recordContentOperation({
            ...operationInput, payload:operationPayload,
          }), "Content operation persistence");
          const records = [...sourceRecords];
          if (productEvidence) records.push({
            url: "https://www.finflowtrack.com/pricing",
            sourceTitle: "FinFlow Track pricing page and feature catalog",
            publisher: "FinFlow Track", publishedAt: null, retrievedAt: now.toISOString(),
            status: "FIRST_PARTY_REPOSITORY_VERIFIED",
          });
          const researchRecordIds = [];
          const researchRecordExpectations = [];
          for (const source of records) {
            const mappedClaims = draft.claims.filter(claim => claim.sourceUrls.includes(source.url));
            const supportedClaims = mappedClaims.filter(claim => claim.verificationStatus !== "UNVERIFIED");
            const unresolvedClaims = mappedClaims.filter(claim => claim.verificationStatus === "UNVERIFIED");
            const researchRecordId = requireUuid(await store.recordResearchRecord({
              opportunityId: candidate.persistedOpportunityId, sourceUrl: source.url,
              sourceTitle: source.sourceTitle || source.publisher || source.url,
              sourcePublishedAt: source.publishedAt || null,
              retrievedAt: source.retrievedAt || now.toISOString(),
              supportedClaims, unresolvedClaims,
            }), "Research record persistence");
            researchRecordIds.push(researchRecordId);
            researchRecordExpectations.push({
              id:researchRecordId, sourceUrl:source.url, supportedClaims, unresolvedClaims,
            });
          }
          const revisionId = requireUuid(await store.recordContentRevision({
            operationId, revisionNumber:1, contentHash:hash,
            markdown:draft.content, revisionState:"PROPOSED",
          }), "Content revision persistence");

          const pendingReadbackPayload = {
            ...operationPayload,
            workflowState:"PERSISTED_PENDING_READBACK",
            researchRecordIds, revisionId,
          };
          const pendingOperationId = requireUuid(await store.recordContentOperation({
            ...operationInput, payload:pendingReadbackPayload,
          }), "Content operation state persistence");
          if (pendingOperationId !== operationId) throw new Error("Content operation idempotency changed the operation UUID.");

          const [operationReadback,researchReadback,revisionReadback] = await Promise.all([
            store.getContentOperation({operationId}),
            store.listResearchRecords({opportunityId:candidate.persistedOpportunityId}),
            store.listContentRevisions({operationId}),
          ]);
          if (!operationReadback || operationReadback.id !== operationId
            || operationReadback.operation_key !== operationKey
            || operationReadback.target_path !== operationInput.targetPath
            || operationReadback.proposed_content_hash !== hash
            || operationReadback.status !== "PROPOSED"
            || operationReadback.payload?.workflowState !== "PERSISTED_PENDING_READBACK"
            || operationReadback.payload?.draftMarkdown !== draft.content
            || operationReadback.payload?.persistedOpportunityId !== candidate.persistedOpportunityId) {
            throw new Error("Independent content-operation readback did not confirm the exact persisted proposal and evidence.");
          }
          for (const expected of researchRecordExpectations) {
            const actual = researchReadback.find(record => record.id === expected.id && record.source_url === expected.sourceUrl);
            if (!actual
              || !isDeepStrictEqual(actual.supported_claims || [], expected.supportedClaims)
              || !isDeepStrictEqual(actual.unresolved_claims || [], expected.unresolvedClaims)) {
              throw new Error("Independent research readback did not confirm a source record and its claim-source mappings.");
            }
          }
          const revision = revisionReadback.find(item => item.id === revisionId);
          if (!revision || revision.content_hash !== hash || revision.markdown !== draft.content
            || revision.revision_state !== "PROPOSED") {
            throw new Error("Independent revision readback did not confirm the complete immutable draft.");
          }

          const readyPayload = {
            ...pendingReadbackPayload,
            workflowState:"READY_FOR_HUMAN_REVIEW",
            independentReadback:{
              verified:true, verifiedAt:now.toISOString(),
              operation:true, researchRecords:true, revision:true,
            },
          };
          const readyOperationId = requireUuid(await store.recordContentOperation({
            ...operationInput, payload:readyPayload,
          }), "Human-review eligibility persistence");
          if (readyOperationId !== operationId) throw new Error("Human-review state update returned a different operation UUID.");
          const finalReadback = await store.getContentOperation({operationId});
          if (!finalReadback || finalReadback.id !== operationId
            || finalReadback.operation_key !== operationKey
            || finalReadback.target_path !== operationInput.targetPath
            || finalReadback.proposed_content_hash !== hash
            || finalReadback.payload?.workflowState !== "READY_FOR_HUMAN_REVIEW"
            || finalReadback.payload?.independentReadback?.verified !== true) {
            throw new Error("Final independent readback did not confirm human-review eligibility.");
          }
          base.persistence = {
            status:"PERSISTED", operationId, researchRecordIds, revisionId,
            independentReadback:readyPayload.independentReadback,
          };
          base.status = "DRAFT_READY_FOR_HUMAN_REVIEW";
        } catch (error) {
          if (operationId) {
            await store.recordContentOperation({
              ...operationInput,
              payload:{
                ...operationPayload, workflowState:"FAILED",
                failureSummary:String(error.message || error),
                failedAt:now.toISOString(),
              },
            }).catch(() => {});
          }
          throw error;
        }
      } else {
        base.persistence = "LOCAL_DRY_RUN_ONLY";
        base.status = "DRAFT_GENERATED_NOT_ELIGIBLE";
      }
    }
    results.push(base);
  }
  const report = {
    schemaVersion:1, pipeline:"B7.1_EVIDENCE_BACKED_RESEARCH",
    generatedAt:now.toISOString(), mode:"DRY_RUN",
    evidencePolicy:"GSC evidence is never fabricated. Fixture evidence is clearly marked and cannot enter scheduled runs.",
    productCapabilities:VERIFIED_PRODUCT,
    candidateCount:results.length,
    draftGeneratedCount:results.filter(item=>item.draft !== null).length,
    readyDraftCount:results.filter(item=>item.status==="DRAFT_READY_FOR_HUMAN_REVIEW").length,
    pendingReadbackCount:results.filter(item=>item.status==="PERSISTED_PENDING_READBACK").length,
    rejectedCount:results.filter(item=>item.status==="REJECTED").length,
    results,
  };
  const reportPath=path.join(outputDir,"research-pipeline-report.json");
  await writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
  return {reportPath,results,draftGeneratedCount:report.draftGeneratedCount,readyDraftCount:report.readyDraftCount,pendingReadbackCount:report.pendingReadbackCount,rejectedCount:report.rejectedCount};
}
export { SOURCE_PACKS, VERIFIED_PRODUCT };
