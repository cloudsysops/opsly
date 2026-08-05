/**
 * Spreadsheet helpers for Peskids admin imports (CSV).
 * CSV is intentionally parsed without a third-party workbook parser so
 * untrusted uploads do not reach a vulnerable Excel parsing dependency.
 */

export type SpreadsheetRow = Record<string, string>;

export type ParsedSpreadsheet = {
  headers: string[];
  rows: SpreadsheetRow[];
  sourceFormat: 'csv';
};

function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Minimal RFC4180-ish CSV parser (supports quotes and commas). */
export function parseCsvText(text: string): ParsedSpreadsheet {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushCell = (): void => {
    row.push(cell);
    cell = '';
  };
  const pushRow = (): void => {
    if (row.length === 1 && row[0] === '' && rows.length === 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      pushCell();
      continue;
    }
    if (ch === '\n') {
      pushCell();
      pushRow();
      continue;
    }
    if (ch === '\r') {
      continue;
    }
    cell += ch;
  }
  pushCell();
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
    pushRow();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], sourceFormat: 'csv' };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows: SpreadsheetRow[] = [];
  for (const cells of rows.slice(1)) {
    if (cells.every((c) => !c.trim())) continue;
    const record: SpreadsheetRow = {};
    headers.forEach((header, idx) => {
      const key = header || `col_${idx + 1}`;
      record[key] = (cells[idx] ?? '').trim();
    });
    dataRows.push(record);
  }

  return { headers, rows: dataRows, sourceFormat: 'csv' };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain') {
    return parseCsvText(await file.text());
  }

  throw new Error(
    'Formato no soportado. Exporta tu Excel como CSV UTF-8 antes de importarlo. Los PDF se adjuntan en el chat de cambios.'
  );
}

function pickField(row: SpreadsheetRow, aliases: string[]): string | undefined {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [
    normalizeHeader(key),
    value.trim(),
  ] as const);

  for (const alias of aliases) {
    const needle = normalizeHeader(alias);
    const hit = normalizedEntries.find(([key]) => key === needle || key.includes(needle));
    if (hit && hit[1]) return hit[1];
  }
  return undefined;
}

export type StudentImportDraft = {
  name: string;
  grade: string;
  parent_email?: string;
  parent_phone?: string;
  notes?: string;
};

export function mapRowToStudentDraft(row: SpreadsheetRow): StudentImportDraft | null {
  const name =
    pickField(row, [
      'nombre',
      'name',
      'alumno',
      'estudiante',
      'nino',
      'nina',
      'hijo',
      'student_name',
      'nombre_alumno',
      'nombre_estudiante',
    ]) ?? '';
  if (name.trim().length < 2) return null;

  const grade =
    pickField(row, ['grado', 'grade', 'nivel', 'edad', 'age', 'grupo', 'category']) ??
    'Por confirmar';
  const parent_email = pickField(row, [
    'email',
    'correo',
    'parent_email',
    'email_padre',
    'email_madre',
    'email_acudiente',
    'correo_acudiente',
    'mail',
  ]);
  const parent_phone = pickField(row, [
    'telefono',
    'celular',
    'whatsapp',
    'phone',
    'parent_phone',
    'tel',
    'movil',
    'telefono_acudiente',
  ]);
  const notes = pickField(row, ['notas', 'notes', 'observaciones', 'comentario', 'sede', 'modalidad']);

  return {
    name: name.trim(),
    grade: grade.trim().slice(0, 40) || 'Por confirmar',
    parent_email: parent_email?.includes('@') ? parent_email.trim() : undefined,
    parent_phone: parent_phone ? parent_phone.replace(/[^\d+]/g, '').slice(0, 20) : undefined,
    notes: notes?.slice(0, 500),
  };
}

export type StaffImportDraft = {
  email: string;
  name: string;
  role: 'admin' | 'support' | 'teacher';
};

function mapRole(raw: string | undefined): StaffImportDraft['role'] {
  const value = (raw ?? '').toLowerCase();
  if (/(admin|administrador|dueño|owner)/.test(value)) return 'admin';
  if (/(support|soporte|asesor)/.test(value)) return 'support';
  return 'teacher';
}

export function mapRowToStaffDraft(row: SpreadsheetRow): StaffImportDraft | null {
  const email = pickField(row, ['email', 'correo', 'mail', 'usuario', 'user']);
  if (!email || !email.includes('@')) return null;
  const name =
    pickField(row, ['nombre', 'name', 'profesor', 'teacher', 'staff', 'empleado']) ??
    email.split('@')[0] ??
    email;
  const role = mapRole(pickField(row, ['rol', 'role', 'cargo', 'puesto', 'tipo']));
  return {
    email: email.trim().toLowerCase(),
    name: name.trim().slice(0, 120) || email,
    role,
  };
}

export function mapStudentsFromSpreadsheet(parsed: ParsedSpreadsheet): {
  drafts: StudentImportDraft[];
  skipped: number;
} {
  const drafts: StudentImportDraft[] = [];
  let skipped = 0;
  for (const row of parsed.rows) {
    const draft = mapRowToStudentDraft(row);
    if (!draft) {
      skipped += 1;
      continue;
    }
    drafts.push(draft);
  }
  return { drafts, skipped };
}

export function mapStaffFromSpreadsheet(parsed: ParsedSpreadsheet): {
  drafts: StaffImportDraft[];
  skipped: number;
} {
  const drafts: StaffImportDraft[] = [];
  let skipped = 0;
  for (const row of parsed.rows) {
    const draft = mapRowToStaffDraft(row);
    if (!draft) {
      skipped += 1;
      continue;
    }
    drafts.push(draft);
  }
  return { drafts, skipped };
}
