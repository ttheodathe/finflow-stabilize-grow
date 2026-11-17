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
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }),
  ).min(1).max(30),
});

const CategorizeInput = z.object({
  companyId: z.string().uuid(),
});

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
    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError || !membership) throw new Error("You do not have access to this company.");

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
      supabase.from("items").select("name,type,price,stock_quantity,track_inventory").eq("company_id", data.companyId).limit(200),
    ]);

    const summary = {
      invoices: inv.data ?? [],
      expenses: exp.data ?? [],
      customers: cust.data ?? [],
      items: items.data ?? [],
    };

    const system = `You are an AI bookkeeper for a small business. Use the JSON dataset below to answer questions concisely with concrete numbers. Compute revenue, profit, top customers, category spend, cash trends, overdue invoices, or inventory as needed. Format money with the invoice/expense currency. Be brief and useful. If data is missing, say so.\n\nDATA:\n${JSON.stringify(summary).slice(0, 60000)}`;

    const text = await callGemini([{ role: "system", content: system }, ...data.messages], key);
    return { reply: text };
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
    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError || !membership) throw new Error("You do not have access to this company.");
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
      parsed = Array.isArray(obj) ? obj : (obj?.results ?? []);
    } catch {
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) parsed = JSON.parse(m[0]);
    }
    let updated = 0;
    for (const p of parsed) {
      if (!p?.id || !p?.category) continue;
      const cat = CATEGORIES.includes(p.category) ? p.category : "Other";
      const { error: e } = await supabase.from("expenses").update({ category: cat }).eq("id", p.id).eq("company_id", data.companyId);
      if (!e) updated++;
    }
    return { updated };
  });
