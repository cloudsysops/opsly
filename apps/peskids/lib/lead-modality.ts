/** Labels aligned with API `class_modality` values. */
export const PESKIDS_CLASS_MODALITY_OPTIONS = [
  { value: 'llanogrande', label: 'Sede Llanogrande (Rionegro)' },
  { value: 'domicilio', label: 'Clase a domicilio' },
] as const;

export type PeskidsClassModality = (typeof PESKIDS_CLASS_MODALITY_OPTIONS)[number]['value'];

export function classModalityLabel(value: string | null | undefined): string {
  if (value === 'llanogrande') return 'Sede Llanogrande';
  if (value === 'domicilio') return 'A domicilio';
  if (value === 'institutional') return 'Institucional';
  return value ?? '—';
}

export function leadTypeLabel(value: string | null | undefined): string {
  if (value === 'teacher_applicant') return 'Profesor';
  if (value === 'company') return 'Empresa';
  return 'Familia';
}

export function serviceModeLabel(value: string | null | undefined): string {
  return classModalityLabel(value);
}
