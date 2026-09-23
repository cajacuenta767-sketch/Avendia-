import 'server-only';

import { createHmac, randomInt } from 'crypto';

const PERU_TIME_ZONE = 'America/Lima';
const FOUR_DIGIT_PIN = /^\d{4}$/;

export interface DailyDocentePinIdentity {
  id: string;
  email: string;
  pinSeed?: string | null;
}

export function generateDocentePinSeed(): string {
  return randomInt(1000, 10000).toString();
}

export function isValidDocentePinSeed(value: string | null | undefined): value is string {
  return typeof value === 'string' && FOUR_DIGIT_PIN.test(value.trim());
}

export function getPeruDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PERU_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get('year');
  const month = values.get('month');
  const day = values.get('day');

  if (!year || !month || !day) {
    throw new Error('No se pudo determinar la fecha peruana para el PIN diario.');
  }

  return `${year}-${month}-${day}`;
}

function getDailyPinSecret(): string {
  const secret = process.env.DOCENTE_DAILY_PIN_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error('Falta DOCENTE_DAILY_PIN_SECRET o SESSION_SECRET para calcular el PIN diario.');
  }
  return secret;
}

export function getDailyDocentePin(
  identity: DailyDocentePinIdentity,
  date: Date = new Date()
): string {
  const normalizedEmail = identity.email.trim().toLowerCase();
  const normalizedSeed = isValidDocentePinSeed(identity.pinSeed)
    ? identity.pinSeed.trim()
    : 'LEGACY_WITHOUT_SEED';
  const dateKey = getPeruDateKey(date);
  const payload = ['AVEND_DOCENTE_PIN_V1', dateKey, identity.id, normalizedEmail, normalizedSeed].join(':');
  const digest = createHmac('sha256', getDailyPinSecret()).update(payload).digest();
  const [year, month, day] = dateKey.split('-').map(Number);
  const peruDayOrdinal = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const dailyBucketStart = peruDayOrdinal % 2 === 0 ? 1000 : 5500;
  const pinNumber = (digest.readUInt32BE(0) % 4500) + dailyBucketStart;
  return pinNumber.toString();
}
