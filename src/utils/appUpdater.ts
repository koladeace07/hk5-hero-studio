export const APP_VERSION = '1.5.0';
export const GITHUB_REPO = 'koladeace07/hk5-hero-studio';
export const LATEST_APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/hk5-hero-studio.apk`;

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  notes: string;
}

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' }
  });

  if (!resp.ok) {
    throw new Error(`No se pudo consultar actualizaciones (HTTP ${resp.status})`);
  }

  const data = (await resp.json()) as {
    tag_name?: string;
    body?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  };

  const latestVersion = (data.tag_name || APP_VERSION).replace(/^v/i, '');
  const apkAsset = data.assets?.find((a) => a.name?.toLowerCase().endsWith('.apk'));
  const downloadUrl = apkAsset?.browser_download_url || LATEST_APK_URL;

  return {
    hasUpdate: compareSemver(latestVersion, APP_VERSION) > 0,
    currentVersion: APP_VERSION,
    latestVersion,
    downloadUrl,
    notes: data.body || 'Mejoras de rendimiento y compatibilidad para HK5 HERO.'
  };
}
