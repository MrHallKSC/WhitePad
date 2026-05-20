// Teacher tokens authorise the teacher role on the SignalR hub. They must
// never be in URLs or QR codes (otherwise any student could replay them),
// so we hold them in sessionStorage keyed by roomId for the lifetime of the
// tab. Closing the tab forgets the token, which matches the create-room flow:
// re-entering the dashboard requires creating a fresh room anyway.

const KEY_PREFIX = 'whitepad:teacherToken:';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function storeTeacherToken(roomId: string, token: string): void {
  storage()?.setItem(KEY_PREFIX + roomId, token);
}

export function readTeacherToken(roomId: string): string | null {
  return storage()?.getItem(KEY_PREFIX + roomId) ?? null;
}

export function clearTeacherToken(roomId: string): void {
  storage()?.removeItem(KEY_PREFIX + roomId);
}
