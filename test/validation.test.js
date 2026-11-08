import assert from "node:assert/strict";
import test from "node:test";
import { diminish } from "../src/index.js";
import { entry, options } from "./helpers.js";

const OPTIONS = "options must be an object";
const CATEGORY = "category must be a non-empty string";
const NOW = "now must be a finite number";
const DURATION = "duration must be a finite number greater than or equal to 0";
const HISTORY = "history must be an array";
const APPLICATION = "application must be an object";
const APPLICATION_CATEGORY = "application category must be a non-empty string";
const TIME = "application time must be a finite number";
const TIME_ORDER = "application time must be less than or equal to now";
const RULES = "rules must be an object";
const INCLUDE = "rules must include the category";
const RULE = "rule must be an object";
const MULTIPLIERS = "multipliers must be an object";
const COUNTS = "multiplier counts must be contiguous integers starting at 1";
const MULTIPLIER = "multiplier must be a finite number from 0 to 1";
const RESET = "reset must be a finite number greater than or equal to 0";
const CAP = "cap must be an integer greater than or equal to 1";
const CAP_MATCH = "cap must match the last multiplier";
const DIFFERENCE = "time difference must be finite";
const RESET_TIME = "reset time must be finite";

test("diminish rejects a bad options object before it reads fields", () => {
  assert.throws(() => diminish(), {
    name: "TypeError",
    message: OPTIONS
  });
  for (const value of [undefined, null, [], "stun", 1, true, false, () => {}]) {
    assert.throws(() => diminish(value), {
      name: "TypeError",
      message: OPTIONS
    });
  }
});

test("diminish reads category, now, duration, history, rules, then the curve", () => {
  assert.throws(() => diminish({}), {
    name: "TypeError",
    message: CATEGORY
  });
  assert.throws(
    () =>
      diminish({
        category: "",
        now: Number.NaN,
        duration: -1,
        history: null,
        rules: null
      }),
    {
      name: "TypeError",
      message: CATEGORY
    }
  );
  assert.throws(
    () =>
      diminish({
        category: "stun",
        duration: -1,
        history: null,
        rules: null
      }),
    {
      name: "RangeError",
      message: NOW
    }
  );
  assert.throws(
    () =>
      diminish({
        category: "stun",
        now: 0,
        history: null,
        rules: null
      }),
    {
      name: "RangeError",
      message: DURATION
    }
  );
  assert.throws(
    () =>
      diminish({
        category: "stun",
        now: 0,
        duration: 8,
        rules: null
      }),
    {
      name: "TypeError",
      message: HISTORY
    }
  );
  assert.throws(
    () =>
      diminish({
        category: "stun",
        now: 0,
        duration: 8,
        history: [null],
        rules: null
      }),
    {
      name: "TypeError",
      message: APPLICATION
    }
  );
  assert.throws(
    () =>
      diminish({
        category: "stun",
        now: 0,
        duration: 8,
        history: [{}],
        rules: null
      }),
    {
      name: "TypeError",
      message: APPLICATION_CATEGORY
    }
  );
  assert.throws(
    () =>
      diminish({
        category: "stun",
        now: 0,
        duration: 8,
        history: [{ category: "stun" }],
        rules: null
      }),
    {
      name: "RangeError",
      message: TIME
    }
  );
  assert.throws(
    () =>
      diminish({
        category: "stun",
        now: 0,
        duration: 8,
        history: [{ category: "stun", time: 1 }],
        rules: null
      }),
    {
      name: "RangeError",
      message: TIME_ORDER
    }
  );
  assert.throws(
    () =>
      diminish({
        category: "stun",
        now: 0,
        duration: 8,
        history: []
      }),
    {
      name: "TypeError",
      message: RULES
    }
  );
  assert.throws(() => diminish(options({ rules: {} })), {
    name: "TypeError",
    message: INCLUDE
  });
  assert.throws(() => diminish(options({ rules: { stun: null } })), {
    name: "TypeError",
    message: RULE
  });
  assert.throws(() => diminish(options({ rules: { stun: {} } })), {
    name: "TypeError",
    message: MULTIPLIERS
  });
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 2: 1 },
              reset: -1,
              cap: 0
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: COUNTS
    }
  );
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 1: 2 },
              reset: -1,
              cap: 0
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: MULTIPLIER
    }
  );
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 1: 1 },
              cap: 0
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: RESET
    }
  );
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 1: 1 },
              reset: 1,
              cap: 0
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: CAP
    }
  );
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 1: 1 },
              reset: 1,
              cap: 2
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: CAP_MATCH
    }
  );
});

test("category is an own non-empty string", () => {
  for (const category of ["", 1, null, true, [], {}]) {
    assert.throws(() => diminish(options({ category })), {
      name: "TypeError",
      message: CATEGORY
    });
  }
  const inherited = Object.create({ category: "stun" });
  inherited.now = 0;
  inherited.duration = 8;
  inherited.history = [];
  inherited.rules = options().rules;
  assert.throws(() => diminish(inherited), {
    name: "TypeError",
    message: CATEGORY
  });
});

test("now is an own finite number", () => {
  for (const now of [
    undefined,
    null,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "0",
    true,
    false
  ]) {
    assert.throws(() => diminish(options({ now })), {
      name: "RangeError",
      message: NOW
    });
  }
  const inherited = options();
  delete inherited.now;
  Object.setPrototypeOf(inherited, { now: 0 });
  assert.throws(() => diminish(inherited), {
    name: "RangeError",
    message: NOW
  });
});

test("duration is an own finite number greater than or equal to 0", () => {
  for (const duration of [undefined, null, -1, Number.NaN, Number.POSITIVE_INFINITY, "8", true]) {
    assert.throws(() => diminish(options({ duration })), {
      name: "RangeError",
      message: DURATION
    });
  }
  assert.equal(diminish(options({ duration: 0 })).duration, 0);
});

test("history is an own array and every entry is checked in order", () => {
  for (const history of [undefined, null, {}, "stun", entry("stun", 0)]) {
    assert.throws(() => diminish(options({ history })), {
      name: "TypeError",
      message: HISTORY
    });
  }
  for (const value of [null, [], "stun", 0, true]) {
    assert.throws(() => diminish(options({ history: [value] })), {
      name: "TypeError",
      message: APPLICATION
    });
  }
  const hole = [];
  hole[1] = entry("stun", 0);
  assert.throws(() => diminish(options({ history: hole })), {
    name: "TypeError",
    message: APPLICATION
  });
  assert.throws(
    () =>
      diminish(
        options({
          history: [entry("stun", 0), null]
        })
      ),
    {
      name: "TypeError",
      message: APPLICATION
    }
  );
  assert.throws(
    () =>
      diminish(
        options({
          history: [{ time: 0 }, entry("stun", 0)]
        })
      ),
    {
      name: "TypeError",
      message: APPLICATION_CATEGORY
    }
  );
});

test("application category is an own non-empty string", () => {
  for (const category of ["", 1, null, true]) {
    assert.throws(() => diminish(options({ history: [{ category, time: 0 }] })), {
      name: "TypeError",
      message: APPLICATION_CATEGORY
    });
  }
  const inherited = Object.create({ category: "stun", time: 0 });
  assert.throws(() => diminish(options({ history: [inherited] })), {
    name: "TypeError",
    message: APPLICATION_CATEGORY
  });
});

test("application time is an own finite number at or before now", () => {
  for (const time of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY, "0", true]) {
    assert.throws(() => diminish(options({ history: [{ category: "stun", time }] })), {
      name: "RangeError",
      message: TIME
    });
  }
  assert.throws(() => diminish(options({ now: 5, history: [entry("stun", 5.0001)] })), {
    name: "RangeError",
    message: TIME_ORDER
  });
  const inherited = Object.create({ time: 0 });
  inherited.category = "stun";
  assert.throws(() => diminish(options({ history: [inherited] })), {
    name: "RangeError",
    message: TIME
  });
  const atNow = diminish(options({ now: 5, history: [entry("stun", 5)] }));
  assert.equal(atNow.count, 2);
});

test("rules are an own object that includes an own rule for the category", () => {
  for (const table of [null, [], "stun", 0, true]) {
    assert.throws(() => diminish(options({ rules: table })), {
      name: "TypeError",
      message: RULES
    });
  }
  const inherited = Object.create({
    stun: {
      multipliers: { 1: 1 },
      reset: 18,
      cap: 1
    }
  });
  assert.throws(() => diminish(options({ rules: inherited })), {
    name: "TypeError",
    message: INCLUDE
  });
  for (const rule of [null, [], "stun", 0, true]) {
    assert.throws(() => diminish(options({ rules: { stun: rule } })), {
      name: "TypeError",
      message: RULE
    });
  }
  const result = diminish(
    options({
      rules: {
        root: null,
        stun: {
          multipliers: { 1: 1 },
          reset: 18,
          cap: 1
        }
      }
    })
  );
  assert.equal(result.duration, 8);
});

test("multiplier counts are own contiguous integers starting at 1", () => {
  const cases = [
    {},
    { 0: 1 },
    { 2: 1 },
    { 1: 1, 3: 1 },
    { "01": 1 },
    { "1.0": 1 },
    { "1e0": 1 },
    { "+1": 1 },
    { foo: 1 },
    { 1: 1, 2: 0.5, 4: 0.25 }
  ];
  for (const multipliers of cases) {
    assert.throws(
      () =>
        diminish(
          options({
            rules: {
              stun: {
                multipliers,
                reset: 18
              }
            }
          })
        ),
      {
        name: "RangeError",
        message: COUNTS
      }
    );
  }
  const inherited = Object.create({ 1: 1 });
  inherited[2] = 0.5;
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: inherited,
              reset: 18
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: COUNTS
    }
  );
});

test("multipliers are own finite numbers from 0 to 1, read from count 1 upward", () => {
  for (const value of [
    undefined,
    null,
    -0.1,
    1.0000001,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "1",
    true
  ]) {
    assert.throws(
      () =>
        diminish(
          options({
            rules: {
              stun: {
                multipliers: { 1: value },
                reset: 18
              }
            }
          })
        ),
      {
        name: "RangeError",
        message: MULTIPLIER
      }
    );
  }
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 1: 1, 2: 2 },
              reset: 18
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: MULTIPLIER
    }
  );
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 1: -1, 2: 2 },
              reset: 18
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: MULTIPLIER
    }
  );
  for (const multipliers of [[1], null, "1"]) {
    assert.throws(
      () =>
        diminish(
          options({
            rules: {
              stun: {
                multipliers,
                reset: 18
              }
            }
          })
        ),
      {
        name: "TypeError",
        message: MULTIPLIERS
      }
    );
  }
});

test("reset is an own finite number greater than or equal to 0", () => {
  for (const reset of [undefined, null, -1, Number.NaN, Number.POSITIVE_INFINITY, "18", true]) {
    assert.throws(
      () =>
        diminish(
          options({
            rules: {
              stun: {
                multipliers: { 1: 1 },
                reset
              }
            }
          })
        ),
      {
        name: "RangeError",
        message: RESET
      }
    );
  }
  const inherited = Object.create({ reset: 18 });
  inherited.multipliers = { 1: 1 };
  assert.throws(() => diminish(options({ rules: { stun: inherited } })), {
    name: "RangeError",
    message: RESET
  });
});

test("cap is an integer greater than or equal to 1 and equals the last named count", () => {
  for (const cap of [null, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "3", true]) {
    assert.throws(
      () =>
        diminish(
          options({
            rules: {
              stun: {
                multipliers: { 1: 1, 2: 0.5, 3: 0.25 },
                reset: 18,
                cap
              }
            }
          })
        ),
      {
        name: "RangeError",
        message: CAP
      }
    );
  }
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 1: 1, 2: 0.5, 3: 0.25 },
              reset: 18,
              cap: 2
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: CAP_MATCH
    }
  );
  assert.throws(
    () =>
      diminish(
        options({
          rules: {
            stun: {
              multipliers: { 1: 1 },
              reset: 18,
              cap: 3
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: CAP_MATCH
    }
  );
});

test("a non-finite gap between times is an error", () => {
  assert.throws(
    () =>
      diminish(
        options({
          now: Number.MAX_VALUE,
          history: [entry("stun", -Number.MAX_VALUE)]
        })
      ),
    {
      name: "RangeError",
      message: DIFFERENCE
    }
  );
  assert.throws(
    () =>
      diminish(
        options({
          now: Number.MAX_VALUE,
          history: [entry("stun", -Number.MAX_VALUE), entry("stun", Number.MAX_VALUE)]
        })
      ),
    {
      name: "RangeError",
      message: DIFFERENCE
    }
  );
});

test("a non-finite reset time is an error after the history gaps", () => {
  assert.throws(
    () =>
      diminish(
        options({
          now: Number.MAX_VALUE,
          rules: {
            stun: {
              multipliers: { 1: 1 },
              reset: Number.MAX_VALUE
            }
          }
        })
      ),
    {
      name: "RangeError",
      message: RESET_TIME
    }
  );
});

test("a thrown validation error leaves the history array unchanged", () => {
  const history = [];
  assert.throws(() => diminish(options({ history, rules: null })), {
    name: "TypeError",
    message: RULES
  });
  assert.deepEqual(history, []);
});

test("only the selected category rule is read", () => {
  const result = diminish(
    options({
      rules: {
        root: { multipliers: { 1: 5 } },
        stun: {
          multipliers: { 1: 1, 2: 0.5, 3: 0.25 },
          reset: 18,
          cap: 3
        }
      }
    })
  );
  assert.equal(result.duration, 8);
});
