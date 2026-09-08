import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };

function makeSelectBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.order = vi.fn(self);
  return builder;
}

let insertResult: QueryResult;
let listResult: QueryResult;
const uploadMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    storage: {
      from: () => ({ upload: uploadMock }),
    },
    from: fromMock,
  }),
}));

describe('data-backup.service', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    fromMock.mockReset();
    insertResult = { data: null, error: null };
    listResult = { data: [], error: null };
  });

  describe('saveDataBackup', () => {
    it('uploads the file to storage and inserts a backup row', async () => {
      uploadMock.mockResolvedValue({ error: null });
      insertResult = {
        data: {
          id: 'backup-1',
          file_name: 'familias.csv',
          mime_type: 'text/csv',
          size_bytes: 42,
          uploaded_by_email: 'owner@peskids.com',
          note: null,
          created_at: '2026-08-18T00:00:00.000Z',
        },
        error: null,
      };
      fromMock.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: async () => insertResult,
          }),
        }),
      });

      const { saveDataBackup } = await import('@/lib/services/data-backup.service');
      const result = await saveDataBackup(
        {
          name: 'familias.csv',
          mime_type: 'text/csv',
          size_bytes: 42,
          content_base64: Buffer.from('nombre,grado\nAna,3').toString('base64'),
        },
        'owner@peskids.com'
      );

      expect(uploadMock).toHaveBeenCalledTimes(1);
      const [path, , options] = uploadMock.mock.calls[0];
      expect(path).toMatch(/^peskids\/db-backups\/\d+-familias\.csv$/);
      expect(options).toMatchObject({ contentType: 'text/csv', upsert: false });
      expect(result).toEqual(insertResult.data);
    });

    it('throws when the storage upload fails, without inserting a row', async () => {
      uploadMock.mockResolvedValue({ error: { message: 'bucket unavailable' } });

      const { saveDataBackup } = await import('@/lib/services/data-backup.service');
      await expect(
        saveDataBackup(
          {
            name: 'familias.csv',
            mime_type: 'text/csv',
            size_bytes: 42,
            content_base64: Buffer.from('x').toString('base64'),
          },
          null
        )
      ).rejects.toThrow('bucket unavailable');

      expect(fromMock).not.toHaveBeenCalled();
    });
  });

  describe('listDataBackups', () => {
    it('returns backups ordered by most recent', async () => {
      listResult = {
        data: [
          {
            id: 'backup-1',
            file_name: 'familias.csv',
            mime_type: 'text/csv',
            size_bytes: 42,
            uploaded_by_email: 'owner@peskids.com',
            note: null,
            created_at: '2026-08-18T00:00:00.000Z',
          },
        ],
        error: null,
      };
      fromMock.mockReturnValue(makeSelectBuilder(listResult));

      const { listDataBackups } = await import('@/lib/services/data-backup.service');
      const backups = await listDataBackups();

      expect(backups).toEqual(listResult.data);
    });

    it('throws when the query errors', async () => {
      listResult = { data: null, error: { message: 'connection refused' } };
      fromMock.mockReturnValue(makeSelectBuilder(listResult));

      const { listDataBackups } = await import('@/lib/services/data-backup.service');
      await expect(listDataBackups()).rejects.toBeTruthy();
    });
  });
});
