import { WatchFaceConfig } from '../types/watchface';

export const WATCH_SIZE = 466;
const CENTER = WATCH_SIZE / 2;

export interface RenderOptions {
  /** True when exporting the clean 466x466 background to upload to the watch */
  backgroundOnly?: boolean;
  /** Clip output to a transparent circle */
  circularMask?: boolean;
  /** Optional preloaded HTMLImageElement for synchronous rendering */
  loadedImage?: HTMLImageElement | null;
  /** Reference date/time to render */
  now?: Date;
}

/**
 * 100% WYSIWYG Watchface Renderer for HK5 HERO:
 * - Background, photo, texture, dial markings, and customText are baked into bg.bin (appear 100% identically on the watch).
 * - Clock overlay matches the EXACT real coordinates of the selected watch engine:
 *    - 'analog_181': real moving custom hands in the center!
 *    - 'digital_33': real live custom digits at the top + real date top-right + real steps bottom!
 */
export function renderWatchFace(
  ctx: CanvasRenderingContext2D,
  config: WatchFaceConfig,
  options: RenderOptions = {}
): void {
  const {
    backgroundOnly = false,
    circularMask = false,
    loadedImage = null,
    now = new Date()
  } = options;

  ctx.save();
  ctx.clearRect(0, 0, WATCH_SIZE, WATCH_SIZE);

  if (circularMask) {
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, CENTER, 0, Math.PI * 2);
    ctx.clip();
  }

  // 1. Background
  drawBackground(ctx, config, loadedImage);

  // 2. Pattern overlay
  drawPattern(ctx, config);

  // 3. Vignette
  if (config.vignette > 0) {
    const vig = ctx.createRadialGradient(
      CENTER,
      CENTER,
      WATCH_SIZE * 0.24,
      CENTER,
      CENTER,
      WATCH_SIZE * 0.52
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, config.vignette)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, WATCH_SIZE, WATCH_SIZE);
  }

  // 4. Inner dial / tick marks
  drawDialMarkings(ctx, config);

  // 5. Custom signature text (100% baked into watch background — appears identically on HK5 HERO!)
  if (config.customText.trim()) {
    ctx.save();
    const pos = config.customTextPosition || 'bottom';
    const size = config.customTextSize || 22;
    const color = config.customTextColor || '#ffffff';
    const yPos = pos === 'top' ? 124 : pos === 'center' ? CENTER : 356;

    ctx.font = `700 ${size}px "${config.clockFont}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle outline for readability over photos
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.strokeText(config.customText.trim().toUpperCase(), CENTER, yPos);

    if (config.clockGlow) {
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = color;
    ctx.fillText(config.customText.trim().toUpperCase(), CENTER, yPos);
    ctx.restore();
  }

  // 6. Live engine preview overlay (exact match to what the HK5 HERO renders on top!)
  if (!backgroundOnly) {
    const engine = config.engine || (config.clockMode === 'analog' ? 'analog_181' : 'digital_33');
    if (engine === 'analog_181') {
      drawClock181WidgetsOverlay(ctx, now);
      drawAnalogClock(ctx, config, now);
    } else if (engine === 'digital_181') {
      drawClock181WidgetsOverlay(ctx, now);
    } else {
      drawDigital33Overlay(ctx, config, now);
    }
  }

  ctx.restore();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  config: WatchFaceConfig,
  loadedImage: HTMLImageElement | null
) {
  if (config.bgType === 'solid') {
    ctx.fillStyle = config.bgColor1;
    ctx.fillRect(0, 0, WATCH_SIZE, WATCH_SIZE);
  } else if (config.bgType === 'gradient') {
    const rad = ((config.bgAngle - 90) * Math.PI) / 180;
    const x1 = CENTER - Math.cos(rad) * CENTER;
    const y1 = CENTER - Math.sin(rad) * CENTER;
    const x2 = CENTER + Math.cos(rad) * CENTER;
    const y2 = CENTER + Math.sin(rad) * CENTER;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, config.bgColor1);
    grad.addColorStop(1, config.bgColor2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WATCH_SIZE, WATCH_SIZE);
  } else if (config.bgType === 'radial') {
    const grad = ctx.createRadialGradient(CENTER, CENTER * 0.85, 16, CENTER, CENTER, CENTER * 1.08);
    grad.addColorStop(0, config.bgColor1);
    grad.addColorStop(1, config.bgColor2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WATCH_SIZE, WATCH_SIZE);
  } else if (config.bgType === 'image') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, WATCH_SIZE, WATCH_SIZE);
    if (loadedImage && loadedImage.width > 0) {
      ctx.save();
      ctx.filter = `brightness(${config.imageBrightness})`;
      const baseScale = Math.max(WATCH_SIZE / loadedImage.width, WATCH_SIZE / loadedImage.height);
      const drawW = loadedImage.width * baseScale * config.imageScale;
      const drawH = loadedImage.height * baseScale * config.imageScale;
      const drawX = CENTER - drawW / 2 + config.imageOffsetX;
      const drawY = CENTER - drawH / 2 + config.imageOffsetY;
      ctx.drawImage(loadedImage, drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  }
}

function drawPattern(ctx: CanvasRenderingContext2D, config: WatchFaceConfig) {
  if (config.pattern === 'none') return;

  ctx.save();
  if (config.pattern === 'grid') {
    ctx.strokeStyle = config.accentColor;
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 1;
    const step = 28;
    for (let x = 0; x <= WATCH_SIZE; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WATCH_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= WATCH_SIZE; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WATCH_SIZE, y);
      ctx.stroke();
    }
  } else if (config.pattern === 'carbon') {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.05;
    const step = 14;
    for (let y = 0; y < WATCH_SIZE; y += step) {
      for (let x = 0; x < WATCH_SIZE; x += step) {
        if ((x / step + y / step) % 2 === 0) {
          ctx.fillRect(x, y, step / 2, step / 2);
        }
      }
    }
  } else if (config.pattern === 'stars') {
    ctx.fillStyle = '#ffffff';
    for (let i = 1; i <= 55; i++) {
      const x = (i * 7919) % WATCH_SIZE;
      const y = (i * 4421) % WATCH_SIZE;
      const r = i % 3 === 0 ? 2.1 : 1.1;
      ctx.globalAlpha = 0.25 + ((i * 17) % 55) / 100;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (config.pattern === 'radar') {
    ctx.strokeStyle = config.accentColor;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 1.2;
    [70, 125, 180].forEach((r) => {
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(CENTER, 24);
    ctx.lineTo(CENTER, WATCH_SIZE - 24);
    ctx.moveTo(24, CENTER);
    ctx.lineTo(WATCH_SIZE - 24, CENTER);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDialMarkings(ctx: CanvasRenderingContext2D, config: WatchFaceConfig) {
  if (config.dialStyle === 'none') return;

  ctx.save();
  if (config.dialStyle === 'neon') {
    ctx.strokeStyle = config.accentColor;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, CENTER - 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = config.secondaryColor;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, CENTER - 24, 0, Math.PI * 2);
    ctx.stroke();
  }

  const totalTicks = config.dialStyle === 'minimal' ? 12 : 60;
  for (let i = 0; i < totalTicks; i++) {
    const angle = (i * (360 / totalTicks) - 90) * (Math.PI / 180);
    const isMajor = config.dialStyle === 'minimal' || i % 5 === 0;
    const isQuarter = config.dialStyle === 'minimal' ? i % 3 === 0 : i % 15 === 0;

    const outerR = CENTER - 16;
    const innerR = isQuarter ? outerR - 18 : isMajor ? outerR - 13 : outerR - 6;

    ctx.beginPath();
    ctx.moveTo(CENTER + Math.cos(angle) * innerR, CENTER + Math.sin(angle) * innerR);
    ctx.lineTo(CENTER + Math.cos(angle) * outerR, CENTER + Math.sin(angle) * outerR);
    ctx.strokeStyle = isQuarter ? config.accentColor : isMajor ? '#e2e8f0' : 'rgba(148,163,184,0.45)';
    ctx.lineWidth = isQuarter ? 4 : isMajor ? 2.5 : 1.3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  if (config.dialStyle === 'chrono') {
    ctx.fillStyle = config.secondaryColor;
    ctx.font = '700 15px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = [
      { text: '60', deg: -90 },
      { text: '15', deg: 0 },
      { text: '30', deg: 90 },
      { text: '45', deg: 180 }
    ];
    labels.forEach(({ text, deg }) => {
      const rad = (deg * Math.PI) / 180;
      const r = CENTER - 46;
      ctx.fillText(text, CENTER + Math.cos(rad) * r, CENTER + Math.sin(rad) * r);
    });
  }

  ctx.restore();
}

/**
 * Exact WYSIWYG overlay of wf_clock181's real live widgets (weather, HR, battery, steps, calories, digital time, date).
 */
function drawClock181WidgetsOverlay(ctx: CanvasRenderingContext2D, now: Date) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const mon = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  ctx.font = '700 18px "Inter", sans-serif';
  ctx.fillText('28°C', CENTER + 14, 96);

  ctx.font = '600 15px "Inter", sans-serif';
  ctx.fillText('07h30m', 150, 154);
  ctx.fillText('1.2km', 316, 154);

  ctx.fillText('HR', 96, 232);
  ctx.fillText('076', 84, 266);

  ctx.fillText(now.getHours() >= 12 ? 'PM' : 'AM', 346, 232);
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillText(`${hh}:${mm}`, 320, 266);

  ctx.font = '600 15px "Inter", sans-serif';
  ctx.fillText(`${mon}-${day}`, 346, 304);

  ctx.font = '700 17px "Inter", sans-serif';
  ctx.fillText('85%', CENTER, 326);

  ctx.font = '600 15px "Inter", sans-serif';
  ctx.fillText('04210', 184, 396);
  ctx.fillText('0185', 284, 396);

  ctx.restore();
}

/**
 * Exact WYSIWYG preview of wf_clock33 (Digital Arriba):
 * - 4 live digits at the top (HH  MM) in user's font & color
 * - Real date top-right (SUN 22)
 * - Real steps bottom (00127)
 */
function drawDigital33Overlay(ctx: CanvasRenderingContext2D, config: WatchFaceConfig, now: Date) {
  ctx.save();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  ctx.font = `800 44px "${config.clockFont}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';

  const y = 78;
  const positions = [
    { ch: hh[0], x: 146 },
    { ch: hh[1], x: 184 },
    { ch: mm[0], x: 266 },
    { ch: mm[1], x: 304 }
  ];

  positions.forEach(({ ch, x }) => {
    ctx.strokeText(ch, x, y);
    if (config.clockGlow) {
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 7;
    }
    ctx.fillStyle = config.clockColor || '#ffffff';
    ctx.fillText(ch, x, y);
    ctx.shadowBlur = 0;
  });

  // Real date label (top-right, exactly like wf_clock33)
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  ctx.font = '600 18px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillText(`${days[now.getDay()]} ${String(now.getDate()).padStart(2, '0')}`, 346, 140);

  // Real steps label (bottom, exactly like wf_clock33)
  ctx.font = '600 18px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillText('00241', CENTER, 412);

  ctx.restore();
}

function drawSwordHand(
  ctx: CanvasRenderingContext2D,
  angle: number,
  length: number,
  width: number,
  color: string,
  accent: string
) {
  ctx.save();
  ctx.translate(CENTER, CENTER);
  ctx.rotate(angle + Math.PI / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(-width, 0);
  ctx.lineTo(0, -length);
  ctx.lineTo(width, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, -length + 18);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, width * 0.35);
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();
}

function drawAnalogClock(ctx: CanvasRenderingContext2D, config: WatchFaceConfig, now: Date) {
  ctx.save();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle = ((hours + minutes / 60) * 30 - 90) * (Math.PI / 180);
  const minuteAngle = ((minutes + seconds / 60) * 6 - 90) * (Math.PI / 180);
  const secondAngle = (seconds * 6 - 90) * (Math.PI / 180);

  const style = config.handStyle || 'sword';

  if (style === 'sword') {
    drawSwordHand(ctx, hourAngle, 120, 9, config.clockColor, config.accentColor);
    drawSwordHand(ctx, minuteAngle, 165, 7, config.clockColor, config.accentColor);
  } else {
    const isMinimal = style === 'minimal';
    const isNeon = style === 'neon';

    ctx.save();
    ctx.shadowColor = isNeon ? config.accentColor : 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = isNeon ? 18 : 10;
    ctx.strokeStyle = config.clockColor;
    ctx.lineWidth = isMinimal ? 5 : isNeon ? 8 : 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CENTER - Math.cos(hourAngle) * 18, CENTER - Math.sin(hourAngle) * 18);
    ctx.lineTo(CENTER + Math.cos(hourAngle) * 120, CENTER + Math.sin(hourAngle) * 120);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = isNeon ? config.accentColor : 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = isNeon ? 18 : 10;
    ctx.strokeStyle = config.clockColor;
    ctx.lineWidth = isMinimal ? 3.5 : isNeon ? 5.5 : 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CENTER - Math.cos(minuteAngle) * 22, CENTER - Math.sin(minuteAngle) * 22);
    ctx.lineTo(CENTER + Math.cos(minuteAngle) * 165, CENTER + Math.sin(minuteAngle) * 165);
    ctx.stroke();
    ctx.restore();
  }

  // Second hand
  ctx.save();
  if (config.clockGlow || style === 'neon') {
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 12;
  }
  ctx.strokeStyle = config.accentColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(CENTER - Math.cos(secondAngle) * 32, CENTER - Math.sin(secondAngle) * 32);
  ctx.lineTo(CENTER + Math.cos(secondAngle) * 182, CENTER + Math.sin(secondAngle) * 182);
  ctx.stroke();
  ctx.restore();

  // Center pin
  ctx.fillStyle = config.accentColor;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
