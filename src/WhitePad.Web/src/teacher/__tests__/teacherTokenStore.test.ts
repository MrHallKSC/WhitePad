import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTeacherToken, readTeacherToken, storeTeacherToken } from '../teacherTokenStore';

// A minimal in-memory Storage implementation for the round-trip tests.
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => map.delete(key),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('teacherTokenStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('with sessionStorage available', () => {
    beforeEach(() => {
      vi.stubGlobal('window', { sessionStorage: createMemoryStorage() });
    });

    it('stores and reads a token back', () => {
      storeTeacherToken('room-1', 'secret-token');
      expect(readTeacherToken('room-1')).toBe('secret-token');
    });

    it('returns null for an unknown room', () => {
      expect(readTeacherToken('never-stored')).toBeNull();
    });

    it('clears a stored token', () => {
      storeTeacherToken('room-1', 'secret-token');
      clearTeacherToken('room-1');
      expect(readTeacherToken('room-1')).toBeNull();
    });

    it('keeps tokens namespaced per room', () => {
      storeTeacherToken('room-1', 'token-1');
      storeTeacherToken('room-2', 'token-2');

      expect(readTeacherToken('room-1')).toBe('token-1');
      expect(readTeacherToken('room-2')).toBe('token-2');

      clearTeacherToken('room-1');
      expect(readTeacherToken('room-1')).toBeNull();
      expect(readTeacherToken('room-2')).toBe('token-2');
    });
  });

  describe('when window/sessionStorage is unavailable (SSR safety)', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined);
    });

    it('read returns null without throwing', () => {
      expect(readTeacherToken('room-1')).toBeNull();
    });

    it('store and clear are no-ops without throwing', () => {
      expect(() => storeTeacherToken('room-1', 'token')).not.toThrow();
      expect(() => clearTeacherToken('room-1')).not.toThrow();
    });
  });
});
