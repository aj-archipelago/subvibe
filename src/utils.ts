import { SubtitleCue, ParseError, ParsedSubtitles } from './types';

export interface TimeShiftOptions {
  offset: number;      // milliseconds to shift (positive or negative)
  startAt?: number;    // only shift cues after this time
  endAt?: number;      // only shift cues before this time
  preserveGaps?: boolean; // maintain relative gaps between subtitles
}

export interface TimeScaleOptions {
  factor: number;      // scale factor (e.g., 1.1 for 10% slower, 0.9 for 10% faster)
  anchor?: number;     // time point around which to scale (default: 0)
  startAt?: number;    // only scale cues after this time
  endAt?: number;      // only scale cues before this time
}

export interface ValidationResult {
  isValid: boolean;
  errors: ParseError[];
}

export interface NormalizeOptions {
  format: 'srt' | 'vtt';
  removeFormatting?: boolean;
  fixTimings?: boolean;
  mergeOverlapping?: boolean;
  minimumDuration?: number;     // in ms
  maximumDuration?: number;     // in ms
  minimumGap?: number;         // in ms
  removeEmpty?: boolean;
  removeStrayText?: boolean;   // text without timestamps
  cleanupSpacing?: boolean;    // remove extra whitespace/newlines
}

export class SubtitleUtils {
  /**
   * Shift subtitle timing by a specified amount
   */
  static shiftTime(cues: SubtitleCue[], options: TimeShiftOptions): SubtitleCue[] {
    const { offset, startAt = 0, endAt = Infinity } = options;
    
    return cues.map(cue => {
      const original = { startTime: cue.startTime, endTime: cue.endTime };
      
      // Skip cues outside the time range
      if (cue.endTime < startAt || cue.startTime > endAt) {
        return { ...cue };
      }

      // Calculate new times
      const startTime = Math.max(0, cue.startTime + offset);
      const endTime = Math.max(startTime + 1, cue.endTime + offset);

      return {
        ...cue,
        startTime,
        endTime,
        original: cue.original || original
      };
    });
  }

  /**
   * Scale subtitle timing by a factor
   */
  static scaleTime(cues: SubtitleCue[], options: TimeScaleOptions): SubtitleCue[] {
    const { factor, anchor = 0, startAt = 0, endAt = Infinity } = options;
    
    return cues.map(cue => {
      const original = { startTime: cue.startTime, endTime: cue.endTime };
      
      // Skip cues outside the time range
      if (cue.endTime < startAt || cue.startTime > endAt) {
        return { ...cue };
      }

      // Scale around anchor point
      const startTime = Math.max(0, anchor + (cue.startTime - anchor) * factor);
      const endTime = Math.max(startTime + 1, anchor + (cue.endTime - anchor) * factor);

      return {
        ...cue,
        startTime,
        endTime,
        original: cue.original || original
      };
    });
  }

  /**
   * Merge overlapping subtitles
   */
  static mergeOverlapping(cues: SubtitleCue[]): SubtitleCue[] {
    const sorted = [...cues].sort((a, b) => a.startTime - b.startTime);
    const merged: SubtitleCue[] = [];
    
    for (const cue of sorted) {
      const last = merged[merged.length - 1];
      
      if (last && cue.startTime <= last.endTime) {
        // Merge overlapping cues
        last.endTime = Math.max(last.endTime, cue.endTime);
        last.text = `${last.text}\n${cue.text}`;
      } else {
        merged.push({ ...cue });
      }
    }

    // Reindex the merged cues
    return merged.map((cue, index) => ({
      ...cue,
      index: index + 1
    }));
  }

  /**
   * Fix common subtitle timing issues
   */
  static fixTimings(cues: SubtitleCue[]): SubtitleCue[] {
    const sorted = [...cues].sort((a, b) => a.startTime - b.startTime);
    const fixed: SubtitleCue[] = [];
    
    for (const cue of sorted) {
      const last = fixed[fixed.length - 1];
      const minDuration = 500; // minimum duration in ms
      const minGap = 40;      // minimum gap between subtitles in ms
      
      let startTime = cue.startTime;
      let endTime = Math.max(cue.startTime + minDuration, cue.endTime);

      // Ensure minimum gap from previous subtitle
      if (last && startTime < last.endTime + minGap) {
        startTime = last.endTime + minGap;
        endTime = Math.max(startTime + minDuration, endTime);
      }

      fixed.push({
        ...cue,
        startTime,
        endTime,
        original: cue.original || { startTime: cue.startTime, endTime: cue.endTime }
      });
    }

    return fixed;
  }

  /**
   * Validate subtitle timings and content
   */
  static validate(cues: SubtitleCue[]): ValidationResult {
    const errors: ParseError[] = [];
    let lineCount = 1;

    // Check for sequential timing
    const sorted = [...cues].sort((a, b) => a.startTime - b.startTime);
    
    sorted.forEach((cue, index) => {
      // Check for negative times
      if (cue.startTime < 0 || cue.endTime < 0) {
        errors.push({
          line: lineCount,
          message: 'Negative timestamp detected',
          severity: 'error'
        });
      }

      // Check for invalid duration
      if (cue.endTime <= cue.startTime) {
        errors.push({
          line: lineCount,
          message: 'End time must be after start time',
          severity: 'error'
        });
      }

      // Check for overlaps with next subtitle
      const next = sorted[index + 1];
      if (next && cue.endTime > next.startTime) {
        errors.push({
          line: lineCount,
          message: 'Subtitle overlaps with next subtitle',
          severity: 'warning'
        });
      }

      // Check for unusually long duration
      if (cue.endTime - cue.startTime > 10000) {
        errors.push({
          line: lineCount,
          message: 'Subtitle duration exceeds 10 seconds',
          severity: 'warning'
        });
      }

      // Check for empty or whitespace-only text
      if (!cue.text.trim()) {
        errors.push({
          line: lineCount,
          message: 'Empty subtitle text',
          severity: 'error'
        });
      }

      lineCount += 2 + cue.text.split('\n').length;
    });

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Remove formatting tags from subtitle text
   */
  static stripFormatting(cues: SubtitleCue[]): SubtitleCue[] {
    return cues.map(cue => ({
      ...cue,
      text: cue.text
        .replace(/<[^>]+>/g, '') // Remove HTML-style tags
        .replace(/\{\\[^}]+\}/g, '') // Remove SSA/ASS style tags
        .replace(/\[[^\]]+\]/g, '') // Remove bracketed tags
        .trim()
    }));
  }

  /**
   * Attempt to parse any string that might represent a timestamp
   * Returns milliseconds if successful, null if not
   */
  static parseLooseTime(text: string): number | null {
    text = text.trim();
    
    // Handle hour/minute format (e.g., "1h 23m")
    const hourMinuteMatch = text.match(/(\d+)h\s*(\d+)m/);
    if (hourMinuteMatch) {
      const [, hours, minutes] = hourMinuteMatch;
      return parseInt(hours, 10) * 3600000 + parseInt(minutes, 10) * 60000;
    }

    // Handle minute/second format (e.g., "5m 35s")
    const minuteSecondMatch = text.match(/(\d+)m\s*(\d+)s/);
    if (minuteSecondMatch) {
      const [, minutes, seconds] = minuteSecondMatch;
      return parseInt(minutes, 10) * 60000 + parseInt(seconds, 10) * 1000;
    }

    // Try to extract numbers from the string
    const numbers = text.split(/[^0-9]+/).filter(Boolean);
    if (numbers.length === 0) return null;

    try {
      // Handle various formats:
      
      // Case 1: Single number (assume seconds)
      if (numbers.length === 1) {
        return parseInt(numbers[0], 10) * 1000;
      }

      // Case 2: MM:SS or SS.ms
      if (numbers.length === 2) {
        const [a, b] = numbers;
        // If second number looks like milliseconds
        if (b.length === 3) {
          return parseInt(a, 10) * 1000 + parseInt(b, 10);
        }
        // Otherwise assume MM:SS
        return parseInt(a, 10) * 60000 + parseInt(b, 10) * 1000;
      }

      // Case 3: HH:MM:SS or MM:SS.ms
      if (numbers.length === 3) {
        const [a, b, c] = numbers;
        // If last number looks like milliseconds
        if (c.length === 3) {
          return parseInt(a, 10) * 60000 + parseInt(b, 10) * 1000 + parseInt(c, 10);
        }
        // Otherwise assume HH:MM:SS
        return parseInt(a, 10) * 3600000 + parseInt(b, 10) * 60000 + parseInt(c, 10) * 1000;
      }

      // Case 4: HH:MM:SS.ms
      if (numbers.length === 4) {
        const [h, m, s, ms] = numbers;
        return parseInt(h, 10) * 3600000 + 
               parseInt(m, 10) * 60000 + 
               parseInt(s, 10) * 1000 + 
               parseInt(ms.padEnd(3, '0').slice(0, 3), 10);
      }

      // If we have more numbers, try to make sense of the last 4
      if (numbers.length > 4) {
        const last4 = numbers.slice(-4);
        return SubtitleUtils.parseLooseTime(last4.join(':'));
      }

    } catch {
      return null;
    }

    return null;
  }

  /**
   * Attempt to detect if a string contains a timestamp
   */
  static hasTimestamp(text: string): boolean {
    // Look for common timestamp patterns
    const patterns = [
      /\d{1,2}:\d{1,2}/,                          // MM:SS
      /\d{1,2}:\d{1,2}:\d{1,2}/,                 // HH:MM:SS
      /\d{1,2}[:.]\d{1,3}/,                      // SS.ms
      /\d{1,2}:\d{1,2}[:.]\d{1,3}/,             // MM:SS.ms
      /\d{1,2}:\d{1,2}:\d{1,2}[:.]\d{1,3}/,     // HH:MM:SS.ms
      /^\d{1,5}$/,                               // Just numbers (potential seconds)
      /\d{1,2}h\s*\d{1,2}m/,                    // 1h 23m format
      /\d{1,2}m\s*\d{1,2}s/,                    // 5m 35s format
      /\d{1,2}'\d{1,2}"/,                       // 5'35" format
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Attempt to extract a timestamp range from text
   */
  static findTimestampRange(text: string): { start: number; end: number } | null {
    // Split only on arrow separators, not commas
    const parts = text.split(/-->|->|-|to|\t/).map(p => p.trim());
    
    // If any part is empty after trimming, return null
    if (parts.some(p => !p)) {
      return null;
    }
    
    for (let i = 0; i < parts.length - 1; i++) {
      const start = SubtitleUtils.parseLooseTime(parts[i]);
      const end = SubtitleUtils.parseLooseTime(parts[i + 1]);
      
      if (start !== null && end !== null) {
        return { start, end };
      }
    }

    return null;
  }

  /**
   * Attempt to detect if text might be a subtitle block
   */
  static looksLikeSubtitle(text: string): boolean {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return false;

    // Look for any of these patterns:
    // 1. Number followed by timestamp
    // 2. Timestamp line followed by text
    // 3. Multiple short lines of text with timestamps nearby
    
    for (let i = 0; i < lines.length - 1; i++) {
      // Check for number followed by timestamp
      if (/^\d+$/.test(lines[i].trim()) && SubtitleUtils.hasTimestamp(lines[i + 1])) {
        return true;
      }

      // Check for timestamp followed by text
      if (SubtitleUtils.hasTimestamp(lines[i]) && lines[i + 1].trim().length > 0) {
        return true;
      }
    }

    // Check if there are multiple timestamps with reasonable spacing
    const timestampLines = lines.filter(line => SubtitleUtils.hasTimestamp(line));
    if (timestampLines.length >= 2) {
      return true;
    }

    return false;
  }

  /**
   * Normalize subtitles to strict SRT or VTT format
   */
  static normalize(cues: SubtitleCue[], options: NormalizeOptions): SubtitleCue[] {
    const {
      format,
      removeFormatting = false,
      fixTimings = true,
      mergeOverlapping = true,
      minimumDuration = 500,
      maximumDuration = 7000,
      minimumGap = 40,
      removeEmpty = true,
      cleanupSpacing = true
    } = options;

    let normalized = [...cues];

    // Remove empty subtitles first
    if (removeEmpty) {
      normalized = normalized.filter(cue => cue.text.trim().length > 0);
    }

    // Clean up text
    if (cleanupSpacing) {
      normalized = normalized.map(cue => ({
        ...cue,
        text: cue.text
          .split('\n')
          .map(line => line.replace(/\s+/g, ' ').trim()) // Replace multiple spaces with single space
          .filter(Boolean)
          .join('\n')
      }));
    }

    // Format-specific normalization (do this before removing formatting)
    if (format === 'vtt') {
      normalized = normalized.map(cue => ({
        ...cue,
        // Convert any SRT-style formatting to VTT
        text: cue.text
          .replace(/\{\\b1\}(.*?)\{\\b0\}/g, '<b>$1</b>')
          .replace(/\{\\i1\}(.*?)\{\\i0\}/g, '<i>$1</i>')
          .replace(/\{\\u1\}(.*?)\{\\u0\}/g, '<u>$1</u>')
      }));
    } else {
      normalized = normalized.map(cue => ({
        ...cue,
        // Convert any VTT-style formatting to SRT
        text: cue.text
          .replace(/<b>(.*?)<\/b>/g, '{\\b1}$1{\\b0}')
          .replace(/<i>(.*?)<\/i>/g, '{\\i1}$1{\\i0}')
          .replace(/<u>(.*?)<\/u>/g, '{\\u1}$1{\\u0}')
      }));
    }

    // Remove formatting if requested (after conversion)
    if (removeFormatting) {
      normalized = SubtitleUtils.stripFormatting(normalized);
    }

    // Sort by start time
    normalized.sort((a, b) => a.startTime - b.startTime);

    // Fix timings
    if (fixTimings) {
      let lastEndTime = 0;
      normalized = normalized.map(cue => {
        // Ensure minimum duration
        let duration = cue.endTime - cue.startTime;
        if (duration < minimumDuration) {
          duration = minimumDuration;
        }
        if (duration > maximumDuration) {
          duration = maximumDuration;
        }

        // Ensure minimum gap from previous subtitle
        let startTime = cue.startTime;
        if (startTime < lastEndTime + minimumGap) {
          startTime = lastEndTime + minimumGap;
        }

        const endTime = startTime + duration;
        lastEndTime = endTime;

        return {
          ...cue,
          startTime,
          endTime,
          original: cue.original || { startTime: cue.startTime, endTime: cue.endTime }
        };
      });
    }

    // Merge overlapping if requested (after timing fixes)
    if (mergeOverlapping) {
      normalized = SubtitleUtils.mergeOverlapping(normalized);
    }

    // Reindex
    return normalized.map((cue, index) => ({
      ...cue,
      index: index + 1
    }));
  }

  /**
   * Detect and parse subtitle content in either SRT or VTT format
   */
  static detectAndParse(content: string): ParsedSubtitles {
    // Check for empty content first
    const lines = content.trim().split(/\r?\n/);
    const nonEmptyLines = lines.filter(line => line.trim());

    if (nonEmptyLines.length === 0) {
      return {
        type: 'unknown',
        cues: [],
        errors: [{
          line: 1,
          message: 'Empty subtitle content',
          severity: 'error'
        }]
      };
    }

    // Check if content looks like a subtitle file
    if (!SubtitleUtils.looksLikeSubtitle(content)) {
      return {
        type: 'unknown',
        cues: [],
        errors: [{
          line: 1,
          message: 'Content does not appear to be a subtitle file',
          severity: 'error'
        }]
      };
    }

    // Check for WEBVTT header
    if (content.trim().startsWith('WEBVTT')) {
      const { parseVTT } = require('./vtt/parser');
      return parseVTT(content);
    }

    // Check for SRT-style numeric index at start
    const firstLine = nonEmptyLines[0].trim();
    if (/^\d+$/.test(firstLine)) {
      const { parseSRT } = require('./srt/parser');
      return parseSRT(content);
    }

    // If no clear indicators, try to parse as both formats and use the one with fewer errors
    const { parseSRT } = require('./srt/parser');
    const { parseVTT } = require('./vtt/parser');
    const srtResult = parseSRT(content);
    const vttResult = parseVTT(content);

    const srtErrorCount = srtResult.errors?.length ?? 0;
    const vttErrorCount = vttResult.errors?.length ?? 0;

    // Return the format that produced fewer errors
    return srtErrorCount <= vttErrorCount ? srtResult : vttResult;
  }
} 
