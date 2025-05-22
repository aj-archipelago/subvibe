// core-utils.ts
/**
 * Core utility functions for subtitle processing
 */

import { ParseError } from './types';

export interface FormatDetectionResult {
  type: 'srt' | 'vtt' | 'unknown';
  errors?: ParseError[];
}

/**
 * Extracts subtitle content from markdown code blocks if present
 * Supports both ```vtt and ```srt code block formats
 */
export const extractFromMarkdown = (content: string): { content: string; wasExtracted: boolean; type?: 'srt' | 'vtt' } => {
    // Check if content is wrapped in markdown code blocks
    const vttMatch = content.match(/```vtt\s*\n([\s\S]*?)```/);
    const srtMatch = content.match(/```srt\s*\n([\s\S]*?)```/);
    
    if (vttMatch && vttMatch[1]) {
        return { content: vttMatch[1], wasExtracted: true, type: 'vtt' };
    }
    
    if (srtMatch && srtMatch[1]) {
        return { content: srtMatch[1], wasExtracted: true, type: 'srt' };
    }
    
    return { content, wasExtracted: false };
};

/**
 * Detects the subtitle format from content
 */
export const detectFormat = (content: string): FormatDetectionResult => {
    if (!content?.trim()) {
        return {
            type: 'unknown',
            errors: [{
                line: 1,
                message: 'Empty subtitle content',
                severity: 'error'
            }]
        };
    }

    // Check if content is wrapped in markdown code blocks and extract if needed
    const { content: extractedContent, wasExtracted, type: markdownType } = extractFromMarkdown(content);
    
    // If we detected the type from markdown, return it directly
    if (wasExtracted && markdownType) {
        return { type: markdownType };
    }
    
    // Check for VTT header
    if (extractedContent.trim().startsWith('WEBVTT')) {
        return { type: 'vtt' };
    }

    // Check for SRT format (numbered entries followed by timestamps)
    const lines = extractedContent.trim().split('\n');
    const srtTimestampLineRegex = /^(?:(?:\d{2}:)?\d{2}:\d{2}[,.]\d{3})\s*-->\s*(?:(?:\d{2}:)?\d{2}:\d{2}[,.]\d{3}|(?:\d{2}:)?\d{2},\d{2},\d{3})(?:\s+.*)?$/;
    if (lines.length > 1 && /^\d+$/.test(lines[0].trim()) && 
        srtTimestampLineRegex.test(lines[1].trim())) {
        return { type: 'srt' };
    }

    return {
        type: 'unknown',
        errors: [{
            line: 1,
            message: 'Invalid subtitle format',
            severity: 'error'
        }]
    };
};

/**
 * Common time parsing utility
 */
export const parseTimeString = (timeStr: string): number => {
    // Normalize the timestamp format
    timeStr = timeStr.trim();

    // Pre-process for ambiguous format like HH:MM,SS,mmm (e.g., 00:00,03,774)
    // This regex looks for two digits, a colon, two digits, a comma, two digits, a comma, three digits.
    const ambiguousPattern = /^(\d{2}:\d{2}),(\d{2}),(\d{3})$/;
    const ambiguousMatch = timeStr.match(ambiguousPattern);
    if (ambiguousMatch) {
      timeStr = `${ambiguousMatch[1]}:${ambiguousMatch[2]},${ambiguousMatch[3]}`;
    }

    // NEW: Handle H:S:mmm, S:mmm, Smmm (where mmm is 3-digit ms and no explicit separator)
    if (!timeStr.includes(',') && !timeStr.includes('.')) {
        const p = timeStr.split(':');
        if (p.length === 3 && p[2].length === 3 && /^\d+$/.test(p[2])) { // H:S:mmm e.g., 00:04:604
            const h = parseInt(p[0], 10);
            const s = parseInt(p[1], 10);
            const ms = parseInt(p[2], 10);
            // Ensure s < 60 to differentiate from H:M:S where S might be large (handled later)
            if (!isNaN(h) && !isNaN(s) && !isNaN(ms) && h < 100 && s < 60) {
                return (h * 3600 + s) * 1000 + ms;
            }
        } else if (p.length === 2 && p[1].length === 3 && /^\d+$/.test(p[1])) { // S:mmm e.g., 04:604 (04 is seconds)
            const s = parseInt(p[0], 10);
            const ms = parseInt(p[1], 10);
            // Ensure s is reasonable (e.g. not 60+ which implies it was minutes for M:S)
            if (!isNaN(s) && !isNaN(ms) && s < 3600) { // Max 59:59 for SS:mmm if we interpret s as SS
                 return s * 1000 + ms;
            }
        } else if (p.length === 1 && p[0].length >= 4 && p[0].length <= 7 && /^\d+$/.test(p[0])) { // Smmm, SSmmm, SSSmmm etc.
            const numStr = p[0];
            const msVal = parseInt(numStr.slice(-3), 10);
            const sVal = parseInt(numStr.slice(0, -3), 10);
            if (!isNaN(msVal) && !isNaN(sVal) && numStr.slice(-3).length === 3) {
                return sVal * 1000 + msVal;
            }
        }
    }
    
    // Handle SS.mmm format
    const ssMatch = timeStr.match(/^(\d+)\.(\d{1,3})/);
    if (ssMatch) {
        const [, seconds, ms] = ssMatch;
        return parseInt(seconds, 10) * 1000 + parseInt(ms.padEnd(3, '0'), 10);
    }
    
    // Handle MM:SS,mmm or MM:SS.mmm format
    const mmssMatch = timeStr.match(/^(\d{1,2}:\d{2})[,.](\d{1,3})/);
    if (mmssMatch) {
        const [, time, ms] = mmssMatch;
        const [minutes, seconds] = time.split(':').map(Number);
        return (minutes * 60 + seconds) * 1000 + parseInt(ms.padEnd(3, '0'), 10);
    }
    
    // Handle HH:MM:SS,mmm format
    const parts = timeStr.split(/[,.]/);
    const time = parts[0];
    // Extract only digits for ms part if there was trailing text
    const msDigits = (parts[1] || '000').match(/^\d{1,3}/)?.[0] || '000';
    
    const timeParts = time.split(':').map(Number);
    
    // Pad with zeros if parts are missing
    while (timeParts.length < 3) {
        timeParts.unshift(0);
    }
    
    const [hours, minutes, seconds] = timeParts;

    // Handle implicit milliseconds if no explicit ms part (msDigits is default '000') and parts.length is 1 (no separator used for ms)
    if (msDigits === '000' && parts.length === 1 && timeParts.length > 0) {
        const lastTimePartIndex = timeParts.length - 1;
        const lastPartValue = timeParts[lastTimePartIndex]; // This would be seconds, or minutes if only M:S, or hours if only H

        // Check if the last part looks like it contains seconds and milliseconds (e.g., SSSmmm or SSmmm or Smmm)
        // And it's not a simple small number of seconds (e.g. 1 to 999 which is handled fine by original logic)
        if (lastPartValue > 999 && lastPartValue < 60000) { // If lastPartValue is like 4507 (for seconds.ms) or similar
            const inferredMs = lastPartValue % 1000;
            const actualSeconds = Math.floor(lastPartValue / 1000);
            
            timeParts[lastTimePartIndex] = actualSeconds;
            // Reconstruct hours, minutes, seconds based on potentially modified timeParts
            const finalTimeSegments = [...timeParts]; // Create a new array to pad correctly if needed
            while (finalTimeSegments.length < 3) {
                finalTimeSegments.unshift(0);
            }
            const [h, m, s] = finalTimeSegments;
            return (h * 3600 + m * 60 + s) * 1000 + inferredMs;
        }
    }

    return (hours * 3600 + minutes * 60 + seconds) * 1000 + parseInt(msDigits.padEnd(3, '0'), 10);
};

/**
 * Check if text contains timestamp
 */
export const hasTimestamp = (text: string): boolean => {
    const patterns = [
        /\d{1,2}:\d{1,2}/,                          // MM:SS
        /\d{1,2}:\d{1,2}:\d{1,2}/,                 // HH:MM:SS
        /\d{1,2}[:.]\d{1,3}/,                      // SS.ms
        /\d{1,2}:\d{1,2}[:.]\d{1,3}/,             // MM:SS.ms
        /\d{1,2}:\d{1,2}:\d{1,2}[:.]\d{1,3}/,     // HH:MM:SS.ms
    ];
    return patterns.some(pattern => pattern.test(text));
};

/**
 * Extract timestamp range from text
 */
export const findTimestampRange = (text: string): { start: number; end: number } => {
    const parts = text.split(/-->|->|-|to|\t/).map(p => p.trim());
    
    let start = NaN;
    let end = NaN;

    if (parts.length >= 1) {
        start = parseTimeString(parts[0]);
    }
    if (parts.length >= 2) {
        // Ensure we only pass the timestamp part of parts[1] to parseTimeString
        // by splitting parts[1] at the first space if one exists.
        const endPartFull = parts[1];
        const endPartTimestamp = endPartFull.split(' ')[0];
        end = parseTimeString(endPartTimestamp);
    }
    
    return { start, end };
};
