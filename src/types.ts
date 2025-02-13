export interface SubtitleCue {
  index: number;
  startTime: number;  // milliseconds
  endTime: number;    // milliseconds
  text: string;
  original?: {        // optional original timing if modified
    startTime: number;
    endTime: number;
  };
}

export interface ParsedSubtitles {
  type: 'srt' | 'vtt' | 'unknown';
  cues: SubtitleCue[];
  errors?: ParseError[];
}

export interface ParseError {
  line: number;
  message: string;
  severity: 'warning' | 'error';
}

// Utility type for time components
export interface TimeComponents {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export interface VTTCue extends SubtitleCue {
  identifier?: string;
  settings?: VTTCueSettings;
  styles?: VTTStyles;
  voices?: VTTVoice[];
}

export interface VTTCueSettings {
  vertical?: 'rl' | 'lr';
  line?: string;
  position?: string;
  size?: string;
  align?: 'start' | 'center' | 'end' | 'left' | 'right';
  region?: string;
}

export interface VTTStyles {
  className?: string;
  inlineStyle?: string;
}

export interface VTTVoice {
  voice: string;
  text: string;
}

export interface VTTRegion {
  id: string;
  width?: string;
  lines?: number;
  regionAnchor?: string;
  viewportAnchor?: string;
  scroll?: 'up' | 'none';
}

export interface VTTBlock {
  type: 'style' | 'region';
  content: string;
}

export interface ParsedVTT extends ParsedSubtitles {
  type: 'vtt';
  cues: VTTCue[];
  styles?: string[];
  regions?: VTTRegion[];
}

/**
 * Options for shifting subtitle timestamps
 */
export interface TimeShiftOptions {
  /**
   * Time offset in milliseconds.
   * Positive values shift forward, negative values shift backward.
   */
  offset: number;
  /**
   * Only shift cues after this time (optional)
   */
  startAt?: number;
  /**
   * Only shift cues before this time (optional)
   */
  endAt?: number;
}

export interface BuildOptions {
  format?: 'text' | 'srt' | 'vtt';
  preserveIndexes?: boolean;
}

export interface ParseOptions {
  preserveIndexes?: boolean;
}