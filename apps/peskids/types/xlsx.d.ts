declare module 'xlsx' {
  export type WorkBook = {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  };

  export type WorkSheet = Record<string, unknown>;

  export const utils: {
    sheet_to_json: <T = unknown>(
      worksheet: WorkSheet,
      opts?: { header?: number | string[]; defval?: unknown; raw?: boolean }
    ) => T[];
  };

  export function read(
    data: ArrayBuffer | Uint8Array | string,
    opts?: { type?: 'array' | 'buffer' | 'binary' | 'base64' | 'string' }
  ): WorkBook;
}
