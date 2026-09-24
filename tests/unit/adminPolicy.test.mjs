// Tests de reglas puras de administración (runner nativo de Node, sin dependencias).
// Ejecutar con: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  checkAdminRoleAssignment,
  createAttemptLimiter,
  getRegistradorEditDeadline,
  hasAdminRole,
  isPanelRole,
  isWithinRegistradorEditWindow,
  validateAdminPassword,
  buildSemanasAltas,
  getPeruWeekStart,
  getSemanaIndex,
} from '../../src/lib/adminPolicy.ts';

test('REGISTRADOR es rol de panel pero no administrador', () => {
  assert.equal(hasAdminRole('REGISTRADOR'), false);
  assert.equal(isPanelRole('REGISTRADOR'), true);
  assert.equal(hasAdminRole('SUPERADMINISTRADOR'), true);
  assert.equal(isPanelRole('DOCENTE'), false);
});

test('ventana de edición: 14 días desde el registro', () => {
  const createdAt = new Date('2026-09-01T12:00:00Z');
  assert.equal(isWithinRegistradorEditWindow(createdAt, null, new Date(createdAt.getTime() + 13 * DAY_MS)), true);
  assert.equal(isWithinRegistradorEditWindow(createdAt, null, new Date(createdAt.getTime() + 14 * DAY_MS)), false);
  assert.equal(isWithinRegistradorEditWindow(createdAt, null, new Date(createdAt.getTime() + 20 * DAY_MS)), false);
});

test('ventana de edición: la ampliación del superadmin extiende el plazo, nunca lo acorta', () => {
  const createdAt = new Date('2026-09-01T12:00:00Z');
  const ampliada = new Date(createdAt.getTime() + 21 * DAY_MS);
  assert.equal(getRegistradorEditDeadline(createdAt, ampliada).getTime(), ampliada.getTime());
  assert.equal(isWithinRegistradorEditWindow(createdAt, ampliada, new Date(createdAt.getTime() + 20 * DAY_MS)), true);

  const menor = new Date(createdAt.getTime() + 3 * DAY_MS);
  assert.equal(getRegistradorEditDeadline(createdAt, menor).getTime(), createdAt.getTime() + 14 * DAY_MS);
});

test('solo el superadmin gestiona superadministradores y registradores', () => {
  assert.equal(checkAdminRoleAssignment('SUPERADMINISTRADOR', 'REGISTRADOR'), null);
  assert.equal(checkAdminRoleAssignment('SUPERADMINISTRADOR', 'SUPERADMINISTRADOR'), null);
  assert.notEqual(checkAdminRoleAssignment('ADMINISTRADOR', 'REGISTRADOR'), null);
  assert.notEqual(checkAdminRoleAssignment('ADMINISTRADOR', 'SUPERADMINISTRADOR'), null);
  assert.notEqual(checkAdminRoleAssignment('ADMINISTRADOR', undefined, 'REGISTRADOR'), null);
  assert.notEqual(checkAdminRoleAssignment('ADMINISTRADOR', 'ADMINISTRADOR', 'SUPERADMINISTRADOR'), null);
  assert.equal(checkAdminRoleAssignment('ADMINISTRADOR', 'GESTOR_LICENCIAS', 'ADMINISTRADOR'), null);
});

test('contraseñas de administrador: mínimo 10 caracteres', () => {
  assert.notEqual(validateAdminPassword(''), null);
  assert.notEqual(validateAdminPassword('202601'), null);
  assert.notEqual(validateAdminPassword('   abc   '), null);
  assert.equal(validateAdminPassword('Kx7mPq2wZr9t'), null);
});

test('limitador de intentos: bloquea tras el máximo y se libera al vencer la ventana', () => {
  const limiter = createAttemptLimiter(3, 1000);
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) {
    assert.equal(limiter.isBlocked('admin@x.pe', t0), false);
    limiter.registerFailure('admin@x.pe', t0);
  }
  assert.equal(limiter.isBlocked('admin@x.pe', t0 + 500), true);
  assert.equal(limiter.isBlocked('otra@x.pe', t0 + 500), false);
  assert.equal(limiter.isBlocked('admin@x.pe', t0 + 1001), false);

  limiter.registerFailure('b@x.pe', t0);
  limiter.reset('b@x.pe');
  assert.equal(limiter.isBlocked('b@x.pe', t0), false);
});

test('semana de altas: lunes 00:00 a domingo 23:59 en hora de Perú', () => {
  // Miércoles 23 sep 2026, 10:00 Lima -> lunes 21 sep 00:00 Lima (05:00 UTC)
  assert.equal(getPeruWeekStart(new Date('2026-09-23T15:00:00Z')).toISOString(), '2026-09-21T05:00:00.000Z');
  // Lunes 21 sep 00:30 UTC es aún domingo 20 sep en Lima -> semana anterior
  assert.equal(getPeruWeekStart(new Date('2026-09-21T00:30:00Z')).toISOString(), '2026-09-14T05:00:00.000Z');
  // Domingo 27 sep 23:59 Lima sigue en la semana del 21
  assert.equal(getPeruWeekStart(new Date('2026-09-28T04:59:00Z')).toISOString(), '2026-09-21T05:00:00.000Z');
});

test('semanas de altas: más reciente primero y asignación por índice', () => {
  const now = new Date('2026-09-23T15:00:00Z');
  const semanas = buildSemanasAltas(4, now);
  assert.equal(semanas.length, 4);
  assert.equal(semanas[0].inicio.toISOString(), '2026-09-21T05:00:00.000Z');
  assert.equal(semanas[3].inicio.toISOString(), '2026-08-31T05:00:00.000Z');
  assert.equal(getSemanaIndex(new Date('2026-09-22T12:00:00Z'), semanas), 0);
  assert.equal(getSemanaIndex(new Date('2026-09-20T12:00:00Z'), semanas), 1);
  assert.equal(getSemanaIndex(new Date('2026-08-01T12:00:00Z'), semanas), -1);
});
