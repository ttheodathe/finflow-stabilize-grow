# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File                     | URL                                                     |
| ------------------------ | ------------------------------------------------------- |
| `index.tsx`              | `/`                                                     |
| `about.tsx`              | `/about`                                                |
| `users/index.tsx`        | `/users`                                                |
| `users/$id.tsx`          | `/users/:id` (dynamic — bare `$`, no curly braces)      |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                  |
| `files/$.tsx`            | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx`            | layout route (renders children via `<Outlet />`)        |
| `__root.tsx`             | app shell — wraps every page; preserve `<Outlet />`     |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.
# FinFlowTrack Documentation

> Welcome to the official documentation for **FinFlowTrack** — a modern cloud accounting platform built for freelancers, startups, NGOs, agencies, and small businesses worldwide.

Whether you're creating your first invoice, managing expenses, tracking cash flow, or collaborating with your team, this documentation will help you get the most from FinFlowTrack.

---

# Quick Start

Get up and running in minutes.

## Create an Account

1. Visit **https://www.finflowtrack.com**
2. Click **Get Started Free**
3. Verify your email address
4. Create your first workspace
5. Set your preferred currency and timezone

---

## Create Your First Company

From the dashboard:

**Companies → New Company**

Enter:

* Company name
* Business type
* Currency
* Tax settings
* Fiscal year
* Timezone

Save your company.

---

## Create Your First Invoice

Navigate to:

**Sales → Invoices → New Invoice**

Add:

* Customer
* Products or services
* Quantity
* Tax
* Due date

Click **Save** or **Send**.

---

## Record an Expense

Go to:

**Expenses → New Expense**

Enter:

* Vendor
* Category
* Amount
* Date
* Payment account

Attach a receipt if available.

---

## View Reports

Navigate to:

**Reports**

Available reports include:

* Profit & Loss
* Balance Sheet
* Cash Flow Statement
* Expense Report
* Revenue Report
* Accounts Receivable
* Accounts Payable

---

# User Guide

## Dashboard

The dashboard provides an overview of your business finances, including:

* Revenue
* Expenses
* Cash balance
* Outstanding invoices
* Recent transactions
* Financial insights

---

## Companies

Manage one or multiple businesses from a single account.

Features:

* Multi-company support
* Company switching
* Company settings
* User permissions
* Subscription management

---

## Customers

Store customer information including:

* Contact details
* Billing address
* Tax information
* Invoice history
* Payment history

---

## Vendors

Manage suppliers and vendors.

Features include:

* Purchase tracking
* Vendor payments
* Expense categorization
* Outstanding balances

---

## Products & Services

Create reusable catalog items.

Each item supports:

* SKU
* Name
* Price
* Tax
* Unit
* Description

---

## Invoices

Create professional invoices with:

* Custom numbering
* Taxes
* Discounts
* Notes
* Payment status
* PDF export

Invoice statuses:

* Draft
* Sent
* Viewed
* Paid
* Overdue
* Cancelled

---

## Expenses

Track all business expenses.

Examples:

* Office supplies
* Internet
* Software subscriptions
* Travel
* Marketing
* Payroll
* Utilities

---

## Banking

Connect and reconcile financial accounts.

Features:

* Transaction history
* Manual reconciliation
* Account balances
* Cash tracking

---

## Reports

Generate financial reports in real time.

Reports include:

* Profit & Loss
* Balance Sheet
* Cash Flow
* Sales
* Expenses
* Taxes
* Customers
* Vendors

Reports can be exported as PDF or CSV where supported.

---

## Team Management

Invite team members securely.

Available roles:

* Owner
* Administrator
* Accountant
* Manager
* Employee
* Read Only

Permissions are role-based.

---

## Settings

Configure:

* Business profile
* Branding
* Invoice templates
* Taxes
* Currency
* Fiscal year
* Notification preferences
* Security settings

---

# Video Walkthrough

The following tutorials will be published on the official FinFlowTrack YouTube channel.

## Beginner Series

* Creating an Account
* Setting Up Your Company
* Creating Your First Invoice
* Recording Expenses
* Running Reports

## Intermediate Series

* Multi-company Management
* Tax Configuration
* Team Collaboration
* Financial Dashboards
* Cash Flow Analysis

## Advanced Series

* Automation
* API Integrations
* Reporting
* Data Import
* Business Insights

---

# API Documentation

> Available on Professional and Business plans.

## Authentication

All API requests require an API key.

Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

---

## Base URL

```
https://api.finflowtrack.com/v1/
```

---

## Planned API Resources

* Companies
* Customers
* Vendors
* Products
* Invoices
* Expenses
* Transactions
* Reports
* Users
* Webhooks

---

## Response Format

Responses are returned as JSON.

Example:

```json
{
  "success": true,
  "data": {}
}
```

---

## Rate Limits

Default API rate limits:

* 100 requests per minute
* Burst limits may apply

---

# Import Guide

FinFlowTrack supports importing business data to simplify migration from spreadsheets and other accounting software.

Supported import types include:

* Customers
* Vendors
* Products
* Services
* Opening balances
* Chart of accounts
* Expenses
* Bank transactions

Supported file formats:

* CSV
* Excel (.xlsx)

Import workflow:

1. Download the sample template.
2. Populate your data.
3. Upload the completed file.
4. Review validation errors.
5. Confirm the import.

---

# Frequently Asked Questions

## Is FinFlowTrack free?

Yes. A free plan is available for individuals and small businesses. Paid plans unlock advanced collaboration, automation, and additional business features.

---

## Can I manage multiple companies?

Yes. Multi-company support is available depending on your subscription.

---

## Is my financial data secure?

Yes. All connections are encrypted using HTTPS/TLS. Data is protected using modern security practices and strict access controls. Additional security features continue to evolve as the platform grows.

---

## Can I export my data?

Yes. Financial reports and business data can be exported in supported formats.

---

## Does FinFlowTrack support multiple currencies?

Yes.

---

## Can I invite my accountant?

Yes. Role-based permissions allow accountants and team members to collaborate securely.

---

## Does FinFlowTrack work on mobile devices?

Yes. FinFlowTrack is designed to work across modern desktop and mobile browsers.

---

## How do I cancel my subscription?

You can manage, upgrade, downgrade, or cancel your subscription at any time from your account settings.

---

# Support

Need help?

* Help Center
* Documentation
* Community
* Email Support
* Feature Requests
* Bug Reports

Support Email:

**[support@finflowtrack.com](mailto:support@finflowtrack.com)**

Business inquiries:

**[hello@finflowtrack.com](mailto:hello@finflowtrack.com)**

---

# Changelog

Track product improvements and releases in the public changelog.

Each release includes:

* New features
* Improvements
* Bug fixes
* Security updates
* Performance enhancements

---

# Security

FinFlowTrack is committed to protecting your business data.

Security practices include:

* HTTPS encryption
* Secure authentication
* Role-based access control
* Regular backups
* Infrastructure monitoring
* GDPR-aware privacy practices
* Secure cloud hosting

---

# Release Roadmap

Upcoming platform enhancements include:

* Bank feeds
* Inventory management
* Payroll
* Recurring invoices
* Mobile applications
* AI financial insights
* Public API
* Third-party integrations

---

# Need More Help?

If you cannot find the answer you're looking for, contact our support team.

We aim to respond to all support requests within one business day.

Thank you for choosing **FinFlowTrack**.
