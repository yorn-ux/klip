// Token helper: store access token with expiry and provide safe getters
export function setAccessToken(token: string, expiresInSeconds: number) {
  try {
    localStorage.setItem('access_token', token);
    const exp = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem('access_token_exp', exp.toString());
  } catch (err) {
    console.error('Failed to set access token:', err);
  }
}

export function clearAccessToken() {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('access_token_exp');
  } catch (err) {
    console.error('Failed to clear access token:', err);
  }
}

export function getAccessToken(): string | null {
  try {
    const exp = localStorage.getItem('access_token_exp');
    if (!exp) return null;
    const expNum = Number(exp);
    if (Number.isNaN(expNum) || Date.now() > expNum) {
      // expired
      clearAccessToken();
      return null;
    }
    return localStorage.getItem('access_token');
  } catch (err) {
    console.error('Failed to read access token:', err);
    return null;
  }
}

export function accessTokenRemainingSeconds(): number {
  try {
    const exp = Number(localStorage.getItem('access_token_exp') || '0');
    if (!exp) return 0;
    const remaining = Math.floor((exp - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}
