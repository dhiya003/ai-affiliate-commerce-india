export {
  calculateOpportunityScore,
  calculateOpportunityScores,
} from "./engine.ts";
export { productScoringInputSchema } from "./schema.ts";
export type {
  BulkScoreResult,
  ProductScoreResult,
  ProductScoringInput,
  ReturnRiskLevel,
  ScoreBreakdown,
  ScoreExplanation,
} from "./types.ts";
export { SCORE_VERSION } from "./types.ts";
export {
  calculateOpportunityScoreV2,
  productScoringV2InputSchema,
  SCORE_VERSION_V2,
} from "./v2.ts";
export type { ProductScoringV2Input } from "./v2.ts";
