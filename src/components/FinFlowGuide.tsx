import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, X } from "lucide-react";

type Answer = {
  id: string;
  title: string;
  keywords: string[];
  response: string;
  href?: string;
  linkLabel?: string;
};

const ANSWERS: Answer[] = [
  {
    id: "overview", title: "What is FinFlow Track?",
    keywords: ["what is finflow", "about finflow", "what does finflow do", "accounting software", "business finance software", "overview"],
    response: "FinFlow Track is a cloud-based accounting and business finance platform for freelancers, startups, NGOs and small businesses. It brings invoicing, expense tracking, customer records and financial reporting together, with additional tools available on eligible paid plans.",
    href: "/features", linkLabel: "Explore all features",
  },
  {
    id: "free", title: "What is included in the Free plan?",
    keywords: ["free plan", "free version", "free account", "is it free", "cost", "price", "pricing", "how much", "credit card", "no cost"],
    response: "The Free plan includes basic accounting, invoice creation, expense tracking, customer management and basic reports. Some advanced tools and higher usage limits require a paid plan. Check the pricing page for the current plan details and limits.",
    href: "/pricing", linkLabel: "Compare plans",
  },
  {
    id: "signup", title: "How do I create an account?",
    keywords: ["sign up", "signup", "create account", "register", "start account", "join finflow", "get started", "begin"],
    response: "Open the signup page and create your account. Once signed in, set up your company workspace, add customers, then create your first invoice or record an expense. The getting-started guide walks through the main setup sequence.",
    href: "/auth?mode=signup", linkLabel: "Create your account",
  },
  {
    id: "company", title: "How do I set up a company workspace?",
    keywords: ["create company", "add company", "company workspace", "business setup", "business details", "company settings", "multiple businesses"],
    response: "After signing in, open Companies and choose the option to create or select a workspace. Complete the business details in Company settings and confirm the base currency. Each company has its own financial records; the number of company workspaces depends on your plan.",
    href: "/guides", linkLabel: "Follow the setup guide",
  },
  {
    id: "dashboard", title: "What does the dashboard show?",
    keywords: ["dashboard", "overview screen", "financial overview", "summary cards", "business performance"],
    response: "The dashboard gives you a starting view of your financial activity, including summary cards, customer balances and outstanding invoices. Use it to spot items that may need attention, then open the relevant list or report to review the underlying records.",
    href: "/guides", linkLabel: "See the dashboard guide",
  },
  {
    id: "customers", title: "How do I add a customer?",
    keywords: ["add customer", "create customer", "customer list", "client details", "customer record", "clients"],
    response: "Open Customers, choose the add-customer action, enter the customer's details and save. You can then select that customer when preparing an invoice. Check the details before saving so your invoice is addressed correctly.",
    href: "/guides", linkLabel: "View the customer setup guide",
  },
  {
    id: "invoice-create", title: "How do I create an invoice?",
    keywords: ["create invoice", "new invoice", "make invoice", "prepare invoice", "invoice creation", "bill a client", "invoice a customer"],
    response: "Open Invoices and choose New Invoice. Confirm the invoice number, select a customer, review the issue and due dates, choose the currency, add products or services with quantities and prices, then review the subtotal, tax and total before saving. You can then open the saved invoice to use its available sharing options.",
    href: "/guides", linkLabel: "Follow the first-invoice walkthrough",
  },
  {
    id: "invoice-send", title: "How can I send or share an invoice?",
    keywords: ["send invoice", "share invoice", "email invoice", "invoice pdf", "download invoice", "invoice link", "customer invoice link"],
    response: "FinFlow Track supports invoice PDF export, email delivery and a shareable online invoice link. Open the saved invoice and use the sharing option shown by the application. Check the recipient and invoice details before sending or copying a customer-facing link.",
    href: "/features", linkLabel: "Explore invoicing features",
  },
  {
    id: "invoice-status", title: "What do invoice statuses mean?",
    keywords: ["invoice status", "draft invoice", "sent invoice", "partial payment", "paid invoice", "overdue invoice", "invoice overdue"],
    response: "Invoice statuses help distinguish work in progress from customer-facing and payment states. The application uses statuses including draft, sent, partial, paid and overdue. Review the invoice record and payment history for the current balance.",
    href: "/help", linkLabel: "Open the Help Center",
  },
  {
    id: "payments", title: "How do I record a customer payment?",
    keywords: ["record payment", "payment received", "customer paid", "mark invoice paid", "partial payment", "payment against invoice", "received money"],
    response: "Open Payments received and choose Record payment. Select the invoice, enter the payment date and amount, choose the payment method and deposit account, and add a reference or note if needed. Review the details before saving, then check the invoice balance.",
    href: "/guides", linkLabel: "See the payment walkthrough",
  },
  {
    id: "estimates", title: "Can I prepare estimates or quotations?",
    keywords: ["estimate", "estimates", "quotation", "quote", "sales quote", "price quote"],
    response: "Yes. The invoicing module includes estimates (quotations) for customers. Review the invoicing area in your account for the available estimate workflow and options.",
    href: "/features", linkLabel: "Explore invoicing features",
  },
  {
    id: "expenses", title: "How do I record business expenses?",
    keywords: ["expense", "expenses", "record expense", "track spending", "business costs", "purchase", "expense tracking"],
    response: "Open Expenses and create a new expense. Select the vendor and expense account/category, enter a description, amount, date and currency, then review and save. FinFlow Track can also help organize expense records and supports document scanning on eligible paid plans.",
    href: "/guides", linkLabel: "Explore getting-started guides",
  },
  {
    id: "receipts", title: "Can I scan receipts or bills?",
    keywords: ["scan receipt", "receipt scanning", "upload receipt", "ocr", "scan bill", "document scanning", "extract receipt"],
    response: "Document scanning and OCR are paid-plan capabilities. Extracted details are presented for review; check and approve the information before it is saved. Availability depends on your plan.",
    href: "/pricing", linkLabel: "Review plan features",
  },
  {
    id: "reports", title: "Which financial reports are available?",
    keywords: ["reports", "financial reports", "profit and loss", "p&l", "balance sheet", "cash flow", "aging report", "receivables report", "payables report"],
    response: "FinFlow Track includes basic reports, while eligible paid plans unlock advanced reporting such as profit and loss, balance sheet, cash flow, receivables aging and payables aging. The Reports area also includes an invoice summary and CSV export options. Check your plan for access.",
    href: "/features", linkLabel: "Explore reporting features",
  },
  {
    id: "export", title: "Can I export my reports?",
    keywords: ["export report", "download report", "csv export", "export csv", "download financial data"],
    response: "The Reports area supports CSV export for available report data. Open the relevant report, choose the date range or filters you need, and use its export option where available.",
    href: "/features", linkLabel: "Review reporting features",
  },
  {
    id: "currency", title: "Does FinFlow Track support multiple currencies?",
    keywords: ["currency", "currencies", "exchange rate", "multi currency", "foreign currency", "base currency", "fx"],
    response: "Yes. FinFlow Track supports recording transactions in multiple currencies. The exchange rate is locked when a transaction is recorded, helping preserve the recorded conversion for later reporting.",
    href: "/features", linkLabel: "Explore multi-currency features",
  },
  {
    id: "team", title: "Can I invite employees or teammates?",
    keywords: ["team", "teams", "invite employee", "invite user", "staff", "multiple users", "collaborate", "team member"],
    response: "You can invite team members to a company workspace and assign roles that control access. Team-member limits and available capabilities depend on the subscription plan. Review the current plan comparison before upgrading.",
    href: "/pricing", linkLabel: "Compare team limits",
  },
  {
    id: "roles", title: "What user roles and permissions are available?",
    keywords: ["roles", "permissions", "access control", "viewer", "accountant role", "manager role", "admin role", "user access"],
    response: "FinFlow Track supports role-based access. The documented roles include owner, admin, accountant, manager, employee and viewer, with permissions controlling what team members can see and do. Available team capacity depends on the plan.",
    href: "/features", linkLabel: "Review security and team features",
  },
  {
    id: "multiple-companies", title: "Can I manage multiple companies?",
    keywords: ["multiple companies", "several businesses", "more than one company", "company limit", "multiple workspaces"],
    response: "Yes. FinFlow Track supports multiple company workspaces, with separate records for each company. The Free plan starts with one company, Professional supports up to five, and Business supports up to twenty-five; confirm the current limits on the pricing page.",
    href: "/pricing", linkLabel: "Compare company limits",
  },
  {
    id: "inventory", title: "Does FinFlow Track have inventory management?",
    keywords: ["inventory", "stock", "products", "stock levels", "warehouse", "low stock", "stock movement"],
    response: "Inventory management is available on the Professional plan and above. It includes products, variants, services and categories, with warehouse and stock-movement capabilities on eligible plans. Check the feature comparison for the exact plan access.",
    href: "/features", linkLabel: "Explore inventory features",
  },
  {
    id: "banking", title: "Can I reconcile bank transactions?",
    keywords: ["bank reconciliation", "reconcile bank", "bank statement", "bank transactions", "bank account", "import bank csv"],
    response: "FinFlow Track includes bank accounts, transactions and transfers, and supports importing bank statements from CSV. Bank reconciliation is a paid-plan feature. Review the feature comparison for current access.",
    href: "/features", linkLabel: "Explore banking features",
  },
  {
    id: "accounting", title: "Does FinFlow Track use double-entry accounting?",
    keywords: ["double entry", "accounting", "chart of accounts", "general ledger", "journal entries", "trial balance", "ledger"],
    response: "FinFlow Track has double-entry accounting capabilities, including chart of accounts, journal entries, general ledger and trial balance views. Access to the advanced accounting module depends on your subscription plan.",
    href: "/features", linkLabel: "Explore accounting features",
  },
  {
    id: "ai-bookkeeper", title: "What does AI Bookkeeper do?",
    keywords: ["ai bookkeeper", "artificial intelligence bookkeeper", "ask ai", "ask questions about invoices", "ai expenses", "automated bookkeeping"],
    response: "AI Bookkeeper is a paid-plan feature that lets you ask questions about your own invoices and expenses in plain language. It is part of the signed-in product and is separate from this public FinFlow Guide. This website guide does not access your account records or perform bookkeeping actions.",
    href: "/pricing", linkLabel: "See plans with AI Bookkeeper",
  },
  {
    id: "tax", title: "Does FinFlow Track provide tax tools?",
    keywords: ["tax", "tax tracking", "tax period", "tax return", "tax calendar", "tax deadline"],
    response: "The product feature catalog includes tax-period and tax-calendar tools on eligible paid plans. FinFlow Track is a record-management tool, not a substitute for a qualified tax professional. Confirm tax treatment and filing obligations with an appropriately qualified adviser.",
    href: "/features", linkLabel: "Review product features",
  },
  {
    id: "payroll", title: "Does FinFlow Track include payroll?",
    keywords: ["payroll", "payslip", "pay run", "employee salary", "hr", "human resources", "leave management"],
    response: "HR and payroll capabilities are listed under the Business plan feature set, not the Free plan. The product includes employee and leave management and pay-run tools. Payroll rules can change, so confirm statutory requirements with a qualified local professional.",
    href: "/pricing", linkLabel: "Compare Business plan features",
  },
  {
    id: "crm", title: "Does FinFlow Track include CRM?",
    keywords: ["crm", "customer relationship management", "sales pipeline", "deals pipeline", "manage leads"],
    response: "The Business plan feature list includes CRM capabilities such as customer records and a deals pipeline. Customer management is also included in the Free plan; the broader CRM feature set is plan-dependent.",
    href: "/pricing", linkLabel: "Compare plans",
  },
  {
    id: "upgrade", title: "How do I upgrade my subscription?",
    keywords: ["upgrade", "change plan", "subscribe", "subscription", "professional plan", "business plan", "paid plan"],
    response: "Review the pricing comparison to choose the plan that matches your required features, company count and team size. You can then use the plan action on the pricing page or manage your subscription from your account. If you need help with a billing issue, contact the team.",
    href: "/pricing", linkLabel: "Compare plans",
  },
  {
    id: "security", title: "How is my business data protected?",
    keywords: ["security", "secure", "data protection", "privacy", "financial data", "account safety", "permissions"],
    response: "FinFlow Track uses secure authentication, company-scoped access and role-based permissions. The application uses HTTPS. For details about data handling, review the Security page and Privacy Policy linked from the website.",
    href: "/help", linkLabel: "Visit the Help Center",
  },
  {
    id: "password", title: "I cannot sign in or need to reset my password",
    keywords: ["forgot password", "reset password", "can't login", "cannot login", "sign in problem", "login issue", "locked out"],
    response: "If you cannot sign in, use the account recovery or password-reset option on the sign-in screen and check that you are using the email associated with your account. If the issue continues, contact support. Never share your password or verification codes with anyone.",
    href: "/auth?mode=login", linkLabel: "Open sign in",
  },
  {
    id: "support", title: "How do I contact FinFlow Track support?",
    keywords: ["contact support", "talk to support", "customer service", "human agent", "speak to someone", "help me", "contact team"],
    response: "For account-specific questions, billing problems or anything this guide cannot verify, contact the FinFlow Track team. Do not send passwords, one-time codes or sensitive financial details through a public chat.",
    href: "/contact", linkLabel: "Contact FinFlow Track",
  },
  {
    id: "accountant", title: "Does FinFlow Track replace an accountant?",
    keywords: ["replace accountant", "accountant", "bookkeeper service", "tax adviser", "professional advice"],
    response: "No. FinFlow Track helps organize business records and financial workflows, but it does not replace a qualified accountant or tax adviser. Seek professional advice for accounting judgments, tax treatment and compliance decisions.",
    href: "/features", linkLabel: "Explore the platform",
  },
  {
    id: "guide", title: "Where can I find step-by-step tutorials?",
    keywords: ["tutorial", "walkthrough", "how to use", "instructions", "user guide", "documentation", "learn finflow"],
    response: "The getting-started guides walk through the dashboard, company setup, adding customers, creating invoices, recording payments and reviewing receivables. The Help Center covers broader account, billing and troubleshooting topics.",
    href: "/guides", linkLabel: "Open step-by-step guides",
  },
  {
    id: "help", title: "Where can I get more help?",
    keywords: ["help", "support", "problem", "issue", "not working", "question"],
    response: "Visit the Help Center for common account, invoicing, expense, inventory, subscription and reporting questions. If you need personal assistance, use the contact page.",
    href: "/help", linkLabel: "Open Help Center",
  },
];

const SUGGESTIONS = [
  "What can I do on the Free plan?",
  "How do I create an invoice?",
  "Is AI Bookkeeper included?",
  "How do I get started?",
];

const STOP_WORDS = new Set(["a","an","and","are","can","do","does","for","how","i","in","is","it","me","my","of","on","or","the","to","what","when","where","which","with","you","your"]);

function normalizeQuestion(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findAnswer(question: string): Answer | undefined {
  const normalized = normalizeQuestion(question);
  if (!normalized) return undefined;
  const tokens = normalized.split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  let best: Answer | undefined;
  let bestScore = 0;
  let secondScore = 0;

  for (const answer of ANSWERS) {
    let score = 0;
    const title = normalizeQuestion(answer.title);
    if (normalized === title) score += 8;
    for (const keyword of answer.keywords) {
      const term = normalizeQuestion(keyword);
      if (normalized.includes(term)) score += term.includes(" ") ? 5 : 2;
    }
    const answerTerms = new Set(
      [answer.title, ...answer.keywords].flatMap((item) => normalizeQuestion(item).split(" ")),
    );
    const overlap = tokens.filter((token) => answerTerms.has(token)).length;
    score += overlap * 1.5;
    if (score > bestScore) {
      secondScore = bestScore;
      best = answer;
      bestScore = score;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  // Require a meaningful match; avoid confidently answering an unrelated question.
  if (bestScore < 2.5) return undefined;
  if (secondScore > 0 && bestScore - secondScore < 1) return undefined;
  return best;
}

export function FinFlowGuide({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const isPublicPage = !/^\/(auth|dashboard|app|onboarding|settings)(\/|$)/.test(pathname);
  const latestAnswer = useMemo(() => {
    const last = asked[asked.length - 1];
    return last ? findAnswer(last) : undefined;
  }, [asked]);

  if (!isPublicPage) return null;

  function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setAsked((current) => [...current, trimmed]);
    setQuestion("");
    setShowAll(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] sm:bottom-6 sm:right-6">
      {open && (
        <section
          aria-label="FinFlow Guide chat"
          className="mb-3 flex h-[min(620px,calc(100dvh-110px))] w-[min(calc(100vw-2rem),390px)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
        >
          <header className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="font-semibold">FinFlow Guide</p>
              <p className="text-xs text-primary-foreground/80">Product and getting-started help</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-2 hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-muted p-3 text-sm">
              Hi! I’m FinFlow Guide. I can help you understand FinFlow Track, compare plans and find
              setup instructions. What would you like to know?
            </div>

            {asked.map((item, index) => {
              const answer = findAnswer(item);
              return (
                <div key={index} className="space-y-2">
                  <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {item}
                  </div>
                  <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-muted p-3 text-sm">
                    {answer ? (
                      <>
                        <p>{answer.response}</p>
                        {answer.href && (
                          <Link
                            to={answer.href as never}
                            className="mt-2 inline-flex font-medium text-primary underline underline-offset-4"
                          >
                            {answer.linkLabel}
                          </Link>
                        )}
                      </>
                    ) : (
                      <>
                        I don’t have a verified answer to that yet. I don’t want to guess about
                        product features or plan limits. Try the Help Center or contact our team.
                        <div className="mt-2 flex flex-wrap gap-3">
                          <Link
                            to="/help"
                            className="font-medium text-primary underline underline-offset-4"
                          >
                            Help Center
                          </Link>
                          <Link
                            to="/contact"
                            className="font-medium text-primary underline underline-offset-4"
                          >
                            Contact
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {asked.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">POPULAR QUESTIONS</p>
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => ask(item)}
                    className="block w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAll((value) => !value)}
                  className="pt-1 text-xs font-medium text-primary underline underline-offset-4"
                >
                  {showAll ? "Hide all questions" : "Browse all questions"}
                </button>
              </div>
            )}
            {asked.length > 0 && !latestAnswer && (
              <p className="text-xs text-muted-foreground">
                Answers are based on published FinFlow Track information. The guide may not cover
                every question yet.
              </p>
            )}
            {asked.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAsked([]);
                  setShowAll(false);
                }}
                className="text-xs text-muted-foreground underline underline-offset-4"
              >
                Start a new conversation
              </button>
            )}
            {showAll &&
              ANSWERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => ask(item.title)}
                  className="block w-full rounded-xl border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {item.title}
                </button>
              ))}
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t p-3">
            <label htmlFor="finflow-guide-question" className="sr-only">
              Ask FinFlow Guide a question
            </label>
            <input
              id="finflow-guide-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question..."
              className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              maxLength={240}
            />
            <button
              type="submit"
              disabled={!question.trim()}
              aria-label="Send question"
              className="rounded-xl bg-primary p-2 text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <footer className="border-t px-3 py-2 text-center text-[11px] text-muted-foreground">
            Automated FAQ guide · Answers may not cover every situation
          </footer>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close FinFlow Guide" : "Open FinFlow Guide"}
        aria-expanded={open}
        className="ml-auto flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span>{open ? "Close" : "Ask FinFlow"}</span>
      </button>
    </div>
  );
}
