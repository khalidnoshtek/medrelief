import { describe, it, expect } from 'vitest';
import { roundToNearest } from '../utils/rounding';

describe('roundToNearest', () => {
  it('rounds 370 to 370 (already multiple of 10)', () => {
    const { rounded, adjustment } = roundToNearest(370);
    expect(rounded).toBe(370);
    expect(adjustment).toBe(0);
  });

  it('rounds 373 up to 370', () => {
    const { rounded, adjustment } = roundToNearest(373);
    expect(rounded).toBe(370);
    expect(adjustment).toBe(-3);
  });

  it('rounds 377 up to 380', () => {
    const { rounded, adjustment } = roundToNearest(377);
    expect(rounded).toBe(380);
    expect(adjustment).toBe(3);
  });

  it('rounds 375 up to 380 (standard rounding)', () => {
    const { rounded, adjustment } = roundToNearest(375);
    expect(rounded).toBe(380);
    expect(adjustment).toBe(5);
  });

  it('rounds to nearest 5 when specified', () => {
    const { rounded, adjustment } = roundToNearest(373, 5);
    expect(rounded).toBe(375);
    expect(adjustment).toBe(2);
  });

  it('handles zero', () => {
    const { rounded, adjustment } = roundToNearest(0);
    expect(rounded).toBe(0);
    expect(adjustment).toBe(0);
  });

  it('handles decimal amounts', () => {
    const { rounded, adjustment } = roundToNearest(372.5);
    expect(rounded).toBe(370);
    expect(adjustment).toBeCloseTo(-2.5);
  });
});
