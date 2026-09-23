import 'server-only';

import { randomInt } from 'crypto';

const FOUR_DIGIT_PIN = /^\d{4}$/;

export function generateDocentePin(): string {
  return randomInt(1000, 10000).toString();
}

export function normalizeDocentePin(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return FOUR_DIGIT_PIN.test(normalized) ? normalized : null;
}

export function isValidDocentePin(value: string | null | undefined): value is string {
  return normalizeDocentePin(value) !== null;
}
