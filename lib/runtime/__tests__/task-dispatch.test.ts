/**
 * Tests for Task Dispatch adapter
 */
import { describe, it, expect } from 'vitest';
import { extractTaskReferences } from '../task-dispatch';

describe('task-dispatch', () => {
  describe('extractTaskReferences', () => {
    it('should extract a single task reference', () => {
      const refs = extractTaskReferences('Ejecuta PESKIDS-1.1 por favor');
      expect(refs).toEqual(['PESKIDS-1.1']);
    });

    it('should extract a range of task references', () => {
      const refs = extractTaskReferences('Ejecuta PESKIDS-1.1 a PESKIDS-1.4');
      expect(refs).toEqual(['PESKIDS-1.1', 'PESKIDS-1.4']);
    });

    it('should dedupe repeated references', () => {
      const refs = extractTaskReferences('PESKIDS-1.1 y de nuevo PESKIDS-1.1');
      expect(refs).toEqual(['PESKIDS-1.1']);
    });

    it('should return an empty array when there are no references', () => {
      const refs = extractTaskReferences('mensaje sin referencias de tarea');
      expect(refs).toEqual([]);
    });
  });
});
