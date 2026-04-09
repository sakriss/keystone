/**
 * Calculates the monthly principal + interest payment for a fixed-rate mortgage.
 * Used by the Scenario Builder and True Cost of Ownership pages.
 */
export function calculateMonthlyPI(
  loanAmount: number,
  annualRatePercent: number,
  termYears: number
): number {
  if (loanAmount <= 0) return 0
  if (annualRatePercent === 0) return loanAmount / (termYears * 12)
  const r = annualRatePercent / 100 / 12
  const n = termYears * 12
  return (loanAmount * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1)
}
