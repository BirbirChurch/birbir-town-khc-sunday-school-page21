import { BlockedBrowserRule, BrowserClientInfo, BrowserDeviceType } from '../types';

const BROWSER_ID_KEY = 'bk_khc_browser_id_v1';
const BROWSER_COOKIE_KEY = 'bk_khc_bid';

function readCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const prefix = `${encodeURIComponent(name)}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
  } catch {
    // ignore cookie errors in restricted contexts
  }
  return null;
}

function writeCookie(name: string, value: string): void {
  try {
    if (typeof document === 'undefined') return;
    const maxAge = 60 * 60 * 24 * 365 * 5;
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore cookie write errors
  }
}

function getOrCreateBrowserId(): string {
  try {
    const fromLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(BROWSER_ID_KEY) : null;
    const fromSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(BROWSER_ID_KEY) : null;
    const fromCookie = readCookie(BROWSER_COOKIE_KEY);
    const existing = (fromLocal || fromSession || fromCookie || '').trim();
    if (existing) {
      try {
        localStorage.setItem(BROWSER_ID_KEY, existing);
      } catch {
        // ignore
      }
      try {
        sessionStorage.setItem(BROWSER_ID_KEY, existing);
      } catch {
        // ignore
      }
      if (!fromCookie) writeCookie(BROWSER_COOKIE_KEY, existing);
      return existing;
    }
  } catch {
    // ignore storage errors
  }

  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).toUpperCase().slice(-5);
  const generated = `BR-${timePart}-${randomPart}`;

  try {
    localStorage.setItem(BROWSER_ID_KEY, generated);
  } catch {
    // ignore
  }
  try {
    sessionStorage.setItem(BROWSER_ID_KEY, generated);
  } catch {
    // ignore
  }
  writeCookie(BROWSER_COOKIE_KEY, generated);
  return generated;
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

function detectBrowserName(ua: string): string {
  if (!ua) return 'Unknown Browser';
  if (/SamsungBrowser\/([\d.]+)/i.test(ua)) {
    return `Samsung Internet ${RegExp.$1.split('.')[0]}`;
  }
  if (/EdgA?\/([\d.]+)/i.test(ua) || /EdgiOS\/([\d.]+)/i.test(ua)) {
    return `Microsoft Edge ${RegExp.$1.split('.')[0]}`;
  }
  if (/OPR\/([\d.]+)/i.test(ua) || /Opera\/([\d.]+)/i.test(ua)) {
    return `Opera ${RegExp.$1.split('.')[0]}`;
  }
  if (/DuckDuckGo\/([\d.]+)/i.test(ua)) {
    return `DuckDuckGo Browser`;
  }
  if (/YaBrowser\/([\d.]+)/i.test(ua)) {
    return `Yandex Browser ${RegExp.$1.split('.')[0]}`;
  }
  if (/UCBrowser\/([\d.]+)/i.test(ua)) {
    return `UC Browser`;
  }
  if (/CriOS\/([\d.]+)/i.test(ua)) {
    return `Chrome (iOS) ${RegExp.$1.split('.')[0]}`;
  }
  if (/FxiOS\/([\d.]+)/i.test(ua)) {
    return `Firefox (iOS) ${RegExp.$1.split('.')[0]}`;
  }
  if (/Firefox\/([\d.]+)/i.test(ua)) {
    return `Mozilla Firefox ${RegExp.$1.split('.')[0]}`;
  }
  if (/; wv\)/i.test(ua) && /Android/i.test(ua)) {
    return 'Android WebView';
  }
  if (/Chrome\/([\d.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const isBrave = typeof navigator !== 'undefined' && Boolean((navigator as { brave?: unknown }).brave);
    return `${isBrave ? 'Brave' : 'Google Chrome'} ${RegExp.$1.split('.')[0]}`;
  }
  if (/Version\/([\d.]+).*Safari/i.test(ua)) {
    return `Safari ${RegExp.$1.split('.')[0]}`;
  }
  if (/Safari/i.test(ua)) {
    return 'Apple Safari';
  }
  return 'Web Browser';
}

function detectOSName(ua: string): string {
  if (!ua) return 'Unknown OS';
  if (/iPhone|iPod/i.test(ua)) return 'iOS (iPhone)';
  if (/iPad/i.test(ua)) return 'iPadOS';
  if (/Macintosh/i.test(ua)) {
    const touchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
    return touchPoints > 1 ? 'iPadOS' : 'macOS';
  }
  if (/Android ([\d.]+)/i.test(ua)) {
    return `Android ${RegExp.$1.split('.')[0]}`;
  }
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows NT 10\.0/i.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6\./i.test(ua)) return 'Windows';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/CrOS/i.test(ua)) return 'ChromeOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
}

function detectDeviceType(ua: string): BrowserDeviceType {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return 'tablet';
  if (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 1) {
    return 'tablet';
  }
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua)) {
    return 'mobile';
  }
  if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 768) {
    return 'mobile';
  }
  return 'desktop';
}

function getCanvasSignature(): string {
  try {
    if (typeof document === 'undefined') return 'nocanvas';
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'noctx';
    ctx.textBaseline = 'top';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('BirbirKHC-Security', 4, 6);
    return hashString(canvas.toDataURL());
  } catch {
    return 'canvas-blocked';
  }
}

export function getCurrentBrowserInfo(): BrowserClientInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const language = typeof navigator !== 'undefined' ? navigator.language || 'am' : 'am';
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';
  const cores = typeof navigator !== 'undefined' ? String(navigator.hardwareConcurrency || '') : '';
  const touch = typeof navigator !== 'undefined' ? String(navigator.maxTouchPoints || 0) : '0';
  const screenResolution =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : 'unknown';
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    timezone = 'UTC';
  }

  const browserId = getOrCreateBrowserId();
  const browserName = detectBrowserName(ua);
  const osName = detectOSName(ua);
  const deviceType = detectDeviceType(ua);
  const canvasSig = getCanvasSignature();

  const fpSource = [
    browserName.replace(/\s+\d+$/, ''),
    osName,
    deviceType,
    platform,
    screenResolution,
    timezone,
    language,
    cores,
    touch,
    canvasSig
  ].join('|');

  const browserFingerprint = `FP-${hashString(fpSource)}`;

  return {
    browserId,
    browserFingerprint,
    browserName,
    osName,
    deviceType,
    screenResolution,
    timezone,
    language,
    userAgent: ua
  };
}

export function findActiveBrowserBlock(
  blockedBrowsers: BlockedBrowserRule[] | undefined,
  info: BrowserClientInfo
): BlockedBrowserRule | null {
  if (!Array.isArray(blockedBrowsers) || blockedBrowsers.length === 0) return null;

  const exactIdRule = blockedBrowsers.find((r) => r && r.browserId === info.browserId);
  if (exactIdRule) {
    return exactIdRule.isBlocked ? exactIdRule : null;
  }

  const fpRule = blockedBrowsers.find(
    (r) =>
      r &&
      r.isBlocked &&
      r.matchFingerprintToo &&
      r.browserFingerprint &&
      r.browserFingerprint === info.browserFingerprint
  );
  return fpRule || null;
}
