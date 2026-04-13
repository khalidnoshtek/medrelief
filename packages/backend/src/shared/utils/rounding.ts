/**
 * Rounds amount to the nearest multiple (default: 10) for Indian billing convention.
 * Returns the rounded amount and the adjustment applied.
 */
export function roundToNearest(amount: number, nearest: number = 10): {
  rounded: number;
  adjustment: number;
} {
  const rounded = Math.round(amount / nearest) * nearest;
  return {
    rounded,
    adjustment: rounded - amount,
  };
}
