/**
 * Parse a numeric input string that could be integer, decimal, fraction, or mixed number.
 * Returns NaN if invalid.
 */
export function parseNumericInput(input: string): number {
  const s = input.trim();
  if (!s) return NaN;

  // Mixed number: "1 1/2" → 1.5
  const mixedMatch = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return NaN;
    return whole + (whole < 0 ? -1 : 1) * (num / den);
  }

  // Fraction: "3/4"
  const fracMatch = s.match(/^(-?\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    if (den === 0) return NaN;
    return num / den;
  }

  // Decimal or integer
  const num = parseFloat(s);
  return isFinite(num) ? num : NaN;
}

/**
 * Check if user answer matches correct answer within tolerance.
 */
export function checkNumericAnswer(userInput: string, correctAnswer: number, tolerance = 0.005): boolean {
  const parsed = parseNumericInput(userInput);
  if (isNaN(parsed)) return false;
  return Math.abs(parsed - correctAnswer) <= tolerance;
}

/**
 * Validate grid-in input characters (numbers, decimal, slash, space, minus)
 */
export function isValidGridInInput(value: string): boolean {
  return /^-?[\d\s/.]*$/.test(value);
}
