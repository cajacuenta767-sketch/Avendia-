import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDocenteSpecialtyAccess } from '../../src/utils/badgeUtils.ts';

test('Docente EBE tiene acceso a evaluaciones y resoluciones EBE', () => {
  const sessionMiguel = {
    nombre: 'Miguel Antonio Velásquez Trujillo',
    email: 'miguelvelasqueztrujillo6@gmail.com',
    modalidad: 'EBE',
    nivel: '-',
    areas: ['EBE'],
    rol: 'DOCENTE',
  };

  const evalEbeAscenso2025 = {
    id: 'cmsxjn13o000x4prlza2s9twe',
    titulo: 'Prueba Única Nacional ASCENSO_ESCALAFON 2025 - General',
    proceso: 'ASCENSO_ESCALAFON',
    modalidad: 'EBE',
    nivel: 'NO_APLICA',
    area: 'General',
  };

  const evalEbeNombramiento2024 = {
    id: 'cmt55j1m1000rrqsjuk9fq86t',
    titulo: 'Prueba Única Nacional NOMBRAMIENTO_DOCENTE 2024 - Habilidades Generales - Educación Básica Especial',
    proceso: 'NOMBRAMIENTO_DOCENTE',
    modalidad: 'EBE',
    nivel: 'NO_APLICA',
    area: 'Educación Básica Especial',
  };

  const resAscenso = checkDocenteSpecialtyAccess(sessionMiguel, evalEbeAscenso2025);
  assert.equal(resAscenso.hasAccess, true, 'Debe permitir acceso a resolución de EBE Ascenso');
  assert.equal(resAscenso.evaluationLabel.includes('NO_APLICA'), false, 'La etiqueta no debe contener NO_APLICA');

  const resNombramiento = checkDocenteSpecialtyAccess(sessionMiguel, evalEbeNombramiento2024);
  assert.equal(resNombramiento.hasAccess, true, 'Debe permitir acceso a resolución de EBE Nombramiento');
});

test('Docente EBE sin áreas explícitas pero con modalidad EBE tiene acceso', () => {
  const sessionSinAreas = {
    nombre: 'Docente EBE Genérico',
    email: 'ebe@avend.pe',
    modalidad: 'EBE',
    nivel: '-',
    areas: [],
    rol: 'DOCENTE',
  };

  const evalEbe = {
    modalidad: 'EBE',
    nivel: 'NO_APLICA',
    area: 'General',
  };

  const res = checkDocenteSpecialtyAccess(sessionSinAreas, evalEbe);
  assert.equal(res.hasAccess, true);
});

test('Docente EBR Primaria NO tiene acceso a evaluaciones EBE', () => {
  const sessionPrimaria = {
    nombre: 'Docente Primaria',
    email: 'primaria@avend.pe',
    modalidad: 'EBR',
    nivel: 'PRIMARIA',
    areas: ['EBR - Primaria - Primaria'],
    rol: 'DOCENTE',
  };

  const evalEbe = {
    modalidad: 'EBE',
    nivel: 'NO_APLICA',
    area: 'General',
  };

  const res = checkDocenteSpecialtyAccess(sessionPrimaria, evalEbe);
  assert.equal(res.hasAccess, false, 'Docente de EBR Primaria no debe acceder a EBE');
});

test('Docente EBE NO tiene acceso a evaluaciones EBR Secundaria', () => {
  const sessionEbe = {
    nombre: 'Docente EBE',
    email: 'ebe@avend.pe',
    modalidad: 'EBE',
    nivel: '-',
    areas: ['EBE'],
    rol: 'DOCENTE',
  };

  const evalSecundaria = {
    modalidad: 'EBR',
    nivel: 'SECUNDARIA',
    area: 'Matemática',
  };

  const res = checkDocenteSpecialtyAccess(sessionEbe, evalSecundaria);
  assert.equal(res.hasAccess, false, 'Docente de EBE no debe acceder a EBR Secundaria');
});

test('Docente CETPRO tiene acceso a evaluaciones CETPRO', () => {
  const sessionCetpro = {
    nombre: 'Docente CETPRO',
    email: 'cetpro@avend.pe',
    modalidad: 'CETPRO',
    nivel: 'NO_APLICA',
    areas: ['CETPRO - Ciclo Técnico y Auxiliar'],
    rol: 'DOCENTE',
  };

  const evalCetpro = {
    modalidad: 'CETPRO',
    nivel: 'NO_APLICA',
    area: 'General',
  };

  const res = checkDocenteSpecialtyAccess(sessionCetpro, evalCetpro);
  assert.equal(res.hasAccess, true, 'Docente CETPRO debe acceder a evaluaciones CETPRO');
});
