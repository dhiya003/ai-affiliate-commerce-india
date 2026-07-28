import { z } from "zod";
import { POLICY_KINDS, POLICY_STATUSES, type PolicyKind } from "./types";

export const policyListQuerySchema = z.object({
  marketplace: z.string().trim().max(40).optional(),
  kind: z.enum(POLICY_KINDS).optional(),
  status: z.enum(POLICY_STATUSES).optional(),
});

export const policyStatusInputSchema = z.object({
  status: z.enum(POLICY_STATUSES),
});

export const policyKindSchema = z
  .string()
  .transform((value) => value.toUpperCase())
  .pipe(z.enum(POLICY_KINDS));

export type PolicyListQuery = z.infer<typeof policyListQuerySchema>;
export type PolicyStatusInput = z.infer<typeof policyStatusInputSchema>;

export function policyKind(value: string): PolicyKind {
  return policyKindSchema.parse(value);
}
