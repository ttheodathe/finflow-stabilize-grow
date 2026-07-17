import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  plan: z.enum(["free", "starter", "pro", "business", "enterprise"]).optional(),
});

export const Route = createFileRoute("/signup")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth",
      search: { mode: "signup", ...(search.plan ? { plan: search.plan } : {}) },
    });
  },
});