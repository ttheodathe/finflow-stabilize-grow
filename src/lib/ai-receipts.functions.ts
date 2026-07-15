import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(20),
});

export type ParsedReceipt = {
  vendor: string | null;
  amount: number | null;
  currency: string;
  expense_date: string | null;
  category: string | null;
  description: string | null;
};

export const parseReceipt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<ParsedReceipt> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You extract structured expense data from receipt images. Reply with ONLY a JSON object using the keys: vendor (string), amount (number, total paid), currency (3-letter ISO, default USD), expense_date (YYYY-MM-DD), category (one of: Meals, Travel, Software, Office, Utilities, Marketing, Equipment, Other), description (short string). Use null when unknown. No prose, no markdown fences.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract expense data from this receipt." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Please retry in a moment.");
      if (res.status === 402)
        throw new Error("AI credits exhausted. Upgrade your plan to continue scanning receipts.");
      throw new Error(`AI gateway error (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json\s*|```/g, "").trim();
    let parsed: Partial<ParsedReceipt> = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    return {
      vendor: parsed.vendor ?? null,
      amount: typeof parsed.amount === "number" ? parsed.amount : Number(parsed.amount) || null,
      currency: parsed.currency || "USD",
      expense_date: parsed.expense_date ?? null,
      category: parsed.category ?? null,
      description: parsed.description ?? null,
    };
  });
