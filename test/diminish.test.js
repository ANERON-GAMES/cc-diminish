import assert from "node:assert/strict";
import test from "node:test";
import { diminish } from "../src/index.js";
import { entry, options } from "./helpers.js";

const rules = options().rules;

test("the first application in a category keeps the full duration", () => {
  const log = [];
  const first = diminish({
    category: "stun",
    now: 0,
    duration: 8,
    history: log,
    rules
  });

  assert.deepEqual(Object.keys(first), [
    "category",
    "now",
    "base",
    "count",
    "multiplier",
    "duration",
    "immune",
    "resetAt",
    "history"
  ]);
  assert.deepEqual(first, {
    category: "stun",
    now: 0,
    base: 8,
    count: 1,
    multiplier: 1,
    duration: 8,
    immune: false,
    resetAt: 18,
    history: [{ category: "stun", time: 0 }]
  });
  assert.equal(log.length, 0);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.history), true);
  assert.equal(Object.isFrozen(first.history[0]), true);
  assert.notEqual(first.history, log);
});

test("repeated applications inside the reset window shorten, then immunize", () => {
  const first = diminish(options());
  const second = diminish(
    options({
      now: 10,
      history: first.history
    })
  );
  const third = diminish(
    options({
      now: 20,
      history: second.history
    })
  );
  const fourth = diminish(
    options({
      now: 30,
      history: third.history
    })
  );

  assert.equal(second.count, 2);
  assert.equal(second.multiplier, 0.5);
  assert.equal(second.duration, 4);
  assert.equal(second.immune, false);
  assert.equal(second.resetAt, 28);
  assert.equal(third.count, 3);
  assert.equal(third.multiplier, 0.25);
  assert.equal(third.duration, 2);
  assert.equal(third.immune, false);
  assert.equal(third.resetAt, 38);
  assert.equal(fourth.count, 4);
  assert.equal(fourth.multiplier, 0);
  assert.equal(fourth.duration, 0);
  assert.equal(fourth.immune, true);
  assert.equal(fourth.resetAt, 48);
  assert.deepEqual(
    fourth.history.map((item) => item.time),
    [0, 10, 20, 30]
  );
});

test("an open chain stays immune until the newest application reaches the reset window", () => {
  const fourth = diminish(
    options({
      now: 30,
      history: [entry("stun", 0), entry("stun", 10), entry("stun", 20)]
    })
  );
  const held = diminish(
    options({
      now: 34,
      history: fourth.history
    })
  );
  const restored = diminish(
    options({
      now: 48,
      history: fourth.history
    })
  );

  assert.equal(held.count, 5);
  assert.equal(held.immune, true);
  assert.equal(held.duration, 0);
  assert.equal(held.multiplier, 0);
  assert.equal(held.resetAt, 52);
  assert.equal(restored.count, 1);
  assert.equal(restored.multiplier, 1);
  assert.equal(restored.duration, 8);
  assert.equal(restored.immune, false);
  assert.equal(restored.resetAt, 66);
  assert.equal(restored.history.length, 5);
});

test("the reset boundary is inclusive", () => {
  const early = diminish(
    options({
      now: 17,
      history: [entry("stun", 0)]
    })
  );
  const boundary = diminish(
    options({
      now: 18,
      history: [entry("stun", 0)]
    })
  );

  assert.equal(early.count, 2);
  assert.equal(early.duration, 4);
  assert.equal(early.multiplier, 0.5);
  assert.equal(early.resetAt, 35);
  assert.equal(boundary.count, 1);
  assert.equal(boundary.duration, 8);
  assert.equal(boundary.multiplier, 1);
  assert.equal(boundary.immune, false);
  assert.equal(boundary.resetAt, 36);
});

test("a gap inside the history drops every application before that gap", () => {
  const broken = diminish(
    options({
      now: 50,
      history: [entry("stun", 0), entry("stun", 10), entry("stun", 40)]
    })
  );

  assert.equal(broken.count, 2);
  assert.equal(broken.multiplier, 0.5);
  assert.equal(broken.duration, 4);
  assert.equal(broken.immune, false);
  assert.equal(broken.resetAt, 68);
});

test("history order does not change the count", () => {
  const forward = diminish(
    options({
      now: 50,
      history: [entry("stun", 0), entry("stun", 10), entry("stun", 40)]
    })
  );
  const reversed = diminish(
    options({
      now: 50,
      history: [entry("stun", 40), entry("stun", 0), entry("stun", 10)]
    })
  );

  assert.equal(reversed.count, forward.count);
  assert.equal(reversed.duration, forward.duration);
  assert.deepEqual(
    reversed.history.map((item) => item.time),
    [40, 0, 10, 50]
  );
});

test("applications that share a timestamp each add one to the count", () => {
  const result = diminish(
    options({
      now: 5,
      history: [entry("stun", 5), entry("stun", 5), entry("stun", 5)]
    })
  );

  assert.equal(result.count, 4);
  assert.equal(result.immune, true);
  assert.equal(result.duration, 0);
});

test("another category keeps its own count and stays in the returned history", () => {
  const first = diminish(options());
  const rooted = diminish(
    options({
      category: "root",
      now: 10,
      duration: 6,
      history: first.history
    })
  );
  const again = diminish(
    options({
      now: 10,
      history: rooted.history
    })
  );

  assert.equal(rooted.category, "root");
  assert.equal(rooted.count, 1);
  assert.equal(rooted.duration, 6);
  assert.equal(rooted.multiplier, 1);
  assert.equal(rooted.immune, false);
  assert.equal(rooted.base, 6);
  assert.equal(rooted.resetAt, 20);
  assert.deepEqual(rooted.history, [
    { category: "stun", time: 0 },
    { category: "root", time: 10 }
  ]);
  assert.equal(again.category, "stun");
  assert.equal(again.count, 2);
  assert.equal(again.duration, 4);
  assert.equal(again.history.length, 3);
  assert.equal(again.history[1].category, "root");
  assert.deepEqual(again.history[2], { category: "stun", time: 10 });
});

test("without a cap, counts past the table keep the last multiplier", () => {
  const slowed = diminish(
    options({
      category: "root",
      now: 25,
      duration: 6,
      history: [entry("root", 0), entry("root", 8), entry("root", 16)]
    })
  );

  assert.equal(slowed.count, 4);
  assert.equal(slowed.multiplier, 0.5);
  assert.equal(slowed.duration, 3);
  assert.equal(slowed.immune, false);
  assert.equal(slowed.resetAt, 35);
});

test("a later root application still uses the floor after the window stays open", () => {
  const slowed = diminish(
    options({
      category: "root",
      now: 25,
      duration: 6,
      history: [entry("root", 0), entry("root", 8), entry("root", 16)]
    })
  );
  const later = diminish(
    options({
      category: "root",
      now: 34,
      duration: 6,
      history: slowed.history
    })
  );

  assert.equal(later.count, 5);
  assert.equal(later.multiplier, 0.5);
  assert.equal(later.duration, 3);
  assert.equal(later.immune, false);
  assert.equal(later.resetAt, 44);
});

test("a named zero multiplier is not immunity", () => {
  const result = diminish(
    options({
      now: 4,
      duration: 8,
      history: [entry("stun", 0)],
      rules: {
        stun: {
          multipliers: { 1: 1, 2: 0 },
          reset: 18,
          cap: 2
        }
      }
    })
  );
  const immune = diminish(
    options({
      now: 8,
      duration: 8,
      history: result.history,
      rules: {
        stun: {
          multipliers: { 1: 1, 2: 0 },
          reset: 18,
          cap: 2
        }
      }
    })
  );

  assert.equal(result.count, 2);
  assert.equal(result.multiplier, 0);
  assert.equal(result.duration, 0);
  assert.equal(result.immune, false);
  assert.equal(immune.count, 3);
  assert.equal(immune.immune, true);
  assert.equal(immune.duration, 0);
});

test("a cap of 1 makes the second application immune", () => {
  const table = {
    stun: {
      multipliers: { 1: 1 },
      reset: 10,
      cap: 1
    }
  };
  const first = diminish(
    options({
      duration: 5,
      rules: table
    })
  );
  const second = diminish(
    options({
      now: 3,
      duration: 5,
      history: first.history,
      rules: table
    })
  );

  assert.equal(first.count, 1);
  assert.equal(first.immune, false);
  assert.equal(first.duration, 5);
  assert.equal(second.count, 2);
  assert.equal(second.immune, true);
  assert.equal(second.duration, 0);
  assert.equal(second.multiplier, 0);
});

test("omitted and undefined caps leave the last multiplier in place", () => {
  const history = [entry("stun", 0), entry("stun", 1), entry("stun", 2)];
  const omitted = {
    stun: {
      multipliers: { 1: 1, 2: 0.5, 3: 0.25 },
      reset: 18
    }
  };
  const explicit = {
    stun: {
      multipliers: { 1: 1, 2: 0.5, 3: 0.25 },
      reset: 18,
      cap: undefined
    }
  };
  const fromOmitted = diminish(
    options({
      now: 3,
      history,
      rules: omitted
    })
  );
  const fromExplicit = diminish(
    options({
      now: 3,
      history,
      rules: explicit
    })
  );

  assert.equal(fromOmitted.count, 4);
  assert.equal(fromOmitted.multiplier, 0.25);
  assert.equal(fromOmitted.duration, 2);
  assert.equal(fromOmitted.immune, false);
  assert.deepEqual(fromExplicit, fromOmitted);
});

test("the multiplier table is used as named, including a rise", () => {
  const result = diminish(
    options({
      now: 2,
      duration: 8,
      history: [entry("stun", 0)],
      rules: {
        stun: {
          multipliers: { 1: 0.25, 2: 1 },
          reset: 10
        }
      }
    })
  );

  assert.equal(result.count, 2);
  assert.equal(result.multiplier, 1);
  assert.equal(result.duration, 8);
  assert.equal(result.immune, false);
});

test("a zero base duration still advances the count", () => {
  const first = diminish(
    options({
      duration: 0
    })
  );
  const second = diminish(
    options({
      now: 1,
      duration: 0,
      history: first.history
    })
  );

  assert.equal(first.duration, 0);
  assert.equal(first.count, 1);
  assert.equal(second.count, 2);
  assert.equal(second.multiplier, 0.5);
  assert.equal(second.duration, 0);
  assert.equal(second.immune, false);
});

test("a reset of 0 returns the category to full duration on every call", () => {
  const result = diminish(
    options({
      now: 5,
      history: [entry("stun", 5), entry("stun", 4)],
      rules: {
        stun: {
          multipliers: { 1: 1, 2: 0.5, 3: 0.25 },
          reset: 0,
          cap: 3
        }
      }
    })
  );

  assert.equal(result.count, 1);
  assert.equal(result.duration, 8);
  assert.equal(result.immune, false);
  assert.equal(result.resetAt, 5);
});

test("negative timestamps use the same subtraction", () => {
  const result = diminish(
    options({
      now: -5,
      duration: 8,
      history: [entry("stun", -20)],
      rules: {
        stun: {
          multipliers: { 1: 1, 2: 0.5 },
          reset: 18
        }
      }
    })
  );

  assert.equal(result.count, 2);
  assert.equal(result.duration, 4);
  assert.equal(result.resetAt, 13);
});

test("fractional time stays on the caller scale", () => {
  const result = diminish(
    options({
      now: 10.5,
      duration: 8,
      history: [entry("stun", 0)]
    })
  );

  assert.equal(result.count, 2);
  assert.equal(result.duration, 4);
  assert.equal(result.resetAt, 28.5);
  assert.equal(result.history[1].time, 10.5);
});

test("signed zeroes are stored as zero", () => {
  const result = diminish(
    options({
      now: -0,
      duration: -0,
      history: [entry("stun", -0)],
      rules: {
        stun: {
          multipliers: { 1: -0, 2: -0 },
          reset: -0
        }
      }
    })
  );

  assert.equal(Object.is(result.now, 0), true);
  assert.equal(Object.is(result.base, 0), true);
  assert.equal(Object.is(result.multiplier, 0), true);
  assert.equal(Object.is(result.duration, 0), true);
  assert.equal(Object.is(result.resetAt, 0), true);
  assert.equal(Object.is(result.history[0].time, 0), true);
  assert.equal(Object.is(result.history[1].time, 0), true);
  assert.equal(result.count, 1);
  assert.equal(result.immune, false);
});

test("an in-window signed zero multiplier is stored as zero", () => {
  const result = diminish(
    options({
      now: -0,
      duration: 8,
      history: [entry("stun", -0)],
      rules: {
        stun: {
          multipliers: { 1: 1, 2: -0 },
          reset: 10
        }
      }
    })
  );

  assert.equal(result.count, 2);
  assert.equal(Object.is(result.multiplier, 0), true);
  assert.equal(Object.is(result.duration, 0), true);
  assert.equal(result.immune, false);
});

test("extra fields and inherited fields are not part of the result", () => {
  const history = [{ category: "stun", time: 0, note: "keep" }];
  const inherited = Object.create({
    category: "root",
    time: 0,
    multipliers: { 1: 0 },
    reset: 1,
    cap: 1
  });
  inherited.category = "stun";
  inherited.time = 3;
  history.push(inherited);
  const table = Object.create({
    root: {
      multipliers: { 1: 0 },
      reset: 1
    }
  });
  table.stun = {
    multipliers: Object.assign(Object.create({ 3: 0 }), { 1: 1, 2: 0.5 }),
    reset: 18,
    label: "ignored"
  };
  const result = diminish(
    options({
      now: 4,
      history,
      rules: table,
      label: "preview"
    })
  );

  assert.equal(result.count, 3);
  assert.equal(result.multiplier, 0.5);
  assert.equal(result.duration, 4);
  assert.equal(result.immune, false);
  assert.deepEqual(result.history, [
    { category: "stun", time: 0 },
    { category: "stun", time: 3 },
    { category: "stun", time: 4 }
  ]);
  assert.deepEqual(Object.keys(result.history[0]), ["category", "time"]);
  assert.equal(history[0].note, "keep");
  assert.equal(history.length, 2);
  assert.equal(Object.isFrozen(history[0]), false);
});

test("a null-prototype rule is read from its own fields", () => {
  const multipliers = Object.create(null);
  multipliers[1] = 1;
  multipliers[2] = 0.5;
  const rule = Object.create(null);
  rule.multipliers = multipliers;
  rule.reset = 18;
  rule.cap = 2;
  const table = Object.create(null);
  table.stun = rule;
  const result = diminish(
    options({
      now: 1,
      duration: 8,
      history: [entry("stun", 0)],
      rules: table
    })
  );

  assert.equal(result.count, 2);
  assert.equal(result.duration, 4);
});

test("an own category key is used when the name matches an object key", () => {
  const name = "__proto__";
  const table = {};
  Object.defineProperty(table, name, {
    value: {
      multipliers: { 1: 1 },
      reset: 5
    },
    enumerable: true,
    writable: true,
    configurable: true
  });
  const result = diminish({
    category: name,
    now: 1,
    duration: 4,
    history: [],
    rules: table
  });

  assert.equal(result.category, name);
  assert.equal(result.duration, 4);
  assert.equal(result.history[0].category, name);
});

test("calls do not share result objects or change earlier results", () => {
  const history = [entry("stun", 0)];
  const table = options().rules;
  const first = diminish(
    options({
      now: 10,
      history,
      rules: table
    })
  );
  history[0].time = 9;
  table.stun.multipliers[2] = 0.1;
  const second = diminish(
    options({
      now: 10,
      history: [entry("stun", 0)]
    })
  );

  assert.equal(first.duration, 4);
  assert.equal(first.history[0].time, 0);
  assert.equal(second.duration, 4);
  assert.notEqual(first, second);
  assert.notEqual(first.history, second.history);
  assert.notEqual(first.history[0], second.history[0]);
  assert.deepEqual(first.history[0], second.history[0]);
});

test("the same input produces the same result", () => {
  const input = options({
    now: 10,
    history: [entry("stun", 0), entry("root", 4)]
  });
  const first = diminish(input);
  const second = diminish(input);

  assert.deepEqual(first, second);
  assert.notEqual(first.history[0], input.history[0]);
});

test("a category name is matched exactly", () => {
  const result = diminish(
    options({
      category: "Stun",
      now: 1,
      history: [entry("stun", 0)],
      rules: {
        Stun: {
          multipliers: { 1: 1, 2: 0.5 },
          reset: 18
        }
      }
    })
  );

  assert.equal(result.count, 1);
  assert.equal(result.duration, 8);
});

test("whitespace in a category is part of the name", () => {
  const result = diminish(
    options({
      category: " stun",
      history: [entry("stun", 0)],
      rules: {
        " stun": {
          multipliers: { 1: 1 },
          reset: 18,
          cap: 1
        }
      }
    })
  );

  assert.equal(result.count, 1);
  assert.equal(result.category, " stun");
});

test("a finite gap that is large still compares", () => {
  const now = 1000000000000000;
  const result = diminish(
    options({
      now,
      history: [entry("stun", 0)]
    })
  );

  assert.equal(result.count, 1);
  assert.equal(result.duration, 8);
  assert.equal(result.resetAt, now + 18);
});

test("an older non-finite gap is not read once a nearer gap has already broken the chain", () => {
  const result = diminish(
    options({
      now: 10,
      history: [entry("stun", -Number.MAX_VALUE), entry("stun", 0)],
      rules: {
        stun: {
          multipliers: { 1: 1, 2: 0.5 },
          reset: 5
        }
      }
    })
  );

  assert.equal(result.count, 1);
  assert.equal(result.duration, 8);
});

test("multiplier boundaries of 0 and 1 are accepted", () => {
  const full = diminish(
    options({
      rules: {
        stun: {
          multipliers: { 1: 1 },
          reset: 1
        }
      }
    })
  );
  const empty = diminish(
    options({
      rules: {
        stun: {
          multipliers: { 1: 0 },
          reset: 1
        }
      }
    })
  );

  assert.equal(full.multiplier, 1);
  assert.equal(full.duration, 8);
  assert.equal(empty.multiplier, 0);
  assert.equal(empty.duration, 0);
  assert.equal(empty.immune, false);
});

test("a very small multiplier scales the duration", () => {
  const result = diminish(
    options({
      duration: 2,
      rules: {
        stun: {
          multipliers: { 1: Number.MIN_VALUE },
          reset: 1
        }
      }
    })
  );

  assert.equal(result.duration, 2 * Number.MIN_VALUE);
});

test("ten identical calls stay aligned", () => {
  const input = options({
    now: 12,
    history: [entry("stun", 1), entry("root", 2), entry("stun", 9)]
  });
  const expected = diminish(input);
  for (let index = 0; index < 10; index += 1) {
    assert.deepEqual(diminish(input), expected);
  }
});
