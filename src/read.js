import { isObject, normalizeZero } from "./shape.js";

const OPTIONS_MESSAGE = "options must be an object";
const CATEGORY_MESSAGE = "category must be a non-empty string";
const NOW_MESSAGE = "now must be a finite number";
const DURATION_MESSAGE = "duration must be a finite number greater than or equal to 0";
const HISTORY_MESSAGE = "history must be an array";
const APPLICATION_MESSAGE = "application must be an object";
const APPLICATION_CATEGORY_MESSAGE = "application category must be a non-empty string";
const TIME_MESSAGE = "application time must be a finite number";
const TIME_ORDER_MESSAGE = "application time must be less than or equal to now";
const RULES_MESSAGE = "rules must be an object";
const INCLUDE_MESSAGE = "rules must include the category";
const RULE_MESSAGE = "rule must be an object";
const MULTIPLIERS_MESSAGE = "multipliers must be an object";
const COUNTS_MESSAGE = "multiplier counts must be contiguous integers starting at 1";
const MULTIPLIER_MESSAGE = "multiplier must be a finite number from 0 to 1";
const RESET_MESSAGE = "reset must be a finite number greater than or equal to 0";
const CAP_MESSAGE = "cap must be an integer greater than or equal to 1";
const CAP_MATCH_MESSAGE = "cap must match the last multiplier";

export function readOptions(options) {
  if (!isObject(options)) {
    throw new TypeError(OPTIONS_MESSAGE);
  }
  const category = readName(options, "category", CATEGORY_MESSAGE);
  const now = readNow(options);
  const duration = readDuration(options);
  const history = readHistory(options, now);
  const rule = readRule(options, category);
  const multipliers = readMultipliers(rule);
  const reset = readReset(rule);
  const cap = readCap(rule, multipliers.length);
  return { category, now, duration, history, multipliers, reset, cap };
}

function readName(source, key, message) {
  if (!Object.hasOwn(source, key) || typeof source[key] !== "string" || source[key].length === 0) {
    throw new TypeError(message);
  }
  return source[key];
}

function readNow(options) {
  if (
    !Object.hasOwn(options, "now") ||
    typeof options.now !== "number" ||
    !Number.isFinite(options.now)
  ) {
    throw new RangeError(NOW_MESSAGE);
  }
  return normalizeZero(options.now);
}

function readDuration(options) {
  if (
    !Object.hasOwn(options, "duration") ||
    typeof options.duration !== "number" ||
    !Number.isFinite(options.duration) ||
    options.duration < 0
  ) {
    throw new RangeError(DURATION_MESSAGE);
  }
  return normalizeZero(options.duration);
}

function readHistory(options, now) {
  if (!Object.hasOwn(options, "history") || !Array.isArray(options.history)) {
    throw new TypeError(HISTORY_MESSAGE);
  }
  const history = [];
  for (const entry of options.history) {
    history.push(readApplication(entry, now));
  }
  return history;
}

function readApplication(entry, now) {
  if (!isObject(entry)) {
    throw new TypeError(APPLICATION_MESSAGE);
  }
  const category = readName(entry, "category", APPLICATION_CATEGORY_MESSAGE);
  const time = readTime(entry, now);
  return { category, time };
}

function readTime(entry, now) {
  if (
    !Object.hasOwn(entry, "time") ||
    typeof entry.time !== "number" ||
    !Number.isFinite(entry.time)
  ) {
    throw new RangeError(TIME_MESSAGE);
  }
  if (entry.time > now) {
    throw new RangeError(TIME_ORDER_MESSAGE);
  }
  return normalizeZero(entry.time);
}

function readRule(options, category) {
  if (!Object.hasOwn(options, "rules") || !isObject(options.rules)) {
    throw new TypeError(RULES_MESSAGE);
  }
  if (!Object.hasOwn(options.rules, category)) {
    throw new TypeError(INCLUDE_MESSAGE);
  }
  const rule = options.rules[category];
  if (!isObject(rule)) {
    throw new TypeError(RULE_MESSAGE);
  }
  return rule;
}

function readMultipliers(rule) {
  if (!Object.hasOwn(rule, "multipliers") || !isObject(rule.multipliers)) {
    throw new TypeError(MULTIPLIERS_MESSAGE);
  }
  const counts = readCounts(rule.multipliers);
  const multipliers = [];
  for (const count of counts) {
    multipliers.push(readMultiplier(rule.multipliers[String(count)]));
  }
  return multipliers;
}

function readCounts(source) {
  const counts = [];
  for (const key of Object.keys(source)) {
    counts.push(readCount(key));
  }
  counts.sort(compareCount);
  if (counts.length === 0 || counts[0] !== 1) {
    throw new RangeError(COUNTS_MESSAGE);
  }
  for (let index = 0; index < counts.length; index += 1) {
    if (counts[index] !== index + 1) {
      throw new RangeError(COUNTS_MESSAGE);
    }
  }
  return counts;
}

function readCount(key) {
  const value = Number(key);
  if (!Number.isSafeInteger(value) || value < 1 || String(value) !== key) {
    throw new RangeError(COUNTS_MESSAGE);
  }
  return value;
}

function compareCount(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function readMultiplier(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(MULTIPLIER_MESSAGE);
  }
  return normalizeZero(value);
}

function readReset(rule) {
  if (
    !Object.hasOwn(rule, "reset") ||
    typeof rule.reset !== "number" ||
    !Number.isFinite(rule.reset) ||
    rule.reset < 0
  ) {
    throw new RangeError(RESET_MESSAGE);
  }
  return normalizeZero(rule.reset);
}

function readCap(rule, size) {
  if (!Object.hasOwn(rule, "cap") || rule.cap === undefined) {
    return null;
  }
  if (typeof rule.cap !== "number" || !Number.isSafeInteger(rule.cap) || rule.cap < 1) {
    throw new RangeError(CAP_MESSAGE);
  }
  if (rule.cap !== size) {
    throw new RangeError(CAP_MATCH_MESSAGE);
  }
  return rule.cap;
}
