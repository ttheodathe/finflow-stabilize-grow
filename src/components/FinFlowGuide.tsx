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
    id: "overview",
    title: "What is FinFlow Track?",
    keywords: [
      "what is finflow",
      "about finflow",
      "what does finflow do",
      "accounting software",
      "overview",
    ],
    response:
      "FinFlow Track helps freelancers and businesses organize everyday finances with invoicing, expense tracking, customer management and financial reports.",
    href: "/features",
    linkLabel: "Explore features",
  },
  {
    id: "free",
    title: "What can I do on the Free plan?",
    keywords: [
      "free plan",
      "free version",
      "free account",
      "cost",
      "price",
      "pricing",
      "how much",
      "credit card",
    ],
    response:
      "The Free plan includes basic accounting, invoice creation, expense tracking, customer management and basic reports. You can review the current plan details on our pricing page.",
    href: "/pricing",
    linkLabel: "Compare plans",
  },
  {
    id: "invoice",
    title: "How do I create an invoice?",
    keywords: ["invoice", "invoicing", "bill a client", "send invoice", "pdf", "payment link"],
    response:
      "Create an invoice from your FinFlow Track account, add the relevant customer and invoice details, then use the available PDF export or sharing options to send it to your customer.",
    href: "/guides",
    linkLabel: "View getting-started guides",
  },
  {
    id: "expenses",
    title: "Can I track expenses?",
    keywords: ["expense", "expenses", "spending", "costs", "record a purchase"],
    response: "Yes. FinFlow Track includes expense tracking so you can record and review business expenses alongside your other financial activity.",
    href: "/guides",
    linkLabel: "Explore the guides",
  },
  {
    id: "reports",
    title: "What financial reports are available?",
    keywords: ["report", "reports", "profit", "loss", "balance sheet", "cash flow", "receivables", "payables"],
    response:
      "FinFlow Track provides financial reporting such as profit and loss, balance sheet, cash flow and aging reports. The reports available to you depend on your plan.",
    href: "/features",
    linkLabel: "Explore reporting features",
  },
  {
    id: "ai",
    title: "Is AI Bookkeeper included?",
    keywords: ["ai", "bookkeeper", "artificial intelligence", "automatically bookkeep"],
    response:
      "AI Bookkeeper is a paid-plan feature. It is separate from FinFlow Guide, this website assistant, which only answers public product and getting-started questions.",
    href: "/pricing",
    linkLabel: "See plan details",
  },
  {
    id: "teams",
    title: "Can I work with a team?",
    keywords: ["team", "teams", "staff", "employees", "permissions", "roles", "multiple users"],
    response:
      "FinFlow Track supports team members and role-based permissions on eligible plans. Check the pricing page for the current plan limits.",
    href: "/pricing",
    linkLabel: "Compare plans",
  },
  {
    id: "currency",
    title: "Does FinFlow Track support multiple currencies?",
    keywords: ["currency", "currencies", "exchange rate", "multi currency", "foreign currency"],
    response:
      "FinFlow Track supports recording transactions in multiple currencies and locks the exchange rate when a transaction is recorded.",
    href: "/features",
    linkLabel: "Explore features",
  },
  {
    id: "start",
    title: "How do I get started?",
    keywords: ["get started", "sign up", "signup", "create account", "register", "begin"],
    response:
      "You can create an account from the signup page. After signing in, follow the in-app steps to set up your business and begin using the available finance tools.",
    href: "/auth?mode=signup",
    linkLabel: "Create your account",
  },
  {
    id: "help",
    title: "Where can I get more help?",
    keywords: ["help", "support", "contact", "problem", "issue", "talk to someone"],
    response:
      "Visit the Help Center for answers to common account, invoicing, expense and reporting questions. If you need personal assistance, use the contact page.",
    href: "/help",
    linkLabel: "Open Help Center",
  },
];

const SUGGESTIONS = [
  "What can I do on the Free plan?",
  "How do I create an invoice?",
  "Is AI Bookkeeper included?",
  "How do I get started?",
];

function findAnswer(question: string): Answer | undefined {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return undefined;

  let best: Answer | undefined;
  let bestScore = 0;
  for (const answer of ANSWERS) {
    let score = 0;
    for (const keyword of answer.keywords) {
      const term = keyword.toLowerCase();
      if (normalized.includes(term)) score += term.includes(" ") ? 3 : 1;
      else if (term.length > 4 && normalized.split(" ").includes(term)) score += 1;
    }
    if (score > bestScore) {
      best = answer;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : undefined;
}

export function FinFlowGuide({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const isPublicPage = !/^\/(auth|dashboard|app|onboarding|settings)(\/|$)/.test(
    pathname,
  );
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
              <p className="text-xs text-primary-foreground/80">
                Product and getting-started help
              </p>
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
              Hi! I’m FinFlow Guide. I can help you understand FinFlow Track, compare plans and find setup instructions. What would you like to know?
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
                        I don’t have a verified answer to that yet. I don’t want to
                        guess about product features or plan limits. Try the Help
                        Center or contact our team.
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
