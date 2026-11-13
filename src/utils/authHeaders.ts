export interface StoredAuthSession {
  id?: string;
  userId?: string;
  role?: string;
  departmentId?: string;
  department?: string;
  nationalId?: string;
  teamId?: string;
  sessionToken?: string;
  token?: string;
  name?: string;
  permissions?: string[];
  allowedPages?: string[];
}

export function getStoredAuthSession(): StoredAuthSession | null {
  try {
    const raw =
      localStorage.getItem('reyadat_auth_session') ||
      localStorage.getItem('reyadat_session_auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const session = getStoredAuthSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra || {}),
  };

  if (session) {
    const token = session.sessionToken || session.token;
    if (token) {
      headers['x-session-token'] = String(token);
      headers['Authorization'] = `Bearer ${String(token)}`;
    }
    const uid = session.userId || session.id;
    if (uid) headers['x-user-id'] = String(uid);
    if (session.role) headers['x-user-role'] = String(session.role);
    const deptId = session.departmentId || session.department;
    if (deptId) headers['x-department-id'] = String(deptId);
    if (session.nationalId) headers['x-national-id'] = String(session.nationalId);
    if (session.teamId) headers['x-team-id'] = String(session.teamId);
  }

  return headers;
}
