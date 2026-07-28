function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export function twoProportionConfidence(
  leftConversions: number,
  leftClicks: number,
  rightConversions: number,
  rightClicks: number,
): number {
  if (
    leftClicks < 1 ||
    rightClicks < 1 ||
    leftConversions < 0 ||
    rightConversions < 0 ||
    leftConversions > leftClicks ||
    rightConversions > rightClicks
  ) {
    return 0;
  }
  const leftRate = leftConversions / leftClicks;
  const rightRate = rightConversions / rightClicks;
  const pooled =
    (leftConversions + rightConversions) / (leftClicks + rightClicks);
  const standardError = Math.sqrt(
    pooled * (1 - pooled) * (1 / leftClicks + 1 / rightClicks),
  );
  if (standardError === 0) return 0;
  const z = Math.abs(leftRate - rightRate) / standardError;
  return Math.max(0, Math.min(0.9999, 2 * normalCdf(z) - 1));
}
