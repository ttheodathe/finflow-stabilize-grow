---
title: "Accounts Payable Aging Report: How to Prepare and Read One"
description: "Learn what an accounts payable aging report shows, how to calculate overdue supplier balances, use aging buckets, reconcile totals, and plan payment reviews."
slug: "accounts-payable-aging-report"
author: "FinFlowTrack Editorial Team"
publishedAt: "2026-11-21"
updatedAt: "2026-11-21"
category: "small-business-finance"
tags:
  - accounts payable aging report
  - accounts payable
  - supplier invoices
  - cash flow management
  - small business accounting
draft: false
featured: false
---

# Accounts Payable Aging Report: How to Prepare and Read One

An accounts payable aging report shows the unpaid amounts a business owes to suppliers, grouped by how old each balance is or how long it has been overdue. It turns a long list of supplier bills into a practical view of upcoming obligations, overdue invoices, and payment priorities.

For a small business, the report can answer questions such as:

- How much do we owe suppliers as of a specific date?
- Which invoices are not due yet, and which are overdue?
- Which suppliers have the largest outstanding balances?
- Are old invoices caused by cash constraints, disputes, missing approvals, or recording errors?
- Does the accounts payable detail agree with the payable balance in the general ledger?

This guide explains how to prepare an accounts payable aging report, calculate its aging buckets, interpret the results, and use it in a regular finance review. The examples are illustrative and are not actual business records.

## What Is an Accounts Payable Aging Report?

An accounts payable (AP) aging report, sometimes called an aged payables report or supplier aging report, is a point-in-time list of outstanding supplier invoices. It groups unpaid amounts into time periods so the finance team can see which obligations are current and which need attention.

A typical report includes:

- Supplier or vendor name
- Supplier invoice number
- Invoice date
- Due date and payment terms
- Original invoice amount
- Payments or credits already applied
- Remaining amount due
- Days past due or days outstanding
- Aging bucket
- Total outstanding balance

The report should have a clear **as-of date**. A report prepared as of October 31 is a snapshot of the open payables at that date, not a list of everything that is unpaid today.

Aged payables reports are used to monitor supplier balances, plan payments, and review the relationship between the accounts payable subledger and the general ledger. See Microsoft's [Aged Accounts Payable report documentation](https://learn.microsoft.com/en-us/dynamics365/business-central/reports/report-322) for an example of how an accounting system can show vendor totals and individual outstanding documents.

## Accounts Payable Aging Buckets Explained

An aging bucket is a date range used to group open invoices. Many businesses use periods such as:

| Aging bucket | What it means |
| --- | --- |
| Current / not due | The invoice due date is on or after the report date, depending on the report's convention. |
| 1–30 days overdue | The invoice is up to 30 days past its due date. |
| 31–60 days overdue | The invoice is 31 to 60 days past due. |
| 61–90 days overdue | The invoice is 61 to 90 days past due. |
| 91+ days overdue | The invoice is more than 90 days past due. |

These are common examples, not a universal standard. Some systems use 0–30, 31–60, 61–90 and 91–120 day periods, while others allow a business to configure its own ranges. The important thing is to define the periods, use them consistently, and show whether the report is aging by invoice date or due date.

### Age by due date or invoice date?

The date basis changes what the report tells you:

- **Due-date aging** shows how long an invoice has been overdue. It is often the more useful view for planning payments and following up on missed due dates.
- **Invoice-date aging** shows how long an invoice has existed, even if its payment due date is still in the future.
- **Posting-date aging** groups transactions based on when they were entered into the general ledger.

Choose the basis that matches the decision you need to make. Label it clearly on every exported report. Sage Intacct's [Supplier Aging report guide](https://www-p04.intacct.com/ia/docs/en_GB/help_action/Accounts_Payable/AP_reports/vendor-aging-report.htm) documents these different date options and configurable aging periods.

## How to Calculate an Accounts Payable Aging Report

If you are preparing the report in a spreadsheet, begin with a complete list of open supplier invoices as of one reporting date.

For due-date aging, calculate days past due as:

```text
Days past due = Report date - Invoice due date
```

If the due date is after the report date, classify the invoice as current or not due. If the result is positive, place the invoice in the matching overdue bucket.

A simple spreadsheet formula, assuming the due date is in cell D2 and the report date is in cell B1, is:

```excel
=MAX(0,$B$1-D2)
```

This formula returns zero for invoices that are not yet due. You can then use conditional logic or spreadsheet filters to assign the days-past-due value to a bucket. Make sure the date cells contain real spreadsheet dates rather than text.

### Worked example: a small business AP aging report

Assume a business is preparing a report as of October 31, 2026. It has four open supplier invoices:

| Supplier | Open balance | Due date | Days past due | Aging bucket |
| --- | ---: | --- | ---: | --- |
| Northstar Supplies | $1,800 | October 10, 2026 | 21 | 1–30 days |
| Greenline Office | $2,400 | September 10, 2026 | 51 | 31–60 days |
| Citywide Internet | $900 | November 15, 2026 | 0 | Current / not due |
| Apex Equipment | $600 | August 1, 2026 | 91 | 91+ days |

All names, dates, and amounts in this example are illustrative.

The summary by aging bucket is:

| Aging bucket | Open amount |
| --- | ---: |
| Current / not due | $900 |
| 1–30 days overdue | $1,800 |
| 31–60 days overdue | $2,400 |
| 61–90 days overdue | $0 |
| 91+ days overdue | $600 |
| **Total open payables** | **$5,700** |

The total is the sum of the remaining balances, not the original invoice amounts if partial payments or credits have already been applied.

This summary tells the owner that $900 is not yet due and $4,800 is overdue. It does not, by itself, tell the owner which invoice should be paid first. Each overdue item still needs to be checked against its due date, supplier terms, approval status, dispute history, and available cash.

## Summary Report vs. Detailed AP Aging Report

An accounts payable aging report can be presented at two levels.

### AP aging summary

A summary report groups open balances by supplier and aging bucket. It is useful when a manager needs a quick overview of total supplier exposure.

For example, it may show that one supplier is owed $4,800 in total, with $1,200 current and $3,600 overdue. It may not show which individual invoices make up those amounts.

### AP aging detail

A detail report lists the individual invoices behind each supplier total. It is useful when someone needs to investigate a particular balance, verify a payment, check a due date, or resolve a supplier statement difference.

Microsoft's [Aged Accounts Payable report](https://learn.microsoft.com/en-us/dynamics365/business-central/reports/report-322) describes both vendor-level totals and a detailed breakdown of outstanding documents. For a practical review, keep access to the detail behind the summary so unusual balances can be traced to their source transactions.

## How to Prepare an AP Aging Report Step by Step

### 1. Set the reporting date and purpose

Choose the date the report should represent. Month-end close, a weekly payment review, and a short-term cash forecast may need different reporting dates.

Write down whether the report is based on invoice date, due date, or posting date. Also document the bucket definitions so the next report can be compared fairly.

### 2. Collect all open supplier invoices

Export or assemble the supplier invoices that remain unpaid at the reporting date. Include invoice numbers, supplier names, invoice dates, due dates, original amounts, payments, credits, and remaining balances.

Do not rely on an incomplete list from an email inbox. Check that invoices received through other channels have been entered and that payments and credit notes have been applied to the correct bills.

### 3. Check the remaining balances

For each invoice, confirm:

- The supplier and invoice number are correct.
- The invoice was received and relates to goods or services supplied.
- The due date agrees with the supplier's payment terms.
- Partial payments and supplier credits are reflected.
- Duplicate, reversed, disputed, or voided items are identified.
- The remaining amount is still payable as of the report date.

Keep disputed items visible but label them clearly. Hiding them can make the report look cleaner while concealing an unresolved obligation.

### 4. Calculate days outstanding and assign buckets

Use one consistent report date and the selected aging basis. Apply the same bucket ranges to every supplier. If you use a spreadsheet, protect the formula cells and check a sample of rows manually.

### 5. Create supplier totals and an overall total

Group the remaining balances by supplier and aging bucket. Add the total for all open invoices and compare it with the underlying AP listing.

A useful report should let a reviewer move from a bucket total to the supplier and invoice details behind it.

### 6. Reconcile the AP subledger to the general ledger

Compare the total accounts payable subledger balance with the corresponding accounts payable control account in the general ledger, using the same reporting date and accounting basis.

If the totals do not agree, investigate timing differences, unposted invoices, unapplied payments, supplier credits, duplicate entries, currency conversions, or transactions recorded directly to the control account. Do not change figures simply to force the reports to match. Document the difference and its explanation.

Microsoft's [audit preparation guidance for accounts payable](https://learn.microsoft.com/en-us/dynamics365/business-central/finance-prepare-audit-pbc-checklist) also emphasizes preparing payable balances for the same dates as the general ledger and reconciling the aged payables total to the relevant control account.

### 7. Review exceptions and assign follow-up

Give each material overdue item an owner and a next action. Examples include confirming an invoice, requesting a missing approval, checking whether a payment was applied correctly, or contacting a supplier about a disputed charge.

Record the decision and the date of the next review. The report becomes more useful when it leads to a documented action rather than being filed away after month-end.

## How to Read and Use the Results

Start with the total open balance, then look at how much is current and how much is overdue. Next, review the largest supplier balances and the oldest individual invoices.

Ask these questions:

- **Are several invoices overdue to the same supplier?** Check whether a payment run was missed, invoices were not approved, or the supplier account needs attention.
- **Is one old invoice distorting the totals?** Open the detail and check for a dispute, credit note, incorrect due date, or payment that has not been applied.
- **Are many invoices due in the same week?** Include those obligations in the cash forecast rather than looking only at overdue balances.
- **Are overdue amounts increasing across reports?** Investigate whether the change reflects cash timing, a growing volume of bills, delayed approvals, or incomplete records.
- **Does the total match the general ledger?** If not, investigate and document the reconciling items before relying on the report.

A large overdue balance can indicate cash pressure, but it can also reflect administrative delays, disputed invoices, or data errors. The report is a signal to investigate, not proof of the cause.

### Should you always pay the oldest invoice first?

No. Age is one factor, not a complete payment policy. Before deciding what to pay, consider the contractual due date, supplier terms, early-payment discounts, late-payment consequences, whether the invoice is valid and approved, supplier importance, and the cash needed for other obligations.

An invoice that is older may be disputed or incorrectly recorded. A newer invoice may have an earlier due date. Review the supporting documents and follow the business's approval controls before releasing a payment.

## Common AP Aging Report Mistakes

### Using different report dates

Comparing a report from the last day of one month with a report from the middle of the next month can create misleading changes. Use consistent dates or clearly explain the difference.

### Mixing invoice-date and due-date aging

A bill that is 45 days old is not necessarily 45 days overdue. Label the date basis and use it consistently.

### Ignoring partial payments and credits

The report should show the remaining amount owed, not the original invoice total when a payment or credit has already reduced it.

### Leaving out disputed or unapproved invoices

Keep these items visible with a clear status. They may not be ready for payment, but they still need to be tracked and resolved.

### Treating the aging report as the cash forecast

An AP aging report shows supplier obligations. A cash forecast also considers expected customer receipts, payroll, operating costs, financing, and other cash movements. Use the report as an input to forecasting, not as a replacement for it. See [Cash Flow Forecasting for Small Business](/blog/cash-flow-forecasting-small-business).

### Failing to reconcile the report

A report that does not agree with the AP control account should be investigated. Differences can arise from timing, unapplied transactions, currency treatment, or posting errors.

## How Often Should a Small Business Review AP Aging?

The right schedule depends on invoice volume, payment terms, and how frequently the business makes supplier payments.

- **Before each payment run:** Check which invoices are due, overdue, disputed, or awaiting approval.
- **Weekly:** Review overdue balances and upcoming obligations when the business has regular supplier activity.
- **At month-end:** Prepare a dated report and reconcile it to the general ledger as part of the close process.
- **More frequently when needed:** Businesses with many supplier invoices or tight cash planning may need more frequent reviews.

Keep the report date, date basis, bucket ranges, preparer, reviewer, and follow-up notes. This makes it easier to compare periods and understand why a balance moved.

## How Accounting Software Helps With AP Aging

Accounting software can reduce spreadsheet work by keeping supplier bills, recorded payments, and reporting data together. Depending on the product, it may also provide supplier-level summaries, invoice details, filters, and export options.

FinFlowTrack includes supplier bill and expense tracking, as well as financial reports that include payables aging. Reports can be exported to CSV. It can help a small business review recorded obligations, but users remain responsible for checking source invoices, approving payments, and making payment decisions.

Learn more about [FinFlowTrack features](/features), or explore [accounts payable management for small business](/blog/accounts-payable-management) for the wider process of recording, checking, and paying supplier bills.

## Frequently Asked Questions

### What does an accounts payable aging report show?

It shows unpaid supplier balances grouped into time periods as of a selected date. Depending on the report, it may show totals by supplier, individual invoices, due dates, and days overdue.

### What are the standard AP aging buckets?

A common setup is current, 1–30 days overdue, 31–60 days, 61–90 days, and 91 or more days overdue. Businesses and accounting systems may use different ranges, so always check the report settings.

### Is an AP aging report based on invoice date or due date?

It can be based on either date, or sometimes the general-ledger posting date. Due-date aging is useful for reviewing overdue payments. Invoice-date aging measures how long the invoice has existed. The report should state which basis it uses.

### How do you calculate days past due?

For due-date aging, subtract the invoice due date from the report date. If the due date is later than the report date, the invoice is not yet overdue. Confirm the accounting system's conventions for invoices due on the report date.

### Why should AP aging agree with the balance sheet?

The AP subledger contains the supplier-level detail supporting the accounts payable control balance. Reconciling them helps identify missing, duplicated, misapplied, or incorrectly posted transactions. Differences should be investigated and documented.

### Does an AP aging report tell a business which supplier to pay first?

Not by itself. Use the due date, payment terms, invoice validity, approval status, supplier relationship, discounts, and available cash. Do not automatically pay the oldest item without checking its details.

### How is an AP aging report different from an AR aging report?

An AP aging report shows money the business owes suppliers. An accounts receivable (AR) aging report shows money customers owe the business. The two reports support different parts of cash management.

## Final Takeaway

An accounts payable aging report is most useful when it is accurate, dated, consistently prepared, and connected to a clear review process.

Start with complete open invoices, choose the correct date basis, calculate aging buckets consistently, reconcile the total to the general ledger, and investigate exceptions. Then use the findings alongside your cash forecast and payment approval process.

For the wider picture, read [Small Business Cash Flow Management](/blog/small-business-cash-flow-management), [Accounts Payable Management for Small Business](/blog/accounts-payable-management), and [Balance Sheet for Small Business](/blog/balance-sheet-for-small-business).

## Sources & Further Reading

- [Microsoft Learn — Aged Accounts Payable report](https://learn.microsoft.com/en-us/dynamics365/business-central/reports/report-322)
- [Microsoft Learn — Gather information for an audit: Accounts payable](https://learn.microsoft.com/en-us/dynamics365/business-central/finance-prepare-audit-pbc-checklist)
- [Sage Intacct — Supplier Aging report](https://www-p04.intacct.com/ia/docs/en_GB/help_action/Accounts_Payable/AP_reports/vendor-aging-report.htm)
- [Wise — Accounts Payable Ageing Report: What it is and How to Make One](https://wise.com/gb/blog/accounts-payable-ageing-report)

## Disclaimer

This article provides general educational information and is not accounting, tax, legal, investment, or financial advice. Accounting practices and reporting conventions vary by country, accounting framework, software, and business circumstances. Confirm reporting settings and balances with your accounting records and an appropriately qualified professional.
