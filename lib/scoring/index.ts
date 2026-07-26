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
