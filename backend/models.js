const { randomUUID } = require("node:crypto");

function createId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function clone(value) {
  return structuredClone(value);
}

function coerceNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeDate(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

module.exports = {
  clone,
  coerceBoolean,
  coerceNumber,
  createId,
  normalizeDate,
};
