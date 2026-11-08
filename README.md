# @aneron/cc-diminish

Crowd-control diminishing returns that shorten repeated effects in the same category.

## Purpose

`@aneron/cc-diminish` decides the duration of one crowd-control effect from the category, the prior applications, and a named curve. The caller passes the category, the time, the base duration, the history, and the rules. Each category has its own duration multipliers, keyed by application count, and its own reset window. After the reset window the category returns to full duration. When a rule sets a cap, an application past that cap is immune and its duration is `0`.

The time values are numbers in one unit chosen by the caller. The same unit is used for `now`, each history `time`, `duration`, `reset`, and `resetAt`. The module does not treat them as seconds or as any other named unit.

The module does not mutate its arguments. It does not read a clock, start a timer, draw a random number, or open a socket. It has no runtime dependencies.

## Install

The package is an ES module. It needs Node.js 20 or newer. It has no runtime dependencies. The package name is `@aneron/cc-diminish`. It is not published to the npm registry.

Clone this repository and run the tests:

```bash
git clone https://github.com/ANERON-GAMES/cc-diminish.git
cd cc-diminish
npm install
npm test
```

`npm test` runs `node --test`. `npm run lint` runs ESLint. `npm run format:check` runs Prettier.

Install it as a dependency from the git repository:

```bash
npm install github:ANERON-GAMES/cc-diminish
```

```js
import { diminish } from "@aneron/cc-diminish";
```

Code in this repository imports the same entry point with `./src/index.js`.

## Usage

The rules below name two categories. `stun` keeps the full duration on count `1`, half on count `2`, and a quarter on count `3`. Its reset window is `18`. Its cap is `3`, so count `4` and every later count in the open sequence are immune. `root` keeps the full duration on count `1` and half from count `2` onward. It has no cap, so it never becomes immune. Its reset window is `10`.

```js
import { diminish } from "@aneron/cc-diminish";

const rules = {
  stun: {
    multipliers: { 1: 1, 2: 0.5, 3: 0.25 },
    reset: 18,
    cap: 3
  },
  root: {
    multipliers: { 1: 1, 2: 0.5 },
    reset: 10
  }
};

const log = [];
const first = diminish({
  category: "stun",
  now: 0,
  duration: 8,
  history: log,
  rules
});
```

`first.category` is `"stun"`. `first.now` is `0`. `first.base` is `8`. `first.count` is `1`. `first.multiplier` is `1`. `first.duration` is `8`. `first.immune` is `false`. `first.resetAt` is `18`. `first.history` is `[{ category: "stun", time: 0 }]`. `log.length` is still `0`. The stored log is `first.history` when this application should count.

A second stun at time `10` is still inside the window. The gap from `0` to `10` is `10`, which is below `18`.

```js
const second = diminish({
  category: "stun",
  now: 10,
  duration: 8,
  history: first.history,
  rules
});
```

`second.count` is `2`. `second.multiplier` is `0.5`. `second.duration` is `4`. `second.immune` is `false`. `second.resetAt` is `28`. `first.duration` is still `8`.

A third stun at time `20` uses the quarter multiplier. The gaps from `0` to `10` and from `10` to `20` are both below `18`, and `20` is still inside the window measured from `now`.

```js
const third = diminish({
  category: "stun",
  now: 20,
  duration: 8,
  history: second.history,
  rules
});
```

`third.count` is `3`. `third.multiplier` is `0.25`. `third.duration` is `2`. `third.immune` is `false`. `third.resetAt` is `38`.

A fourth stun at time `30` is past the cap.

```js
const fourth = diminish({
  category: "stun",
  now: 30,
  duration: 8,
  history: third.history,
  rules
});
```

`fourth.count` is `4`. `fourth.multiplier` is `0`. `fourth.duration` is `0`. `fourth.immune` is `true`. `fourth.resetAt` is `48`. `fourth.history` ends with `{ category: "stun", time: 30 }`. An immune application stays in the history, so the window keeps moving forward.

Time `34` is still inside that window. The stun at time `0` is still in the open sequence, because each step `0 → 10 → 20 → 30` is a gap of `10`, and `34 - 30` is `4`.

```js
const held = diminish({
  category: "stun",
  now: 34,
  duration: 8,
  history: fourth.history,
  rules
});
```

`held.count` is `5`. `held.immune` is `true`. `held.duration` is `0`. `held.multiplier` is `0`. `held.resetAt` is `52`.

Time `48` is the reset instant of the application recorded at `30`. The category returns to full duration. The earlier stuns do not keep a shorter count alive.

```js
const restored = diminish({
  category: "stun",
  now: 48,
  duration: 8,
  history: fourth.history,
  rules
});
```

`restored.count` is `1`. `restored.multiplier` is `1`. `restored.duration` is `8`. `restored.immune` is `false`. `restored.resetAt` is `66`. `restored.history` still contains the earlier stuns, and it ends with the application at `48`.

A root at time `10` does not advance the stun count. The stun already stored at time `0` stays in the returned history.

```js
const rooted = diminish({
  category: "root",
  now: 10,
  duration: 6,
  history: first.history,
  rules
});
```

`rooted.category` is `"root"`. `rooted.count` is `1`. `rooted.duration` is `6`. `rooted.multiplier` is `1`. `rooted.immune` is `false`. `rooted.base` is `6`. `rooted.resetAt` is `20`. `rooted.history` is `[{ category: "stun", time: 0 }, { category: "root", time: 10 }]`.

The next stun reads that mixed history and still sees one prior stun.

```js
const again = diminish({
  category: "stun",
  now: 10,
  duration: 8,
  history: rooted.history,
  rules
});
```

`again.count` is `2`. `again.duration` is `4`. `again.history` has length `3`. The middle entry is the root. The last entry is the stun at time `10`.

A root curve with no cap floors at the last named multiplier. Applications at `0`, `8`, and `16` are one open sequence when `now` is `25`, because each gap is below `10` and `25 - 16` is `9`.

```js
const slowed = diminish({
  category: "root",
  now: 25,
  duration: 6,
  history: [
    { category: "root", time: 0 },
    { category: "root", time: 8 },
    { category: "root", time: 16 }
  ],
  rules
});
```

`slowed.count` is `4`. `slowed.multiplier` is `0.5`. `slowed.duration` is `3`. `slowed.immune` is `false`. `slowed.resetAt` is `35`.

A stun history of `0`, `10`, and `40`, read at `50`, keeps only the application at `40`. The gap from `10` to `40` is `30`, which is at least `18`, so the earlier stuns are outside the open sequence. The gap from `40` to `50` is `10`, so the new application is count `2`.

```js
const broken = diminish({
  category: "stun",
  now: 50,
  duration: 8,
  history: [
    { category: "stun", time: 0 },
    { category: "stun", time: 10 },
    { category: "stun", time: 40 }
  ],
  rules
});
```

`broken.count` is `2`. `broken.multiplier` is `0.5`. `broken.duration` is `4`. `broken.immune` is `false`. `broken.resetAt` is `68`. Passing the same three times in another order returns the same count and the same duration. The returned history keeps the input order and appends `50`.

The reset comparison is `>=`. A prior stun at `0` is still open at `17` and is expired at `18`.

```js
const early = diminish({
  category: "stun",
  now: 17,
  duration: 8,
  history: [{ category: "stun", time: 0 }],
  rules
});

const boundary = diminish({
  category: "stun",
  now: 18,
  duration: 8,
  history: [{ category: "stun", time: 0 }],
  rules
});
```

`early.count` is `2`. `early.duration` is `4`. `early.multiplier` is `0.5`. `early.resetAt` is `35`. `boundary.count` is `1`. `boundary.duration` is `8`. `boundary.multiplier` is `1`. `boundary.immune` is `false`. `boundary.resetAt` is `36`.

## API

### `diminish(options)`

Return the duration of one application. The function is pure. A second call with the same input returns an equal result and does not reuse the first result's objects.

| Field      | Type   | Meaning                                                                                |
| ---------- | ------ | -------------------------------------------------------------------------------------- |
| `category` | string | Category name to resolve. Own, non-empty. Compared with `===`.                         |
| `now`      | number | Time of this application. Own finite number. The caller supplies it.                   |
| `duration` | number | Base duration before the multiplier. Own finite number greater than or equal to `0`.   |
| `history`  | array  | Prior applications, oldest-first is conventional. The order does not change the count. |
| `rules`    | object | Own rules. Only the own rule for `category` is read. Other keys are ignored.           |

Each history entry is an object. Only the own fields `category` and `time` are read. Extra fields are ignored and are not copied into the result.

| Field      | Type   | Meaning                                       |
| ---------- | ------ | --------------------------------------------- |
| `category` | string | Own, non-empty category name.                 |
| `time`     | number | Own finite time, less than or equal to `now`. |

The selected rule is an object. Only its own fields are read.

| Field         | Type   | Meaning                                                                                                     |
| ------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `multipliers` | object | Duration multiplier for each application count. Own keys `"1"`, `"2"`, `"3"`, and so on, with no gaps.      |
| `reset`       | number | Reset window. Own finite number greater than or equal to `0`.                                               |
| `cap`         | number | Optional. Own integer greater than or equal to `1`. It must equal the last named count. Omitted means none. |

A multiplier is an own finite number from `0` through `1`, including both ends. Key `"01"`, key `"1.0"`, key `"0"`, and a missing `"1"` are rejected. An array is not a multiplier table. A value inherited from the prototype is not a named count. `cap: undefined` means the cap is omitted. The table is not required to decrease: count `2` may be larger than count `1`.

The count is one plus the length of the open sequence for that category.

The open sequence is built from prior entries whose `category` is `===` to the requested category. Those entries are ordered by `time`, then by their original index. If there is no such entry, the sequence is empty. If `now - latestTime >= reset`, the sequence is empty. Otherwise the latest entry is included, and each older neighbor is included while `newerTime - olderTime < reset`. The first gap that is greater than or equal to `reset` stops the walk. Entries older than that gap are outside the sequence, including entries that would have been close to `now` on their own.

`count` is that length plus `1`. It is at least `1`.

When `cap` is `null`, a count above the last named count uses that last multiplier, and `immune` is `false`. When `cap` is set, a count greater than `cap` is immune: `multiplier` is `0`, `duration` is `0`, and `immune` is `true`. Counts from `1` through `cap` use the named multiplier. A named multiplier of `0` has duration `0` and `immune` `false`.

`duration` on the result is `base * multiplier` for a non-immune application, then with the sign of zero normalized. `resetAt` is `now + reset`, with the same normalization, when that sum is finite.

The returned `history` is a new frozen array. It contains a new frozen `{ category, time }` for every input entry, in input order, then one new entry for this application at `now`. Entries outside the open sequence stay in that array. They do not add to the next count once a gap of at least `reset` separates them from the newer sequence. Replacing the caller's stored history with this array is what makes the next call see this application. Keeping the previous array leaves the next count unchanged. An immune application is part of the returned history.

The result is frozen. It does not share object or array references with the input or with another call. Every stored number that is zero uses the positive zero.

| Field        | Meaning                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| `category`   | The category string.                                                                      |
| `now`        | The normalized time of this application.                                                  |
| `base`       | The normalized base duration.                                                             |
| `count`      | This application's count, starting at `1`.                                                |
| `multiplier` | The multiplier used, or `0` when `immune` is `true`.                                      |
| `duration`   | The diminished duration, or `0` when `immune` is `true`.                                  |
| `immune`     | `true` when `cap` is set and `count` is greater than `cap`.                               |
| `resetAt`    | `now + reset`. A later call at this time, using the returned history, is count `1` again. |
| `history`    | The replacement history, including this application.                                      |

Two entries with the same category and the same time each add one to the count when `reset` is greater than `0`. A `reset` of `0` makes every gap expire, so every call is count `1` at the full multiplier for count `1`.

A base duration of `0` still advances the count. The result duration stays `0`.

### Errors

The checks run in the order below. The first failure is the error. Later fields are not required to be valid yet.

| When the check fails                                                        | Error        | Message                                                       |
| --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------- |
| `options` is missing, an array, or not an object                            | `TypeError`  | `options must be an object`                                   |
| `category` is missing or not a non-empty string                             | `TypeError`  | `category must be a non-empty string`                         |
| `now` is missing or not a finite number                                     | `RangeError` | `now must be a finite number`                                 |
| `duration` is missing, not finite, or below `0`                             | `RangeError` | `duration must be a finite number greater than or equal to 0` |
| `history` is missing or not an array                                        | `TypeError`  | `history must be an array`                                    |
| A history entry is an array or not an object                                | `TypeError`  | `application must be an object`                               |
| An application category is missing or not a non-empty string                | `TypeError`  | `application category must be a non-empty string`             |
| An application time is missing or not a finite number                       | `RangeError` | `application time must be a finite number`                    |
| An application time is greater than `now`                                   | `RangeError` | `application time must be less than or equal to now`          |
| `rules` is missing, an array, or not an object                              | `TypeError`  | `rules must be an object`                                     |
| `rules` has no own entry for `category`                                     | `TypeError`  | `rules must include the category`                             |
| The selected rule is an array or not an object                              | `TypeError`  | `rule must be an object`                                      |
| `multipliers` is missing, an array, or not an object                        | `TypeError`  | `multipliers must be an object`                               |
| Multiplier counts are empty, gapped, or not the integers `1`, `2`, `3`, ... | `RangeError` | `multiplier counts must be contiguous integers starting at 1` |
| A multiplier value is missing or not a finite number from `0` to `1`        | `RangeError` | `multiplier must be a finite number from 0 to 1`              |
| `reset` is missing, not finite, or below `0`                                | `RangeError` | `reset must be a finite number greater than or equal to 0`    |
| `cap` is present and not an integer greater than or equal to `1`            | `RangeError` | `cap must be an integer greater than or equal to 1`           |
| `cap` is not equal to the last named count                                  | `RangeError` | `cap must match the last multiplier`                          |
| A time subtraction used by the open sequence is not finite                  | `RangeError` | `time difference must be finite`                              |
| `now + reset` is not finite                                                 | `RangeError` | `reset time must be finite`                                   |

History entries are checked from first to last. Multiplier values are checked from count `1` upward, after the keys have been accepted as a contiguous run. Time differences are checked after the options have been accepted, starting at the newest gap. A gap that already ends the sequence stops the walk, so an older non-finite gap beyond that break is not read. The reset sum is checked after the gaps.

Own fields are the fields the function reads. A category, time, rule, multiplier, or `reset` that sits only on the prototype is treated as missing. A category string is not trimmed. `"Stun"` and `"stun"` are different categories. `" stun"` is a different category from `"stun"`.

## Design notes

The function is a pure reduction of a log the caller already has. Crowd control is applied at a moment the caller names. The module does not read a clock, wait, or generate a number, so a test can pass `now` and get the same duration every time. Two calls do not share result objects. Freezing one result cannot change the next call. A later edit to a history entry or to a multiplier is visible only to a later call. The earlier frozen result keeps the numbers it computed.

Categories are separate logs that share one array. A root does not change a stun count. The returned history keeps every category, because the caller has one log per target and the next call may ask about a different category. The count uses `===` on the category string. The spelling is not folded and the ends are not trimmed.

The open sequence is anchored to the latest application of that category. Each application refreshes the reset window. An older application stays in the count while every step from that application to the latest one, and from the latest one to `now`, stays below `reset`. In the usage data, the stuns at `0`, `10`, `20`, and `30` are still one sequence at time `34`, so `held.count` is `5` and the cap still applies. At time `48` the newest of those stuns is exactly one window old, so `restored.count` is `1` and the duration is full again. The applications before a gap leave together. They do not peel off one at a time while a newer application is still inside the window.

The boundary is `>=`. A gap equal to `reset` is a fresh count. A gap one unit smaller stays in the sequence. The same comparison is used between neighboring applications and between `now` and the latest one. `reset` of `0` makes every gap a fresh start, which is a category with no diminishing.

The multiplier table is the whole named curve. Count `1` is required. The keys are the application counts, written as canonical decimal integers, so the count in the result is the key that was used. The function does not invent a multiplier for a hole in the table. It also does not require the numbers to fall. A caller who wants half duration and then full duration names that curve.

Immunity is optional because a floor and a hard stop are different rules. With no cap, a count past the last named multiplier keeps that multiplier and `immune` stays `false`. With a cap, the cap is the last named count, and the next count is immune. A caller who wants two applications at a quarter duration and then immunity names both of those counts and sets `cap` to the last one. A multiplier of `0` is a real duration of zero. Immunity is the separate flag for a count the table no longer covers. Immune results still append an entry. The next call stays immune until that entry's window ends. Leaving the immune entry out of the stored history would expire the window from the previous time instead.

`resetAt` is the first time at which the returned history is back to count `1`. It is `now + reset`. The addition and the subtractions are ordinary IEEE operations. A non-finite difference, and a non-finite sum, are errors. A huge finite gap is still a normal comparison. Zero is stored as positive zero so a signed zero in the input does not leak into the result.

The result drops extra fields on purpose. The history the caller gets back is only `category` and `time`, which are the fields the next call reads. The input objects stay mutable and keep any extra fields the caller stored. The function does not freeze the input.

A call is a decision for one application at one time. The caller chooses whether to keep `history`. Keeping it records the application, including an immune one. Ignoring it is a preview: the input array is unchanged, and `log.length` is still `0` after the first usage call.

## License

MIT. Copyright (c) 2026 Vadim Gubin.
