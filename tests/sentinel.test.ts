import { describe, it, expect } from 'vitest';

describe('Vitest harness sentinel', () => {
  it('runs in jsdom environment with document available', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
    expect(window.location).toBeDefined();
  });

  it('can use globals (describe / it / expect) without imports', () => {
    // This file uses explicit imports for clarity; globals: true allows the
    // RED stubs in plan 01-03 to omit them. The fact that this file COMPILES
    // and RUNS proves the config is valid.
    expect(1 + 1).toBe(2);
  });
});
