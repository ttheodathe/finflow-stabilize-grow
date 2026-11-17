import { getGeminiApiKey, callGeminiChatCompletion } from "@/lib/ai-key";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertFeature } from "@/lib/features/plan-guard";

const CATEGORIES = [
  "Meals",
  "Travel",
  "Software",
  "Office",
  "Utilities",
  "Marketing",
  "Equipment",
  "Payroll",
  "Rent",
  "Professional Services",
  "Other",
];

async function callGemini(messages: any[], key: string, jsonMode = false) {
  return callGeminiChatCompletion(
    {
      model: "gemini-3.6-flash",
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages,
    },
    key,
  );
}

const ChatInput = z.object({
  companyId: z.string().uuid(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(30),
});

const CategorizeInput = z.object({
  companyId: z.string().uuid(),
});

async function requireActiveMembership(supabase: any, userId: string, companyId: string) {
  const { data, error } = await supabase
    .from("company_members")
    .select("id,role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) throw new Error("You do not have access to this company.");
  return data as { id: string; role: string };
}

export const askBookkeeper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertFeature(
      supabase,
      { userId: context.userId, companyId: data.companyId },
      "aiBookkeeper",
    );
    await requireActiveMembership(supabase, context.userId, data.companyId);

    const key = getGeminiApiKey();
    const [inv, exp, cust, items] = await Promise.all([
      supabase
        .from("invoices")
        .select("invoice_number,status,total,currency,issue_date,due_date,customer_id")
        .eq("company_id", data.companyId)
        .order("issue_date", { ascending: false })
        .limit(200),
      supabase
        .from("expenses")
        .select("vendor,category,amount,currency,expense_date")
        .eq("company_id", data.companyId)
        .order("expense_date", { ascending: false })
        .limit(200),
      supabase.from("customers").select("id,name").eq("company_id", data.companyId).limit(200),
      supabase
        .from("items")
        .select("name,type,price,stock_quantity,track_inventory")
        .eq("company_id", data.companyId)
        .limit(200),
    ]);

    const queryError = [inv.error, exp.error, cust.error, items.error].find(Boolean);
    if (queryError) throw new Error(queryError.message);

    const summary = {
      invoices: inv.data ?? [],
      expenses: exp.data ?? [],
      customers: cust.data ?? [],
      items: items.data ?? [],
    };

    const system = `You are an AI bookkeeper for a small business. Use only the JSON dataset below to answer questions concisely with concrete numbers. Compute revenue, profit, top customers, category spend, cash trends, overdue invoices, or inventory as needed. Format money with the invoice/expense currency. Be brief and useful. If data is missing, say so. Do not invent transactions, customers, balances, or accounting facts.\n\nDATA:\n${JSON.stringify(summary).slice(0, 60000)}`;

    const reply = await callGemini(
      [{ role: "system", content: system }, ...data.messages],
      key,
    );
    return { reply };
  });

export const categorizeExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => CategorizeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertFeature(
      supabase,
      { userId: context.userId, companyId: data.companyId },
      "documentAi",
    );

    const membership = await requireActiveMembership(supabase, context.userId, data.companyId);
    if (!["owner", "admin", "accountant"].includes(membership.role)) {
      throw new Error("Only owners, admins and accountants may categorize expenses with AI.");
    }

    const key = getGeminiApiKey();
    const { data: rows, error } = await supabase
      .from("expenses")
      .select("id,vendor,description,amount,currency")
      .eq("company_id", data.companyId)
      .or("category.is.null,category.eq.")
      .limit(50);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { updated: 0 };

    const prompt = `Classify each expense into ONE category from this list: ${CATEGORIES.join(", ")}. Reply with ONLY a JSON object shaped like {"results": [{"id": string, "category": string}]}. No prose.\n\nEXPENSES:\n${JSON.stringify(rows)}`;
    const text = await callGemini([{ role: "user", content: prompt }], key, true);
    const cleaned = text.replace(/```json\s*|```/g, "").trim();
    let parsed: { id: string; category: string }[] = [];

    try {
      const obj = JSON.parse(cleaned);
      const candidates = Array.isArray(obj) ? obj : obj?.results;
      parsed = Array.isArray(candidates) ? candidates : [];
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        const candidates = JSON.parse(match[0]);
        parsed = Array.isArray(candidates) ? candidates : [];
      }
    }

    let updated = 0;
    for (const item of parsed) {
      if (!item?.id || !item?.category) continue;
      const category = CATEGORIES.includes(item.category) ? item.category : "Other";
      const { error: updateError } = await supabase
        .from("expenses")
        .update({ category })
        .eq("id", item.id)
        .eq("company_id", data.companyId)
        .or("category.is.null,category.eq.");
      if (!updateError) updated++;
    }

    return { updated };
  });
