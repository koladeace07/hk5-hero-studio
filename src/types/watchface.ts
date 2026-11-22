export type BackgroundType = 'solid' | 'gradient' | 'radial' | 'image';
export type PatternType = 'none' | 'grid' | 'carbon' | 'stars' | 'radar';
export type ClockMode = 'digital' | 'analog' | 'none';
export type ClockFont = 'Orbitron' | 'Inter' | 'JetBrains Mono' | 'Playfair Display';
export type ClockPosition = 'center' | 'top' | 'bottom';
export type DialStyle = 'none' | 'minimal' | 'chrono' | 'neon';
export type HandStyle = 'classic' | 'sword' | 'neon' | 'minimal';
export type WatchEngine = 'analog_181' | 'digital_33';

export interface WatchFaceConfig {
  name: string;
  engine: WatchEngine;

  // Background
  bgType: BackgroundType;
  bgColor1: string;
  bgColor2: string;
  bgAngle: number;
  pattern: PatternType;
  imageDataUrl: string | null;
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
  imageBrightness: number;
  vignette: number;

  // Inner dial / bezel markings inside 466x466 screen
  dialStyle: DialStyle;
  accentColor: string;
  secondaryColor: string;

  // Clock (matches real live engine: analog_181 hands or digital_33 top digits)
  clockMode: ClockMode;
  clockFont: ClockFont;
  clockColor: string;
  clockPosition: ClockPosition;
  clockScale: number;
  handStyle: HandStyle;
  clockGlow: boolean;
  use24Hour: boolean;
  showSeconds: boolean;

  // Real transferable details
  showDate: boolean;
  showBattery: boolean;
  showBatteryRing: boolean;
  showSteps: boolean;
  showHeartRate: boolean;
  customText: string;
  customTextPosition: ClockPosition;
  customTextSize: number;
  customTextColor: string;
}

export interface SavedDesign {
  id: string;
  createdAt: string;
  thumbnail: string;
  config: WatchFaceConfig;
}

export interface BleCharacteristicReport {
  uuid: string;
  properties: string[];
  valueHex?: string;
  valueText?: string;
}

export interface BleServiceReport {
  uuid: string;
  label: string;
  characteristics: BleCharacteristicReport[];
}

export interface BleDiagnosticReport {
  timestamp: string;
  deviceName: string;
  deviceId: string;
  batteryLevel?: number;
  services: BleServiceReport[];
  notes: string[];
}
