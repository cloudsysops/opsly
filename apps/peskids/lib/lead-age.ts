/**
 * Age helpers for family intake (birth_date → visible age + grade bucket).
 */

export function ageYearsFromBirthDate(
  birthDateIso: string,
  now: Date = new Date()
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateIso)) return null;
  const [y, m, d] = birthDateIso.split('-').map(Number);
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

export function gradeFromAgeYears(age: number | null): 'K-5' | '6-8' | '9-12' | 'Other' {
  if (age === null) return 'Other';
  if (age >= 4 && age <= 10) return 'K-5';
  if (age >= 11 && age <= 13) return '6-8';
  if (age >= 14 && age <= 17) return '9-12';
  return 'Other';
}
