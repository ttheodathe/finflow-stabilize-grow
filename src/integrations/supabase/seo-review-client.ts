import { createClient } from "@supabase/supabase-js";

const reviewUrl = import.meta.env.VITE_SEO_REVIEW_SUPABASE_URL;
const reviewAnonKey = import.meta.env.VITE_SEO_REVIEW_SUPABASE_ANON_KEY;

// This client is intentionally isolated from the production Supabase client.
// Configure these variables only in a Vercel Preview environment that targets
// the isolated SEO acceptance project.
export const seoReviewSupabase =
  reviewUrl && reviewAnonKey
    ? createClient(reviewUrl, reviewAnonKey, {
        auth: {
          storage: typeof window !== "undefined" ? localStorage : undefined,
          storageKey: "finflow-seo-review-acceptance-auth",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
