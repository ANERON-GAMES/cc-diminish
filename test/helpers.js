export function options(overrides = {}) {
  return {
    category: "stun",
    now: 0,
    duration: 8,
    history: [],
    rules: {
      stun: {
        multipliers: { 1: 1, 2: 0.5, 3: 0.25 },
        reset: 18,
        cap: 3
      },
      root: {
        multipliers: { 1: 1, 2: 0.5 },
        reset: 10
      }
    },
    ...overrides
  };
}

export function entry(category, time) {
  return { category, time };
}
