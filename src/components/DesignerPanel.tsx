import React, { useState } from 'react';
import { Layers, Image as ImageIcon, Clock, Sliders, Upload, Trash2, Shuffle } from 'lucide-react';
import {
  BackgroundType,
  ClockFont,
  ClockPosition,
  DialStyle,
  HandStyle,
  PatternType,
  WatchEngine,
  WatchFaceConfig
} from '../types/watchface';
import { HK5_PRESETS } from '../data/presets';

interface DesignerPanelProps {
  config: WatchFaceConfig;
  onChange: (next: WatchFaceConfig) => void;
}

type EditorTab = 'presets' | 'background' | 'clock' | 'details';

const ACCENT_SWATCHES = [
  '#38bdf8',
  '#3b82f6',
  '#00f5d4',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#f43f5e',
  '#a855f7',
  '#ffffff'
];

export const DesignerPanel: React.FC<DesignerPanelProps> = ({ config, onChange }) => {
  const [tab, setTab] = useState<EditorTab>('presets');

  const update = <K extends keyof WatchFaceConfig>(key: K, value: WatchFaceConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const setEngine = (engine: WatchEngine) => {
    onChange({
      ...config,
      engine,
      clockMode: engine === 'analog_181' ? 'analog' : 'digital'
    });
  };

  const handleRandomize = () => {
    const bgPalettes: Array<[string, string]> = [
      ['#0c1f3f', '#04070e'],
      ['#1e1038', '#05020a'],
      ['#062c22', '#020806'],
      ['#3b0a18', '#090305'],
      ['#1f2937', '#030712'],
      ['#172554', '#020617']
    ];
    const patterns: PatternType[] = ['none', 'radar', 'carbon', 'grid', 'stars'];
    const dials: DialStyle[] = ['minimal', 'chrono', 'neon'];
    const hands: HandStyle[] = ['classic', 'sword', 'neon', 'minimal'];
    const fonts: ClockFont[] = ['Orbitron', 'Inter', 'JetBrains Mono', 'Playfair Display'];
    const engines: WatchEngine[] = ['analog_181', 'digital_33'];

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const [c1, c2] = pick(bgPalettes);
    const accent = pick(ACCENT_SWATCHES);
    const engine = pick(engines);

    onChange({
      ...config,
      name: `HK5 Mix ${Math.floor(100 + Math.random() * 900)}`,
      engine,
      clockMode: engine === 'analog_181' ? 'analog' : 'digital',
      bgType: 'radial',
      bgColor1: c1,
      bgColor2: c2,
      pattern: pick(patterns),
      dialStyle: pick(dials),
      accentColor: accent,
      clockFont: pick(fonts),
      handStyle: pick(hands),
      clockGlow: Math.random() > 0.3
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange({
          ...config,
          bgType: 'image',
          imageDataUrl: reader.result,
          imageScale: 1,
          imageOffsetX: 0,
          imageOffsetY: 0
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const activeEngine: WatchEngine =
    config.engine || (config.clockMode === 'analog' ? 'analog_181' : 'digital_33');

  return (
    <div className="editor-card">
      <div className="editor-tabs" role="tablist">
        <button
          type="button"
          className={`editor-tab ${tab === 'presets' ? 'active' : ''}`}
          onClick={() => setTab('presets')}
        >
          <Layers size={16} />
          <span>Plantillas</span>
        </button>
        <button
          type="button"
          className={`editor-tab ${tab === 'background' ? 'active' : ''}`}
          onClick={() => setTab('background')}
        >
          <ImageIcon size={16} />
          <span>Fondo</span>
        </button>
        <button
          type="button"
          className={`editor-tab ${tab === 'clock' ? 'active' : ''}`}
          onClick={() => setTab('clock')}
        >
          <Clock size={16} />
          <span>Reloj</span>
        </button>
        <button
          type="button"
          className={`editor-tab ${tab === 'details' ? 'active' : ''}`}
          onClick={() => setTab('details')}
        >
          <Sliders size={16} />
          <span>Texto</span>
        </button>
      </div>

      <div className="editor-body">
        {tab === 'presets' && (
          <div className="stack-md">
            <div className="field">
              <label htmlFor="design-name">Nombre de tu esfera</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="design-name"
                  type="text"
                  value={config.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Mi esfera HK5"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRandomize}
                  title="Generar diseño aleatorio"
                >
                  <Shuffle size={15} />
                  <span>Aleatorio</span>
                </button>
              </div>
            </div>

            <div className="preset-grid">
              {HK5_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className={`preset-tile ${config.name === preset.name ? 'selected' : ''}`}
                  onClick={() => onChange({ ...preset })}
                >
                  <span
                    className="preset-swatch"
                    style={{
                      background:
                        preset.bgType === 'solid'
                          ? preset.bgColor1
                          : `radial-gradient(circle, ${preset.bgColor1}, ${preset.bgColor2})`,
                      borderColor: preset.accentColor
                    }}
                  />
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-sub">
                    {preset.engine === 'analog_181' ? 'Analógica Real' : 'Digital Arriba'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'background' && (
          <div className="stack-md">
            <div className="field">
              <label>Tipo de fondo</label>
              <div className="segmented">
                {(
                  [
                    ['radial', 'Radial'],
                    ['gradient', 'Degradado'],
                    ['solid', 'Sólido'],
                    ['image', 'Foto']
                  ] as Array<[BackgroundType, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={config.bgType === value ? 'active' : ''}
                    onClick={() => update('bgType', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {config.bgType === 'image' ? (
              <div className="stack-sm">
                <label className="upload-box">
                  <Upload size={18} />
                  <span>{config.imageDataUrl ? 'Cambiar foto de galería' : 'Subir foto (JPG / PNG)'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                </label>

                {config.imageDataUrl && (
                  <>
                    <div className="slider-row">
                      <span>Zoom ({Math.round(config.imageScale * 100)}%)</span>
                      <input
                        type="range"
                        min={0.6}
                        max={2.4}
                        step={0.05}
                        value={config.imageScale}
                        onChange={(e) => update('imageScale', Number(e.target.value))}
                      />
                    </div>
                    <div className="slider-row">
                      <span>Posición X ({config.imageOffsetX}px)</span>
                      <input
                        type="range"
                        min={-160}
                        max={160}
                        step={2}
                        value={config.imageOffsetX}
                        onChange={(e) => update('imageOffsetX', Number(e.target.value))}
                      />
                    </div>
                    <div className="slider-row">
                      <span>Posición Y ({config.imageOffsetY}px)</span>
                      <input
                        type="range"
                        min={-160}
                        max={160}
                        step={2}
                        value={config.imageOffsetY}
                        onChange={(e) => update('imageOffsetY', Number(e.target.value))}
                      />
                    </div>
                    <div className="slider-row">
                      <span>Brillo ({Math.round(config.imageBrightness * 100)}%)</span>
                      <input
                        type="range"
                        min={0.3}
                        max={1.5}
                        step={0.05}
                        value={config.imageBrightness}
                        onChange={(e) => update('imageBrightness', Number(e.target.value))}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger-ghost"
                      onClick={() => onChange({ ...config, imageDataUrl: null, bgType: 'radial' })}
                    >
                      <Trash2 size={15} />
                      <span>Quitar foto</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="color-pair">
                <div className="field">
                  <label>Color 1</label>
                  <input
                    type="color"
                    value={config.bgColor1}
                    onChange={(e) => update('bgColor1', e.target.value)}
                  />
                </div>
                {config.bgType !== 'solid' && (
                  <div className="field">
                    <label>Color 2</label>
                    <input
                      type="color"
                      value={config.bgColor2}
                      onChange={(e) => update('bgColor2', e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="field">
              <label>Textura / Patrón</label>
              <div className="segmented">
                {(
                  [
                    ['none', 'Ninguno'],
                    ['radar', 'Radar'],
                    ['carbon', 'Carbón'],
                    ['grid', 'Rejilla'],
                    ['stars', 'Estrellas']
                  ] as Array<[PatternType, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={config.pattern === value ? 'active' : ''}
                    onClick={() => update('pattern', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="slider-row">
              <span>Viñeta oscura ({Math.round(config.vignette * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={0.85}
                step={0.05}
                value={config.vignette}
                onChange={(e) => update('vignette', Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {tab === 'clock' && (
          <div className="stack-md">
            <div className="field">
              <label>Motor real del reloj (100% igual en tu HK5 HERO)</label>
              <div className="segmented">
                <button
                  type="button"
                  className={activeEngine === 'analog_181' ? 'active' : ''}
                  onClick={() => setEngine('analog_181')}
                >
                  Analógica Pro
                </button>
                <button
                  type="button"
                  className={activeEngine === 'digital_181' ? 'active' : ''}
                  onClick={() => setEngine('digital_181')}
                >
                  Digital Pro
                </button>
                <button
                  type="button"
                  className={activeEngine === 'digital_33' ? 'active' : ''}
                  onClick={() => setEngine('digital_33')}
                >
                  Digital Arriba
                </button>
              </div>
            </div>

            {activeEngine === 'analog_181' ? (
              <div className="field">
                <label>Estilo de manecillas reales</label>
                <div className="segmented">
                  {(
                    [
                      ['sword', 'Espada'],
                      ['classic', 'Clásica'],
                      ['neon', 'Neón'],
                      ['minimal', 'Minimal']
                    ] as Array<[HandStyle, string]>
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={(config.handStyle || 'sword') === value ? 'active' : ''}
                      onClick={() => update('handStyle', value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="field">
                <label>Tipografía de los dígitos en vivo</label>
                <select
                  value={config.clockFont}
                  onChange={(e) => update('clockFont', e.target.value as ClockFont)}
                >
                  <option value="Orbitron">Orbitron (Futurista)</option>
                  <option value="Inter">Inter (Moderna)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Técnica)</option>
                  <option value="Playfair Display">Playfair (Clásica)</option>
                </select>
              </div>
            )}

            <div className="color-pair">
              <div className="field">
                <label>{activeEngine === 'analog_181' ? 'Color manecillas' : 'Color de dígitos'}</label>
                <input
                  type="color"
                  value={config.clockColor}
                  onChange={(e) => update('clockColor', e.target.value)}
                />
              </div>
              <div className="field">
                <label>{activeEngine === 'analog_181' ? 'Segundero / Acento' : 'Color de brillo'}</label>
                <input
                  type="color"
                  value={config.accentColor}
                  onChange={(e) => update('accentColor', e.target.value)}
                />
              </div>
            </div>

            <div className="swatches">
              {ACCENT_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`swatch ${config.accentColor === hex ? 'active' : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => update('accentColor', hex)}
                  aria-label={`Color ${hex}`}
                />
              ))}
            </div>

            <div className="toggle-list">
              <label className="toggle-item">
                <span>Efecto brillo (Glow)</span>
                <input
                  type="checkbox"
                  checked={config.clockGlow}
                  onChange={(e) => update('clockGlow', e.target.checked)}
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'details' && (
          <div className="stack-md">
            <div className="field">
              <label>Marco / Índices del dial</label>
              <div className="segmented">
                {(
                  [
                    ['none', 'Sin marco'],
                    ['minimal', 'Minimal'],
                    ['chrono', 'Chrono'],
                    ['neon', 'Neón']
                  ] as Array<[DialStyle, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={config.dialStyle === value ? 'active' : ''}
                    onClick={() => update('dialStyle', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="custom-signature">Texto personalizado (sale igual en el reloj)</label>
              <input
                id="custom-signature"
                type="text"
                maxLength={22}
                value={config.customText}
                onChange={(e) => update('customText', e.target.value)}
                placeholder="Ej. TE AMO MAILYN"
              />
            </div>

            <div className="field">
              <label>Posición del texto</label>
              <div className="segmented">
                {(
                  [
                    ['top', 'Arriba'],
                    ['center', 'Centro'],
                    ['bottom', 'Abajo']
                  ] as Array<[ClockPosition, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={(config.customTextPosition || 'bottom') === value ? 'active' : ''}
                    onClick={() => update('customTextPosition', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="slider-row">
              <span>Tamaño del texto ({config.customTextSize || 22}px)</span>
              <input
                type="range"
                min={14}
                max={42}
                step={2}
                value={config.customTextSize || 22}
                onChange={(e) => update('customTextSize', Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label>Color del texto</label>
              <input
                type="color"
                value={config.customTextColor || '#ffffff'}
                onChange={(e) => update('customTextColor', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
