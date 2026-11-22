import { BleClient, ConnectionPriority } from '@capacitor-community/bluetooth-le';
import { WatchFaceConfig } from '../types/watchface';
import { WATCH_SIZE } from './renderWatchFace';

export const SIFLI_SERVICE = '00000000-0000-0000-6473-5f696c666973';
export const SIFLI_CHAR = '00000000-0000-0200-6473-5f696c666973';

export type WatchEngineTemplate = 'analog_181' | 'digital_181' | 'digital_33';

const BLOCK_SIZE = 4096;
const DIGIT_W = 36;
const DIGIT_H = 52;
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

interface WatchFileSpec {
  localPath: string;
  remotePath: string;
  isBg?: boolean;
  isThumb?: boolean;
  digitValue?: string;
  handRole?: 'hour' | 'minute' | 'second';
}

const WF_CLOCK33_MANIFEST: WatchFileSpec[] = [
  { localPath: '/wf_template/wf_clock33_bg1.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_bg1.bin', isBg: true },
  { localPath: '/wf_template/wf_clock33_tn.bin', remotePath: '/ex/installer_wf/wf_clock33_tn.bin', isThumb: true },
  { localPath: '/wf_template/wf_clock33_res.so', remotePath: '/ex/installer_wf/wf_clock33_res.so' },
  { localPath: '/wf_template/wf_clock33.so', remotePath: '/ex/installer_wf/wf_clock33.so' },
  { localPath: '/wf_template/wf_clock33_time_num_01.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_01.bin', digitValue: '0' },
  { localPath: '/wf_template/wf_clock33_time_num_02.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_02.bin', digitValue: '1' },
  { localPath: '/wf_template/wf_clock33_time_num_03.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_03.bin', digitValue: '2' },
  { localPath: '/wf_template/wf_clock33_time_num_04.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_04.bin', digitValue: '3' },
  { localPath: '/wf_template/wf_clock33_time_num_05.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_05.bin', digitValue: '4' },
  { localPath: '/wf_template/wf_clock33_time_num_06.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_06.bin', digitValue: '5' },
  { localPath: '/wf_template/wf_clock33_time_num_07.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_07.bin', digitValue: '6' },
  { localPath: '/wf_template/wf_clock33_time_num_08.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_08.bin', digitValue: '7' },
  { localPath: '/wf_template/wf_clock33_time_num_09.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_09.bin', digitValue: '8' },
  { localPath: '/wf_template/wf_clock33_time_num_10.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_10.bin', digitValue: '9' },
  { localPath: '/wf_template/wf_clock33.dsc', remotePath: '/ex/installer_wf/wf_clock33.dsc' }
];

const WF_CLOCK181_MANIFEST: WatchFileSpec[] = [
  { localPath: '/wf_clock181/wf_clock181_bg.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_bg.bin', isBg: true },
  { localPath: '/wf_clock181/wf_clock181_tn.bin', remotePath: '/ex/installer_wf/wf_clock181_tn.bin', isThumb: true },
  { localPath: '/wf_clock181/wf_clock181_h.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_h.bin', handRole: 'hour' },
  { localPath: '/wf_clock181/wf_clock181_m.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_m.bin', handRole: 'minute' },
  { localPath: '/wf_clock181/wf_clock181_s.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_s.bin', handRole: 'second' },
  { localPath: '/wf_clock181/wf_clock181.so', remotePath: '/ex/installer_wf/wf_clock181.so' },
  { localPath: '/wf_clock181/wf_clock181_res.so', remotePath: '/ex/installer_wf/wf_clock181_res.so' },
  { localPath: '/wf_clock181/wf_clock181_yuan.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_yuan.bin' },
  { localPath: '/wf_clock181/wf_clock181_sun.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_sun.bin' },
  { localPath: '/wf_clock181/wf_clock181_cloudy.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_cloudy.bin' },
  { localPath: '/wf_clock181/wf_clock181_partly.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_partly.bin' },
  { localPath: '/wf_clock181/wf_clock181_rain.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_rain.bin' },
  { localPath: '/wf_clock181/wf_clock181_snow.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_snow.bin' },
  { localPath: '/wf_clock181/wf_clock181_fog.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_fog.bin' },
  { localPath: '/wf_clock181/wf_clock181_wind.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_wind.bin' },
  { localPath: '/wf_clock181/wf_clock181_sand.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_sand.bin' },
  { localPath: '/wf_clock181/wf_clock181_not.bin', remotePath: '/ex/resource/wf_clock181/wf_clock181_not.bin' },
  { localPath: '/wf_clock181/wf_clock181.dsc', remotePath: '/ex/installer_wf/wf_clock181.dsc' }
];

/**
 * SiFli SF32 hardware CRC-32/MPEG-2 (poly 0x04C11DB7, init 0xFFFFFFFF, no reflect, no xorout).
 */
function appendSifliCrc32(data: Uint8Array): Uint8Array {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data[i] << 24) >>> 0;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x80000000) !== 0 ? (((crc << 1) ^ 0x04c11db7) >>> 0) : ((crc << 1) >>> 0);
    }
  }
  crc = crc >>> 0;

  const out = new Uint8Array(data.length + 4);
  out.set(data, 0);
  out[data.length] = crc & 0xff;
  out[data.length + 1] = (crc >>> 8) & 0xff;
  out[data.length + 2] = (crc >>> 16) & 0xff;
  out[data.length + 3] = (crc >>> 24) & 0xff;
  return out;
}

export function encodeCanvasToLvglRgb565Bin(canvas: HTMLCanvasElement): Uint8Array {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo leer el canvas');

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const raw = new Uint8Array(4 + w * h * 2);

  const cf = 4; // LV_IMG_CF_TRUE_COLOR
  const headerVal = (cf & 0x1f) | ((w & 0x7ff) << 10) | ((h & 0x7ff) << 21);
  raw[0] = headerVal & 0xff;
  raw[1] = (headerVal >>> 8) & 0xff;
  raw[2] = (headerVal >>> 16) & 0xff;
  raw[3] = (headerVal >>> 24) & 0xff;

  let dst = 4;
  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    const rgb565 = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >>> 3);
    raw[dst++] = rgb565 & 0xff;
    raw[dst++] = (rgb565 >>> 8) & 0xff;
  }

  return appendSifliCrc32(raw);
}

function encodeCanvasToLvglRgb565AlphaBin(canvas: HTMLCanvasElement): Uint8Array {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo leer el canvas');

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const raw = new Uint8Array(4 + w * h * 3);

  const cf = 5; // LV_IMG_CF_TRUE_COLOR_ALPHA
  const headerVal = (cf & 0x1f) | ((w & 0x7ff) << 10) | ((h & 0x7ff) << 21);
  raw[0] = headerVal & 0xff;
  raw[1] = (headerVal >>> 8) & 0xff;
  raw[2] = (headerVal >>> 16) & 0xff;
  raw[3] = (headerVal >>> 24) & 0xff;

  let dst = 4;
  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    const a = imgData[i + 3];
    const rgb565 = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >>> 3);
    raw[dst++] = rgb565 & 0xff;
    raw[dst++] = (rgb565 >>> 8) & 0xff;
    raw[dst++] = a;
  }

  return appendSifliCrc32(raw);
}

function renderCustomDigitBin(digit: string, config: WatchFaceConfig): Uint8Array {
  const c = document.createElement('canvas');
  c.width = DIGIT_W;
  c.height = DIGIT_H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Error creando dígito');

  ctx.clearRect(0, 0, DIGIT_W, DIGIT_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 44px "${config.clockFont}", sans-serif`;

  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.strokeText(digit, DIGIT_W / 2, DIGIT_H / 2 + 2);

  if (config.clockGlow) {
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 7;
  }

  ctx.fillStyle = config.clockColor || '#ffffff';
  ctx.fillText(digit, DIGIT_W / 2, DIGIT_H / 2 + 2);

  return encodeCanvasToLvglRgb565AlphaBin(c);
}

/**
 * Tiny 2x2 fully transparent LVGL TRUE_COLOR_ALPHA image (20 bytes) used in 'digital_181'
 * to hide the analog hands so all live widgets (weather, HR, battery, steps, digital time) shine cleanly.
 */
function createTransparent2x2Bin(): Uint8Array {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 2;
  return encodeCanvasToLvglRgb565AlphaBin(c);
}

/**
 * Encodes a hand bitmap using LVGL TRUE_COLOR_CHROMA_KEYED (cf=6, 2 bytes/px, 0x07E0 = transparent)
 * so dead-centered full-height hands (cx=32/21) fit comfortably under the watch's 500 KB flash quota!
 */
function encodeCanvasToLvglChromaKeyBin(canvas: HTMLCanvasElement): Uint8Array {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo leer el canvas');

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const raw = new Uint8Array(4 + w * h * 2);

  const cf = 6; // LV_IMG_CF_TRUE_COLOR_CHROMA_KEYED (RGB565, 0x07E0 = transparent)
  const headerVal = (cf & 0x1f) | ((w & 0x7ff) << 10) | ((h & 0x7ff) << 21);
  raw[0] = headerVal & 0xff;
  raw[1] = (headerVal >>> 8) & 0xff;
  raw[2] = (headerVal >>> 16) & 0xff;
  raw[3] = (headerVal >>> 24) & 0xff;

  let dst = 4;
  for (let i = 0; i < imgData.length; i += 4) {
    const a = imgData[i + 3];
    let rgb565: number;
    if (a < 128) {
      rgb565 = 0x07e0; // LV_COLOR_CHROMA_KEY (pure green = transparent)
    } else {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      rgb565 = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >>> 3);
      if (rgb565 === 0x07e0) rgb565 = 0x07c0; // avoid accidental transparency
    }
    raw[dst++] = rgb565 & 0xff;
    raw[dst++] = (rgb565 >>> 8) & 0xff;
  }

  return appendSifliCrc32(raw);
}

/**
 * Renders a dead-centered custom analog hand (hour, minute, or second) in LVGL CHROMA_KEYED (cf=6).
 * wf_clock181.so aligns the left edge at (centerX - 32) for h/m and (centerX - 21) for s,
 * so drawing the hand centerline at cx=32 (h/m) and cx=21 (s) centers it perfectly on the watch pin!
 */
function renderCustomHandBin(
  role: 'hour' | 'minute' | 'second',
  config: WatchFaceConfig
): Uint8Array {
  const dims =
    role === 'hour'
      ? { w: 40, h: 162, cx: 32, bodyW: 6, tipY: 8, tailY: 160 }
      : role === 'minute'
        ? { w: 38, h: 206, cx: 32, bodyW: 5, tipY: 6, tailY: 204 }
        : { w: 24, h: 236, cx: 21, bodyW: 2, tipY: 10, tailY: 234 };

  const c = document.createElement('canvas');
  c.width = dims.w;
  c.height = dims.h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Error creando manecilla');

  ctx.clearRect(0, 0, dims.w, dims.h);
  const cx = dims.cx;
  const style = config.handStyle || 'sword';

  if (role === 'second') {
    ctx.strokeStyle = config.accentColor || '#38bdf8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, dims.tipY);
    ctx.lineTo(cx, dims.tailY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, dims.tipY + 6, 2.2, 0, Math.PI * 2);
    ctx.fill();
    return encodeCanvasToLvglChromaKeyBin(c);
  }

  const mainColor = config.clockColor || '#ffffff';
  const accent = config.accentColor || '#38bdf8';

  if (style === 'sword') {
    ctx.beginPath();
    ctx.moveTo(cx, dims.tipY);
    ctx.lineTo(cx + dims.bodyW, dims.h * 0.78);
    ctx.lineTo(cx, dims.tailY);
    ctx.lineTo(cx - dims.bodyW, dims.h * 0.78);
    ctx.closePath();
    ctx.fillStyle = mainColor;
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, dims.tipY + 14);
    ctx.lineTo(cx, dims.h * 0.74);
    ctx.stroke();
  } else {
    const strokeW = style === 'minimal' ? 4 : dims.bodyW * 1.5;
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, dims.tipY + 4);
    ctx.lineTo(cx, dims.tailY - 4);
    ctx.stroke();
  }

  return encodeCanvasToLvglChromaKeyBin(c);
}

function u16le(v: number): [number, number] {
  return [v & 0xff, (v >>> 8) & 0xff];
}

function u32le(v: number): [number, number, number, number] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

function toDataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export interface UploadProgress {
  stage: string;
  percent: number;
}

/**
 * Installs a complete, zero-flicker custom watchface onto the HK5 HERO over SiFli BLE.
 * Supports both:
 *  - 'analog_181': Real moving custom analog hands + weather + custom 466x466 background
 *  - 'digital_33': Real live custom digital clock digits + date + steps + custom 466x466 background
 */
export async function uploadWatchFaceBgToHk5(
  canvas: HTMLCanvasElement,
  config: WatchFaceConfig,
  engine: WatchEngineTemplate,
  onProgress: (p: UploadProgress) => void
): Promise<string> {
  if (canvas.width !== WATCH_SIZE || canvas.height !== WATCH_SIZE) {
    throw new Error(`La imagen debe ser ${WATCH_SIZE}x${WATCH_SIZE}`);
  }

  const is181 = engine === 'analog_181' || engine === 'digital_181';
  const manifest = is181 ? WF_CLOCK181_MANIFEST : WF_CLOCK33_MANIFEST;

  onProgress({
    stage:
      engine === 'analog_181'
        ? 'Generando fondo 466×466 + manecillas centradas...'
        : engine === 'digital_181'
          ? 'Generando fondo 466×466 + widgets digitales en vivo...'
          : 'Generando fondo 466×466 + dígitos en vivo...',
    percent: 2
  });

  const customBgBytes = encodeCanvasToLvglRgb565Bin(canvas);
  const transparent2x2 = createTransparent2x2Bin();

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 28;
  thumbCanvas.height = 28;
  const tctx = thumbCanvas.getContext('2d');
  if (tctx) {
    tctx.drawImage(canvas, 0, 0, 28, 28);
  }
  const customThumbBytes = encodeCanvasToLvglRgb565Bin(thumbCanvas);

  const packageFiles: Array<{ remotePath: string; bytes: Uint8Array }> = [];
  let totalBytes = 0;

  for (const spec of manifest) {
    let bytes: Uint8Array;
    if (spec.isBg) {
      bytes = customBgBytes;
    } else if (spec.isThumb) {
      bytes = customThumbBytes;
    } else if (spec.digitValue !== undefined) {
      bytes = renderCustomDigitBin(spec.digitValue, config);
    } else if (spec.handRole) {
      bytes = engine === 'digital_181' ? transparent2x2 : renderCustomHandBin(spec.handRole, config);
    } else if (engine === 'digital_181' && spec.remotePath.endsWith('yuan.bin')) {
      bytes = transparent2x2;
    } else {
      const resp = await fetch(spec.localPath);
      if (!resp.ok) {
        throw new Error(`Falta plantilla interna: ${spec.localPath}`);
      }
      bytes = new Uint8Array(await resp.arrayBuffer());
    }
    packageFiles.push({ remotePath: spec.remotePath, bytes });
    totalBytes += bytes.length;
  }

  onProgress({ stage: 'Buscando tu HK5 HERO...', percent: 5 });
  await BleClient.initialize({ androidNeverForLocation: true });

  const device = await BleClient.requestDevice({
    namePrefix: 'HK'
  });

  // Connect with GATT 133 auto-retry
  let connected = false;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        await BleClient.disconnect(device.deviceId).catch(() => {});
        await new Promise((r) => setTimeout(r, 500));
      }
      await BleClient.connect(device.deviceId);
      connected = true;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!connected) {
    throw lastErr instanceof Error ? lastErr : new Error('No se pudo conectar al HK5 HERO');
  }

  try {
    await BleClient.requestConnectionPriority(
      device.deviceId,
      ConnectionPriority.CONNECTION_PRIORITY_HIGH
    );
  } catch {
    // ignore
  }

  let maxAttPayload = 244;
  try {
    const mtu = await BleClient.getMtu(device.deviceId);
    if (mtu && mtu > 23) {
      maxAttPayload = Math.min(244, mtu - 3);
    } else {
      maxAttPayload = 20;
    }
  } catch {
    maxAttPayload = 244;
  }

  let pendingResolver: ((cmd: number, raw: Uint8Array) => void) | null = null;
  let lastRxHex = 'none';

  const waitForAck = (expectedCmd: number, timeoutMs = 10000): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        pendingResolver = null;
        reject(
          new Error(
            `Timeout ACK 0x${expectedCmd.toString(16)} (MTU=${maxAttPayload}, lastRX=${lastRxHex})`
          )
        );
      }, timeoutMs);

      pendingResolver = (cmd, raw) => {
        if (cmd === expectedCmd) {
          window.clearTimeout(timer);
          pendingResolver = null;
          if (raw.length >= 8) {
            const statusCode = raw[6] | (raw[7] << 8);
            if (statusCode !== 0) {
              reject(new Error(`Reloj devolvió código ${statusCode} en CMD 0x${cmd.toString(16)}`));
              return;
            }
          }
          resolve(raw);
        }
      };
    });
  };

  const sendFramedMessage = async (inner: Uint8Array) => {
    if (inner.length + 4 <= maxAttPayload) {
      const pkt = new Uint8Array(4 + inner.length);
      pkt[0] = 0x04;
      pkt[1] = 0x00;
      const [lo, hi] = u16le(inner.length);
      pkt[2] = lo;
      pkt[3] = hi;
      pkt.set(inner, 4);
      await BleClient.writeWithoutResponse(device.deviceId, SIFLI_SERVICE, SIFLI_CHAR, toDataView(pkt));
      return;
    }

    let pos = 0;
    const firstChunkLen = maxAttPayload - 4;
    const firstPkt = new Uint8Array(4 + firstChunkLen);
    firstPkt[0] = 0x04;
    firstPkt[1] = 0x01;
    const [tlo, thi] = u16le(inner.length);
    firstPkt[2] = tlo;
    firstPkt[3] = thi;
    firstPkt.set(inner.subarray(0, firstChunkLen), 4);
    await BleClient.writeWithoutResponse(device.deviceId, SIFLI_SERVICE, SIFLI_CHAR, toDataView(firstPkt));
    pos += firstChunkLen;
    await new Promise((r) => setTimeout(r, 10));

    const contMax = maxAttPayload - 2;
    while (pos < inner.length) {
      const remaining = inner.length - pos;
      const isLast = remaining <= contMax;
      const chunkLen = isLast ? remaining : contMax;
      const pkt = new Uint8Array(2 + chunkLen);
      pkt[0] = 0x04;
      pkt[1] = isLast ? 0x03 : 0x02;
      pkt.set(inner.subarray(pos, pos + chunkLen), 2);
      await BleClient.writeWithoutResponse(device.deviceId, SIFLI_SERVICE, SIFLI_CHAR, toDataView(pkt));
      pos += chunkLen;
      if (!isLast) {
        await new Promise((r) => setTimeout(r, 10));
      }
    }
  };

  try {
    await BleClient.startNotifications(device.deviceId, SIFLI_SERVICE, SIFLI_CHAR, (dv) => {
      const raw = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
      lastRxHex = Array.from(raw.subarray(0, 12))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      if (raw.length >= 6 && raw[0] === 0x04 && raw[1] === 0x00) {
        const cmd = raw[4] | (raw[5] << 8);
        if (pendingResolver) {
          pendingResolver(cmd, raw);
        }
      }
    });

    // 1. SESSION_START (CMD 0x0000)
    onProgress({ stage: 'Iniciando instalación en HK5 HERO...', percent: 7 });
    const sessionStart = new Uint8Array([
      0x00, 0x00, 0x07, 0x00,
      0x00, 0x00, 0x02,
      ...u32le(totalBytes)
    ]);
    const ackStart = waitForAck(0x0001);
    await sendFramedMessage(sessionStart);
    await ackStart;

    let globalSent = 0;

    for (let idx = 0; idx < packageFiles.length; idx++) {
      const { remotePath, bytes } = packageFiles[idx];
      const pathBytes = new TextEncoder().encode(remotePath);
      const fileStartPayloadLen = 4 + 2 + pathBytes.length;
      const fileStart = new Uint8Array(4 + fileStartPayloadLen);
      fileStart[0] = 0x02;
      fileStart[1] = 0x00;
      const [fplo, fphi] = u16le(fileStartPayloadLen);
      fileStart[2] = fplo;
      fileStart[3] = fphi;
      fileStart.set(u32le(bytes.length), 4);
      fileStart.set(u16le(pathBytes.length), 8);
      fileStart.set(pathBytes, 10);

      const ackFileStart = waitForAck(0x0003);
      await sendFramedMessage(fileStart);
      await ackFileStart;

      let seq = 1;
      let sent = 0;
      while (sent < bytes.length) {
        const end = Math.min(sent + BLOCK_SIZE, bytes.length);
        const slice = bytes.subarray(sent, end);
        const inner = new Uint8Array(8 + slice.length);
        inner[0] = 0x04;
        inner[1] = 0x00;
        const [dlo, dhi] = u16le(4 + slice.length);
        inner[2] = dlo;
        inner[3] = dhi;
        inner.set(u32le(seq), 4);
        inner.set(slice, 8);

        try {
          const ackData = waitForAck(0x0005, 10000);
          await sendFramedMessage(inner);
          await ackData;
        } catch (err) {
          const base = err instanceof Error ? err.message : String(err);
          throw new Error(`${base} [archivo ${idx + 1}/${packageFiles.length}, bloque ${seq}]`);
        }

        sent = end;
        globalSent += slice.length;
        seq++;

        const pct = Math.min(97, Math.round(8 + (globalSent / totalBytes) * 89));
        onProgress({
          stage: `Instalando (${idx + 1}/${packageFiles.length}) — ${Math.round(globalSent / 1024)} / ${Math.round(totalBytes / 1024)} KB`,
          percent: pct
        });
      }

      const ackFileEnd = waitForAck(0x0007);
      await sendFramedMessage(new Uint8Array([0x06, 0x00, 0x00, 0x00]));
      await ackFileEnd;
    }

    // 3. SESSION_END (CMD 0x0008)
    onProgress({ stage: 'Activando esfera en HK5 HERO...', percent: 98 });
    const ackSessionEnd = waitForAck(0x0009, 15000);
    await sendFramedMessage(new Uint8Array([0x08, 0x00, 0x00, 0x00]));
    await ackSessionEnd;

    // 4. Auto-sync exact phone time & date over Wearfit UART (0x93)
    onProgress({ stage: 'Sincronizando hora exacta...', percent: 99 });
    try {
      const d = new Date();
      const y = d.getFullYear();
      const timePkt = new Uint8Array([
        0xab, 0x00, 0x0b, 0xff, 0x93, 0x80, 0x00,
        (y >> 8) & 0xff, y & 0xff,
        d.getMonth() + 1, d.getDate(),
        d.getHours(), d.getMinutes(), d.getSeconds()
      ]);
      await BleClient.writeWithoutResponse(device.deviceId, NUS_SERVICE, NUS_TX_CHAR, toDataView(timePkt));
    } catch {
      // Non-critical
    }

    onProgress({ stage: '¡Esfera instalada y en marcha!', percent: 100 });
    return engine === 'analog_181'
      ? '¡Esfera Analógica Real instalada con manecillas en movimiento!'
      : '¡Esfera Digital Foto instalada con dígitos en vivo!';
  } finally {
    try {
      await BleClient.stopNotifications(device.deviceId, SIFLI_SERVICE, SIFLI_CHAR);
    } catch {
      // ignore
    }
    try {
      await BleClient.disconnect(device.deviceId);
    } catch {
      // ignore
    }
  }
}
