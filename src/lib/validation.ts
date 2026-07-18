import { z } from "zod";

const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.]{1,12}$/, "Invalid symbol");

export const quotesRequestSchema = z.object({
  symbols: z
    .array(symbolSchema)
    .min(1)
    .max(20)
    .transform((symbols) => [...new Set(symbols)]),
});

export const thesisInputSchema = z.object({
  symbol: symbolSchema,
  title: z.string().trim().min(3).max(80),
  thesis: z.string().trim().min(20).max(2000),
  conviction: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export const goalInputSchema = z.object({
  title: z.string().trim().min(3).max(80),
  targetAmount: z.number().finite().positive().max(1_000_000_000),
  category: z.enum(["retirement", "home", "vacation", "education", "other"]),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export const moodInputSchema = z.object({
  mood: z.enum(["calm", "confident", "anxious", "fomo", "neutral"]),
  note: z.string().trim().max(280).optional(),
});

export const investorQuizSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).length(4),
});

/** Strip control characters from user-authored text before persistence. */
export function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}
