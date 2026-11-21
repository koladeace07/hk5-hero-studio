import { BleClient, ConnectionPriority } from '@capacitor-community/bluetooth-le';
import { WatchFaceConfig } from '../types/watchface';
import { WATCH_SIZE } from './renderWatchFace';

export const SIFLI_SERVICE = '00000000-0000-0000-6473-5f696c666973';
export const SIFLI_CHAR = '00000000-0000-0200-6473-5f696c666973';

const BLOCK_SIZE = 4096;
const DIGIT_W = 36;
const DIGIT_H = 52;
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

interface WatchFileSpec {
  localName: string;
  remotePath: string;
  isBgSlot?: 1;
  isThumb?: boolean;
  digitValue?: string; // '0'..'9'
}

// Digit mapping confirmed from wf_clock33_time_num_01..10.bin sizes (02='1' smallest, 09='8' largest)
const WF_CLOCK33_MANIFEST: WatchFileSpec[] = [
  { localName: 'wf_clock33_bg1.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_bg1.bin', isBgSlot: 1 },
  { localName: 'wf_clock33_tn.bin', remotePath: '/ex/installer_wf/wf_clock33_tn.bin', isThumb: true },
  { localName: 'wf_clock33_res.so', remotePath: '/ex/installer_wf/wf_clock33_res.so' },
  { localName: 'wf_clock33.so', remotePath: '/ex/installer_wf/wf_clock33.so' },
  { localName: 'wf_clock33_time_num_01.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_01.bin', digitValue: '0' },
  { localName: 'wf_clock33_time_num_02.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_02.bin', digitValue: '1' },
  { localName: 'wf_clock33_time_num_03.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_03.bin', digitValue: '2' },
  { localName: 'wf_clock33_time_num_04.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_04.bin', digitValue: '3' },
  { localName: 'wf_clock33_time_num_05.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_05.bin', digitValue: '4' },
  { localName: 'wf_clock33_time_num_06.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_06.bin', digitValue: '5' },
  { localName: 'wf_clock33_time_num_07.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_07.bin', digitValue: '6' },
  { localName: 'wf_clock33_time_num_08.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_08.bin', digitValue: '7' },
  { localName: 'wf_clock33_time_num_09.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_09.bin', digitValue: '8' },
  { localName: 'wf_clock33_time_num_10.bin', remotePath: '/ex/resource/wf_clock33/wf_clock33_time_num_10.bin', digitValue: '9' },
  { localName: 'wf_clock33.dsc', remotePath: '/ex/installer_wf/wf_clock33.dsc' }
];

/**
 * SiFli SF32 hardware CRC-32/MPEG-2 (poly 0x04C11DB7, init 0xFFFFFFFF, no reflect, no xorout).
 * Every file sent over SiFli BLE OTA must end with this 4-byte little-endian CRC32 footer.
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

/**
 * Encodes an HTMLCanvasElement into an LVGL v7/v8 RGB565 binary image (.bin)
 * with the required 4-byte SiFli CRC-32/MPEG-2 footer.
 */
export function encodeCanvasToLvglRgb565Bin(canvas: HTMLCanvasElement): Uint8Array {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo leer el canvas');

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const raw = new Uint8Array(4 + w * h * 2);

  const cf = 4; // LV_IMG_CF_TRUE_COLOR (RGB565)
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

/**
 * Encodes a transparent HTMLCanvasElement into LVGL TRUE_COLOR_ALPHA (cf=5: RGB565 + Alpha byte)
 * so the watch's real ticking digits render cleanly over any custom background photo.
 */
function encodeCanvasToLvglRgb565AlphaBin(canvas: HTMLCanvasElement): Uint8Array {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo leer el canvas de dígito');

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const raw = new Uint8Array(4 + w * h * 3);

  const cf = 5; // LV_IMG_CF_TRUE_COLOR_ALPHA (RGB565 + 8-bit alpha)
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

/**
 * Renders one live watch digit ('0'..'9') at 46x67 with transparent background using
 * the user's chosen clockFont, clockColor, and subtle outline/glow for readability.
 */
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

  // Subtle dark outline so digits stay sharp over bright photos
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
 * Installs a complete, zero-flicker custom watchface onto the HK5 HERO over SiFli BLE:
 * - Clean 466x466 custom background (no frozen hands)
 * - Custom 144x144 selector thumbnail
 * - All 10 live ticking digits ('0'..'9') rendered in the user's chosen font & color!
 */
export async function uploadWatchFaceBgToHk5(
  canvas: HTMLCanvasElement,
  config: WatchFaceConfig,
  onProgress: (p: UploadProgress) => void
): Promise<string> {
  if (canvas.width !== WATCH_SIZE || canvas.height !== WATCH_SIZE) {
    throw new Error(`La imagen debe ser ${WATCH_SIZE}x${WATCH_SIZE}`);
  }

  onProgress({ stage: 'Generando fondo, miniatura y dígitos en vivo...', percent: 2 });
  const customBgBytes = encodeCanvasToLvglRgb565Bin(canvas);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 48;
  thumbCanvas.height = 48;
  const tctx = thumbCanvas.getContext('2d');
  if (tctx) {
    tctx.drawImage(canvas, 0, 0, 48, 48);
  }
  const customThumbBytes = encodeCanvasToLvglRgb565Bin(thumbCanvas);

  const packageFiles: Array<{ remotePath: string; bytes: Uint8Array }> = [];
  let totalBytes = 0;

  for (const spec of WF_CLOCK33_MANIFEST) {
    let bytes: Uint8Array;
    if (spec.isBgSlot) {
      bytes = customBgBytes;
    } else if (spec.isThumb) {
      bytes = customThumbBytes;
    } else if (spec.digitValue !== undefined) {
      bytes = renderCustomDigitBin(spec.digitValue, config);
    } else {
      const resp = await fetch(`/wf_template/${spec.localName}`);
      if (!resp.ok) {
        throw new Error(`Falta plantilla interna: ${spec.localName}`);
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

    // 2. Stream all 15 files (clean background + thumbnail + 10 live custom digits + .so/.dsc)
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
      // Non-critical if UART is busy
    }

    onProgress({ stage: '¡Esfera instalada y hora sincronizada!', percent: 100 });
    return '¡Listo! Esfera instalada con hora real sincronizada en tu HK5 HERO.';
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
