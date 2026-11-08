import { priorCount } from "./chain.js";
import { readOptions } from "./read.js";
import { normalizeZero } from "./shape.js";

const RESET_TIME_MESSAGE = "reset time must be finite";

export function diminish(options) {
  const input = readOptions(options);
  const count = priorCount(input.history, input.category, input.now, input.reset) + 1;
  const immune = input.cap !== null && count > input.cap;
  const multiplier = immune ? 0 : multiplierFor(input.multipliers, count);
  return Object.freeze({
    category: input.category,
    now: input.now,
    base: input.duration,
    count,
    multiplier,
    duration: normalizeZero(input.duration * multiplier),
    immune,
    resetAt: resetAt(input.now, input.reset),
    history: nextHistory(input.history, input.category, input.now)
  });
}

function multiplierFor(multipliers, count) {
  if (count <= multipliers.length) {
    return multipliers[count - 1];
  }
  return multipliers[multipliers.length - 1];
}

function resetAt(now, reset) {
  const value = now + reset;
  if (!Number.isFinite(value)) {
    throw new RangeError(RESET_TIME_MESSAGE);
  }
  return normalizeZero(value);
}

function nextHistory(history, category, now) {
  const entries = [];
  for (const entry of history) {
    entries.push(freezeApplication(entry.category, entry.time));
  }
  entries.push(freezeApplication(category, now));
  return Object.freeze(entries);
}

function freezeApplication(category, time) {
  return Object.freeze({
    category,
    time
  });
}
