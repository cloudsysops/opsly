import { describe, expect, it } from 'vitest';
import { attendanceUpdateSchema } from '@/lib/validation/class.schema';

describe('class feedback payload', () => {
  it('accepts attendance with bounded behavior tags and note', () => {
    const result = attendanceUpdateSchema.safeParse({
      updates: [
        {
          enrollment_id: '00000000-0000-4000-8000-000000000001',
          attendance: 'present',
          behavior_tags: ['happy', 'engaged'],
          teacher_note: 'Participó con entusiasmo.',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown behavior tags and oversized notes', () => {
    const result = attendanceUpdateSchema.safeParse({
      updates: [
        {
          enrollment_id: '00000000-0000-4000-8000-000000000001',
          attendance: 'present',
          behavior_tags: ['unknown'],
          teacher_note: 'x'.repeat(501),
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
