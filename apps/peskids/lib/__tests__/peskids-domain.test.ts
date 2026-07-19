import { describe, expect, it } from 'vitest';
import { classFormatLabel, formatAgeRange } from '@/lib/peskids-domain';

describe('Peskids domain labels', () => {
  it.each([
    ['4', '4 años'],
    ['4 años', '4 años'],
    ['6-8', '6–8 años'],
    ['6 a 8', '6–8 años'],
    ['K-5', '3 meses–5 años'],
    ['3A', 'Edad por confirmar'],
    ['Grade 3', 'Edad por confirmar'],
    ['Nivel 2', 'Edad por confirmar'],
    ['Other', 'Edad por confirmar'],
    ['', 'Edad por confirmar'],
  ])('formats legacy age value %s as %s', (value, expected) => {
    expect(formatAgeRange(value)).toBe(expected);
  });

  it.each([
    [1, 'Clase individual'],
    [3, 'Grupo pequeño · 3 niños'],
    [4, 'Grupo pequeño · 4 niños'],
    [2, 'Formato por revisar · 2 cupos'],
    [8, 'Formato por revisar · 8 cupos'],
  ])('labels capacity %i as %s', (capacity, expected) => {
    expect(classFormatLabel(capacity)).toBe(expected);
  });
});
