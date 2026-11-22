import { BleClient } from '@capacitor-community/bluetooth-le';

export const WEARFIT_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const WEARFIT_TX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const WEARFIT_RX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export interface MonitoredApp {
  id: string;
  label: string;
  packageName: string;
  wearfitAppId: number;
}

export const POPULAR_APPS: MonitoredApp[] = [
  { id: 'wa', label: 'WhatsApp', packageName: 'com.whatsapp', wearfitAppId: 0x20 },
  { id: 'wab', label: 'WhatsApp Business', packageName: 'com.whatsapp.w4b', wearfitAppId: 0x20 },
  { id: 'tg', label: 'Telegram', packageName: 'org.telegram.messenger', wearfitAppId: 0x16 },
  { id: 'ig', label: 'Instagram', packageName: 'com.instagram.android', wearfitAppId: 0x10 },
  { id: 'nequi', label: 'Nequi', packageName: 'com.nequi.MobileApp', wearfitAppId: 0x03 },
  { id: 'gmail', label: 'Gmail', packageName: 'com.google.android.gm', wearfitAppId: 0x03 },
  { id: 'sms', label: 'Mensajes / SMS', packageName: 'com.google.android.apps.messaging', wearfitAppId: 0x03 }
];

export function mapPackageToAppId(pkg: string): number {
  const found = POPULAR_APPS.find((a) => a.packageName === pkg);
  if (found) return found.wearfitAppId;
  if (pkg.includes('whatsapp')) return 0x20;
  if (pkg.includes('telegram')) return 0x16;
  if (pkg.includes('instagram')) return 0x10;
  if (pkg.includes('facebook') || pkg.includes('orca')) return 0x0a;
  return 0x03;
}

function toDataView(bytes: number[]): DataView {
  const arr = new Uint8Array(bytes);
  return new DataView(arr.buffer);
}

export async function writeWearfitPackets(deviceId: string, packets: number[][]): Promise<void> {
  for (let i = 0; i < packets.length; i++) {
    const dv = toDataView(packets[i]);
    try {
      await BleClient.writeWithoutResponse(deviceId, WEARFIT_SERVICE, WEARFIT_TX_CHAR, dv);
    } catch {
      await BleClient.write(deviceId, WEARFIT_SERVICE, WEARFIT_TX_CHAR, dv);
    }
    if (packets.length > 1) {
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}

/**
 * Multi-packet Wearfit notification builder (exact match to btsnoop #5725..#5742):
 * Packet 0: AB 00 <len> FF 72 80 <appId> 02 <first 12 UTF-8 bytes>
 * Packet 1+: <00, 01, 02...> <next 19 UTF-8 bytes>
 */
export function buildNotificationPackets(appId: number, fullText: string): number[][] {
  const encoder = new TextEncoder();
  const msgBytes = Array.from(encoder.encode(fullText.trim())).slice(0, 90);
  const totalLen = 5 + msgBytes.length; // FF 72 80 appId 02 + msgBytes

  const packets: number[][] = [];
  const firstSlice = msgBytes.slice(0, 12);
  packets.push([0xab, 0x00, totalLen, 0xff, 0x72, 0x80, appId & 0xff, 0x02, ...firstSlice]);

  let pos = 12;
  let seq = 0;
  while (pos < msgBytes.length) {
    const slice = msgBytes.slice(pos, pos + 19);
    packets.push([seq & 0xff, ...slice]);
    pos += 19;
    seq++;
  }
  return packets;
}

export function buildFindWatchPacket(): number[] {
  return [0xab, 0x00, 0x03, 0xff, 0x71, 0x80];
}

export function buildTimeSyncPacket(d = new Date()): number[] {
  const y = d.getFullYear();
  return [
    0xab, 0x00, 0x0b, 0xff, 0x93, 0x80, 0x00,
    (y >> 8) & 0xff, y & 0xff,
    d.getMonth() + 1, d.getDate(),
    d.getHours(), d.getMinutes(), d.getSeconds()
  ];
}

export function buildRaiseToWakePacket(enabled: boolean): number[] {
  // Captured #926: ab0004ff788001
  return [0xab, 0x00, 0x04, 0xff, 0x78, 0x80, enabled ? 0x01 : 0x00];
}

export function buildTimeFormatPacket(use12Hour: boolean): number[] {
  // Captured #924: ab0004ff7c8000 (00=24h, 01=12h)
  return [0xab, 0x00, 0x04, 0xff, 0x7c, 0x80, use12Hour ? 0x01 : 0x00];
}

export function buildDndPacket(
  enabled: boolean,
  startH = 22,
  startM = 0,
  endH = 7,
  endM = 0
): number[] {
  return [0xab, 0x00, 0x08, 0xff, 0x76, 0x80, enabled ? 0x01 : 0x00, startH, startM, endH, endM];
}

export function buildAlarmPacket(
  id: number,
  enabled: boolean,
  hour: number,
  minute: number,
  repeatMask = 0x7f
): number[] {
  return [0xab, 0x00, 0x08, 0xff, 0x73, 0x80, id & 0xff, enabled ? 0x01 : 0x00, hour, minute, repeatMask];
}

export function buildHealthSyncPacket(d = new Date()): number[] {
  // Captured #1014: ab000eff518000 <YY-2000> <MM> <DD> 00 00 00 00 00 00 00
  return [
    0xab, 0x00, 0x0e, 0xff, 0x51, 0x80, 0x00,
    d.getFullYear() - 2000, d.getMonth() + 1, d.getDate(),
    0, 0, 0, 0, 0, 0, 0
  ];
}

function wmoCodeToWearfitWeather(wmo: number): number {
  if (wmo === 0) return 0x00; // Sunny
  if (wmo <= 3) return 0x10; // Partly cloudy / cloudy (seen in #1242: 0x10)
  if (wmo >= 45 && wmo <= 48) return 0x20; // Fog
  if (wmo >= 51 && wmo <= 67) return 0x30; // Rain
  if (wmo >= 71 && wmo <= 77) return 0x40; // Snow
  if (wmo >= 80) return 0x30; // Showers / Storm
  return 0x10;
}

export interface LiveWeatherResult {
  city: string;
  tempC: number;
  maxC: number;
  minC: number;
  packets: number[][];
}

/**
 * Fetches live weather for any city via Open-Meteo (free, no API key) and encodes
 * the exact Wearfit weather packets captured from HK5 HERO (#1181, #1242, #1262).
 */
export async function fetchLiveWeatherForHk5(cityQuery: string): Promise<LiveWeatherResult> {
  const geoResp = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=es&format=json`
  );
  if (!geoResp.ok) throw new Error('No se pudo buscar la ciudad');
  const geoData = (await geoResp.json()) as {
    results?: Array<{ name: string; latitude: number; longitude: number }>;
  };
  const place = geoData.results?.[0];
  if (!place) throw new Error(`Ciudad no encontrada: ${cityQuery}`);

  const wResp = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
  );
  if (!wResp.ok) throw new Error('No se pudo obtener el clima');
  const wData = (await wResp.json()) as {
    current: { temperature_2m: number; weather_code: number };
    daily: {
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
    };
  };

  const curTemp = Math.round(wData.current.temperature_2m);
  const curCode = wmoCodeToWearfitWeather(wData.current.weather_code);
  const maxArr = wData.daily.temperature_2m_max;
  const minArr = wData.daily.temperature_2m_min;
  const codeArr = wData.daily.weather_code;

  // Packet 1 (#1181): City name -> ea 00 <len> ff 7e 01 <cityLen> <utf8>
  const cityBytes = Array.from(new TextEncoder().encode(place.name)).slice(0, 12);
  const cityPkt = [0xea, 0x00, 4 + cityBytes.length, 0xff, 0x7e, 0x01, cityBytes.length, ...cityBytes];

  // Packet 2 (#1242): Current + 6 days weather code & temp -> ab 00 11 ff 7e 80 <7 pairs>
  const tempPairs: number[] = [curCode, curTemp & 0xff];
  for (let i = 1; i < 7; i++) {
    const code = wmoCodeToWearfitWeather(codeArr[i] ?? wData.current.weather_code);
    const t = Math.round(((maxArr[i] ?? curTemp) + (minArr[i] ?? curTemp)) / 2);
    tempPairs.push(code, t & 0xff);
  }
  const weatherPkt = [0xab, 0x00, 0x11, 0xff, 0x7e, 0x80, ...tempPairs];

  // Packet 3 (#1262): 7-day max/min -> ab 00 11 ff 88 80 <7 pairs>
  const rangePairs: number[] = [];
  for (let i = 0; i < 7; i++) {
    rangePairs.push(Math.round(maxArr[i] ?? curTemp) & 0xff, Math.round(minArr[i] ?? curTemp) & 0xff);
  }
  const rangePkt = [0xab, 0x00, 0x11, 0xff, 0x88, 0x80, ...rangePairs];

  return {
    city: place.name,
    tempC: curTemp,
    maxC: Math.round(maxArr[0] ?? curTemp),
    minC: Math.round(minArr[0] ?? curTemp),
    packets: [cityPkt, weatherPkt, rangePkt]
  };
}

export interface ParsedWatchTelemetry {
  battery?: number;
  heartRate?: number;
  steps?: number;
}

export function parseWearfitRx(raw: Uint8Array): ParsedWatchTelemetry {
  const out: ParsedWatchTelemetry = {};
  if (raw.length >= 8 && raw[0] === 0xab && raw[3] === 0xff && raw[4] === 0x91) {
    // Captured #912: ab 00 05 ff 91 80 00 64 (0x64 = 100%)
    const pct = raw[7];
    if (pct >= 0 && pct <= 100) out.battery = pct;
  } else if (raw.length >= 13 && raw[0] === 0xab && raw[3] === 0xff && raw[4] === 0x51 && raw[5] === 0x11) {
    // Captured #1028: ab 00 0a ff 51 11 <YY> <MM> <DD> <HH> 00 <bpm> <bpm>
    const bpm = raw[11];
    if (bpm >= 40 && bpm <= 210) out.heartRate = bpm;
  }
  return out;
}
