import { z } from "zod";

export const demoRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  businessType: z.enum([
    "small_business",
    "freelancer",
    "startup",
    "nonprofit",
    "agency",
    "other",
  ]),
  challenge: z.string().trim().min(20).max(2000),
  preferredTime: z.enum(["morning", "afternoon", "evening", "flexible"]),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  demoContactConsent: z.literal(true),
  marketingConsent: z.boolean().default(false),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
