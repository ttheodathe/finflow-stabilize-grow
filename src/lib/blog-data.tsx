import type { ReactNode } from "react";
import {
  BadgeCheck,
  BookOpen,
  Boxes,
  Calculator,
  Receipt,
  Rocket,
  TrendingUp,
  Wallet,
} from "lucide-react";

export const editorialTeam = {
  name: "FinFlowTrack Editorial Team",
  bio: "Business finance writers and product specialists creating practical resources about accounting, financial management, and business operations.",
  expertise: ["Accounting software", "Business finance", "Small business operations"],
};

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: typeof BookOpen;
  previewArticles: string[];
}

export const blogCategories: BlogCategory[] = [
  {
    id: "accounting-basics",
    name: "Accounting Basics",
    slug: "accounting-basics",
    description: "Core concepts every business owner should understand.",
    icon: Calculator,
    previewArticles: [
      "What is accounting?",
      "Bookkeeping vs. accounting",
      "Revenue vs. profit",
      "Understanding cash flow",
      "Financial statements explained",
    ],
  },
  {
    id: "small-business-finance",
    name: "Small Business Finance",
    slug: "small-business-finance",
    description: "Practical finance guidance for growing businesses.",
    icon: TrendingUp,
    previewArticles: [
      "Managing business cash flow",
      "Creating a business budget",
      "Financial mistakes businesses make",
      "Startup finance basics",
    ],
  },
  {
    id: "invoicing-payments",
    name: "Invoicing & Payments",
    slug: "invoicing-payments",
    description: "Get paid faster with better invoicing habits.",
    icon: Receipt,
    previewArticles: [
      "Creating professional invoices",
      "Invoice payment terms",
      "Reducing late payments",
      "Digital invoicing benefits",
    ],
  },
  {
    id: "expense-management",
    name: "Expense Management",
    slug: "expense-management",
    description: "Keep business spending organized and audit-ready.",
    icon: Wallet,
    previewArticles: [
      "Tracking business expenses",
      "Expense categories",
      "Receipt management",
      "Preparing financial records",
    ],
  },
  {
    id: "inventory-management",
    name: "Inventory Management",
    slug: "inventory-management",
    description: "Keep stock levels healthy across your business.",
    icon: Boxes,
    previewArticles: [
      "Inventory management basics",
      "Stock control",
      "Warehouse management",
      "Preventing stock shortages",
    ],
  },
  {
    id: "accounting-software",
    name: "Accounting Software",
    slug: "accounting-software",
    description: "What to look for when choosing accounting tools.",
    icon: BadgeCheck,
    previewArticles: [
      "What is accounting software?",
      "Benefits of cloud accounting",
      "Choosing accounting software",
      "Free accounting software guide",
    ],
  },
  {
    id: "entrepreneurship",
    name: "Entrepreneurship",
    slug: "entrepreneurship",
    description: "Building the habits and systems behind a healthy business.",
    icon: Rocket,
    previewArticles: [
      "Starting a small business",
      "Building financial systems",
      "Entrepreneur finance habits",
    ],
  },
];

export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  categorySlug: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  content: ReactNode;
  relatedSlugs: string[];
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
      {children}
    </div>
  );
}

export const blogArticles: BlogArticle[] = [
  {
    slug: "complete-guide-to-small-business-accounting",
    title: "The Complete Guide to Small Business Accounting",
    excerpt:
      "A practical, no-jargon walkthrough of what accounting actually involves and how to build a simple system that works for your business.",
    categorySlug: "accounting-basics",
    author: editorialTeam.name,
    publishedAt: "July 1, 2026",
    updatedAt: "July 12, 2026",
    readTime: "9 min read",
    relatedSlugs: [
      "understanding-cash-flow-basics",
      "what-is-accounting-software",
      "tracking-business-expenses-guide",
    ],
    content: (
      <>
        <p>
          Accounting can feel intimidating when you're running a small
          business, but at its core it's simply the practice of recording,
          organizing, and understanding your money. This guide walks through
          the basics every business owner should know, without assuming any
          prior accounting background.
        </p>
        <h2>What accounting actually covers</h2>
        <p>
          Accounting includes everything from recording daily transactions
          to producing the reports that tell you whether your business is
          healthy. In practice, that usually means tracking income and
          expenses, issuing and following up on invoices, and periodically
          reviewing reports like profit and loss statements.
        </p>
        <h2>The core habits that make accounting manageable</h2>
        <ul>
          <li>Record transactions as they happen, not weeks later.</li>
          <li>Keep business and personal spending separate.</li>
          <li>Reconcile your records against your bank statements regularly.</li>
          <li>Review a simple report at least once a month.</li>
        </ul>
        <Callout>
          <strong>In practice:</strong> Tools like FinFlowTrack automate the
          recording and reporting side of this, so you spend less time on
          data entry and more time reviewing what the numbers are telling
          you.
        </Callout>
        <h2>Financial statements, briefly explained</h2>
        <p>
          You don't need to memorize accounting terminology to run a
          healthy business, but three reports are worth understanding:
        </p>
        <table>
          <thead>
            <tr>
              <th>Report</th>
              <th>What it tells you</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Profit &amp; Loss</td>
              <td>Whether you made or lost money over a period</td>
            </tr>
            <tr>
              <td>Balance Sheet</td>
              <td>What you own and owe at a point in time</td>
            </tr>
            <tr>
              <td>Cash Flow Statement</td>
              <td>How cash actually moved in and out of your business</td>
            </tr>
          </tbody>
        </table>
        <p>
          Once these habits and reports feel familiar, accounting stops
          being a mystery and starts being a tool you actually use to make
          decisions.
        </p>
      </>
    ),
  },
  {
    slug: "understanding-cash-flow-basics",
    title: "Understanding Cash Flow: A Beginner's Guide",
    excerpt:
      "Profit and cash flow are not the same thing. Here's how to think about the money actually moving through your business.",
    categorySlug: "accounting-basics",
    author: editorialTeam.name,
    publishedAt: "June 20, 2026",
    updatedAt: "July 5, 2026",
    readTime: "6 min read",
    relatedSlugs: [
      "complete-guide-to-small-business-accounting",
      "managing-business-cash-flow",
      "reducing-late-invoice-payments",
    ],
    content: (
      <>
        <p>
          It's possible to be profitable on paper and still run out of cash.
          That gap is exactly what cash flow measures: the actual timing of
          money moving in and out of your business.
        </p>
        <h2>Why the distinction matters</h2>
        <p>
          Profit is calculated over a period, but cash arrives and leaves on
          its own schedule. A large invoice that hasn't been paid yet counts
          toward your profit, but it isn't cash you can use to pay rent or
          payroll today.
        </p>
        <h2>Common causes of cash flow problems</h2>
        <ul>
          <li>Customers paying invoices late</li>
          <li>Too much cash tied up in unsold inventory</li>
          <li>Seasonal dips in revenue</li>
          <li>Upfront costs for growth outpacing incoming cash</li>
        </ul>
        <Callout>
          <strong>Quick check:</strong> If you can answer "how much cash do I
          have available right now, and what's due in the next 30 days?" at
          any moment, you're in a strong position to manage cash flow
          proactively.
        </Callout>
        <p>
          Reviewing a simple cash flow report regularly — weekly if your
          margins are tight — makes it much easier to spot problems before
          they become urgent.
        </p>
      </>
    ),
  },
  {
    slug: "how-to-create-professional-invoices",
    title: "How to Create Professional Invoices That Get Paid Faster",
    excerpt:
      "The details that make an invoice look professional also make it easier for customers to pay on time.",
    categorySlug: "invoicing-payments",
    author: editorialTeam.name,
    publishedAt: "June 15, 2026",
    updatedAt: "June 15, 2026",
    readTime: "7 min read",
    relatedSlugs: [
      "reducing-late-invoice-payments",
      "tracking-business-expenses-guide",
      "what-is-accounting-software",
    ],
    content: (
      <>
        <p>
          A well-structured invoice does more than look professional — it
          removes friction from the payment process, which means you get
          paid faster.
        </p>
        <h2>What every invoice should include</h2>
        <ul>
          <li>A unique invoice number for easy reference</li>
          <li>Your business details and the customer's details</li>
          <li>A clear description of what was delivered</li>
          <li>The amount due and the due date, stated plainly</li>
          <li>Accepted payment methods</li>
        </ul>
        <h2>Invoice numbering best practices</h2>
        <p>
          A consistent numbering system (like sequential numbers or a
          year-based prefix) makes it easy to track which invoices are
          outstanding and avoids the confusion of duplicate or missing
          numbers.
        </p>
        <Callout>
          <strong>In practice:</strong> FinFlowTrack generates sequential
          invoice numbers automatically and tracks each invoice's status, so
          you always know what's paid, pending, or overdue.
        </Callout>
        <h2>Making payment terms clear</h2>
        <p>
          State your payment terms directly on the invoice — for example,
          "Due within 14 days." Ambiguous terms are one of the most common,
          avoidable causes of late payment.
        </p>
      </>
    ),
  },
  {
    slug: "reducing-late-invoice-payments",
    title: "5 Practical Ways to Reduce Late Invoice Payments",
    excerpt:
      "Small changes to how you invoice and follow up can meaningfully shorten how long it takes to get paid.",
    categorySlug: "invoicing-payments",
    author: editorialTeam.name,
    publishedAt: "June 8, 2026",
    updatedAt: "June 8, 2026",
    readTime: "5 min read",
    relatedSlugs: [
      "how-to-create-professional-invoices",
      "understanding-cash-flow-basics",
    ],
    content: (
      <>
        <p>
          Late payments are one of the most common cash flow challenges for
          small businesses. A few consistent habits can noticeably reduce
          how often they happen.
        </p>
        <ol>
          <li>Send invoices immediately after delivering work, not weeks later.</li>
          <li>State payment terms clearly, including the exact due date.</li>
          <li>Send a polite reminder a few days before the due date.</li>
          <li>Follow up promptly — and consistently — once an invoice is overdue.</li>
          <li>Offer more than one payment method to reduce friction.</li>
        </ol>
        <Callout>
          Automated status tracking, like the kind built into FinFlowTrack,
          makes it easy to see which invoices need a follow-up without
          manually checking each one.
        </Callout>
      </>
    ),
  },
  {
    slug: "tracking-business-expenses-guide",
    title: "A Practical Guide to Tracking Business Expenses",
    excerpt:
      "Consistent expense tracking makes tax season easier and gives you a clearer picture of where your money goes.",
    categorySlug: "expense-management",
    author: editorialTeam.name,
    publishedAt: "May 28, 2026",
    updatedAt: "June 2, 2026",
    readTime: "6 min read",
    relatedSlugs: [
      "complete-guide-to-small-business-accounting",
      "managing-business-cash-flow",
    ],
    content: (
      <>
        <p>
          Expense tracking is one of the simplest habits to build, and one
          of the most valuable — both for day-to-day decision-making and for
          staying organized ahead of tax season.
        </p>
        <h2>Set up expense categories that match your business</h2>
        <p>
          Generic categories like "office supplies" or "software" work for
          many businesses, but it's worth tailoring categories to how your
          business actually spends money, so your reports stay useful.
        </p>
        <h2>Keep business and personal spending separate</h2>
        <p>
          Mixing personal and business expenses is one of the most common
          sources of confusion at tax time. A dedicated business account
          and card make this far easier to maintain.
        </p>
        <Callout>
          <strong>In practice:</strong> Recording expenses as they happen —
          rather than reconstructing them from memory later — is the single
          biggest factor in keeping your records accurate.
        </Callout>
        <h2>Hold onto your receipts</h2>
        <p>
          Whether digital or physical, keeping receipts organized and
          attached to the right expense entry makes it much easier to
          verify records later, whether for your own review or a tax
          filing.
        </p>
      </>
    ),
  },
  {
    slug: "inventory-management-basics",
    title: "Inventory Management Basics for Growing Businesses",
    excerpt:
      "The fundamentals of tracking stock accurately, so you avoid both shortages and excess inventory.",
    categorySlug: "inventory-management",
    author: editorialTeam.name,
    publishedAt: "May 18, 2026",
    updatedAt: "May 18, 2026",
    readTime: "7 min read",
    relatedSlugs: ["what-is-accounting-software", "complete-guide-to-small-business-accounting"],
    content: (
      <>
        <p>
          Inventory ties up cash, space, and attention. Managing it well
          means having enough stock to meet demand without tying up more
          capital than necessary.
        </p>
        <h2>Core practices worth building early</h2>
        <ul>
          <li>Record stock movements as they happen, not in batches.</li>
          <li>Set reorder points before you run out, not after.</li>
          <li>Review slow-moving stock regularly.</li>
          <li>Reconcile physical counts against your records periodically.</li>
        </ul>
        <Callout>
          Low-stock alerts and centralized stock records — both part of
          FinFlowTrack's inventory foundation — help catch shortages before
          they affect customers.
        </Callout>
        <p>
          As your product range grows, these habits scale with you far more
          easily than trying to track inventory in spreadsheets.
        </p>
      </>
    ),
  },
  {
    slug: "what-is-accounting-software",
    title: "What Is Accounting Software, and Do You Actually Need It?",
    excerpt:
      "A grounded look at what accounting software does, and when spreadsheets stop being enough.",
    categorySlug: "accounting-software",
    author: editorialTeam.name,
    publishedAt: "May 10, 2026",
    updatedAt: "May 10, 2026",
    readTime: "6 min read",
    relatedSlugs: ["complete-guide-to-small-business-accounting", "inventory-management-basics"],
    content: (
      <>
        <p>
          Accounting software automates the recording, organizing, and
          reporting of financial data — tasks many businesses start out
          doing manually in spreadsheets.
        </p>
        <h2>Where spreadsheets start to break down</h2>
        <p>
          Spreadsheets work fine for a handful of transactions a month. As
          transaction volume grows, or once a team needs shared access,
          manual formulas and version control become genuine risks to
          accuracy.
        </p>
        <h2>What cloud accounting software typically adds</h2>
        <ul>
          <li>Centralized, always-current records accessible from anywhere</li>
          <li>Automatic calculations that reduce manual errors</li>
          <li>Role-based access for teams</li>
          <li>Reports generated on demand instead of built by hand</li>
        </ul>
        <Callout>
          The right time to switch is usually when manual tracking starts
          costing you more time than the software would — not before.
        </Callout>
      </>
    ),
  },
  {
    slug: "managing-business-cash-flow",
    title: "Managing Business Cash Flow: A Small Business Playbook",
    excerpt:
      "Concrete habits for keeping cash flow healthy, especially when revenue is seasonal or unpredictable.",
    categorySlug: "small-business-finance",
    author: editorialTeam.name,
    publishedAt: "April 30, 2026",
    updatedAt: "May 6, 2026",
    readTime: "8 min read",
    relatedSlugs: ["understanding-cash-flow-basics", "tracking-business-expenses-guide"],
    content: (
      <>
        <p>
          Healthy cash flow isn't about how much revenue you generate — it's
          about whether cash arrives in time to cover what's due.
        </p>
        <h2>Build a simple cash flow forecast</h2>
        <p>
          Even a basic forecast — expected income and expenses over the next
          four to eight weeks — makes it far easier to spot a shortfall
          before it happens.
        </p>
        <h2>Shorten the gap between work and payment</h2>
        <ul>
          <li>Invoice promptly rather than in batches</li>
          <li>Consider deposits for larger projects</li>
          <li>Follow up on overdue invoices consistently</li>
        </ul>
        <Callout>
          Reviewing your cash position weekly, rather than only at month-end,
          gives you far more time to react to a shortfall.
        </Callout>
      </>
    ),
  },
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return blogArticles.find((article) => article.slug === slug);
}

export function getCategoryBySlug(slug: string): BlogCategory | undefined {
  return blogCategories.find((category) => category.slug === slug);
}

export function getRelatedArticles(article: BlogArticle): BlogArticle[] {
  return article.relatedSlugs
    .map((slug) => getArticleBySlug(slug))
    .filter((related): related is BlogArticle => Boolean(related));
}
