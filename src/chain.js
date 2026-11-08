const DIFFERENCE_MESSAGE = "time difference must be finite";

export function priorCount(history, category, now, reset) {
  const prior = [];
  for (let index = 0; index < history.length; index += 1) {
    const entry = history[index];
    if (entry.category === category) {
      prior.push({ time: entry.time, index });
    }
  }
  prior.sort(compareApplications);
  if (prior.length === 0) {
    return 0;
  }
  const latestGap = difference(now, prior[prior.length - 1].time);
  if (latestGap >= reset) {
    return 0;
  }
  let count = 1;
  for (let index = prior.length - 1; index > 0; index -= 1) {
    const gap = difference(prior[index].time, prior[index - 1].time);
    if (gap >= reset) {
      break;
    }
    count += 1;
  }
  return count;
}

function compareApplications(left, right) {
  if (left.time < right.time) {
    return -1;
  }
  if (left.time > right.time) {
    return 1;
  }
  if (left.index < right.index) {
    return -1;
  }
  if (left.index > right.index) {
    return 1;
  }
  return 0;
}

function difference(later, earlier) {
  const value = later - earlier;
  if (!Number.isFinite(value)) {
    throw new RangeError(DIFFERENCE_MESSAGE);
  }
  return value;
}
