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
    if (lines.length > 2 && /^\d+$/.test(lines[0].trim()) && 
        /^(?:\d{2}:)?\d{2}:\d{2},\d{3} --> (?:\d{2}:)?\d{2}:\d{2},\d{3}$/.test(lines[1].trim())) {
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
    
    // Handle SS.mmm format
    if (timeStr.match(/^\d+\.\d+$/)) {
        const [seconds, ms] = timeStr.split('.');
        return parseInt(seconds) * 1000 + parseInt(ms.padEnd(3, '0'));
    }
    
    // Handle MM:SS,mmm or MM:SS.mmm format
    if (timeStr.match(/^\d{1,2}:\d{2}[,.]\d{3}$/)) {
        const [time, ms] = timeStr.split(/[,.]/);
        const [minutes, seconds] = time.split(':').map(Number);
        return (minutes * 60 + seconds) * 1000 + parseInt(ms);
    }
    
    // Handle HH:MM:SS,mmm format
    const parts = timeStr.split(/[,.]/);
    const time = parts[0];
    const ms = parts[1] || '000';
    
    const timeParts = time.split(':').map(Number);
    
    // Pad with zeros if parts are missing
    while (timeParts.length < 3) {
        timeParts.unshift(0);
    }
    
    const [hours, minutes, seconds] = timeParts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + parseInt(ms.padEnd(3, '0'));
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
export const findTimestampRange = (text: string): { start: number; end: number } | null => {
    const parts = text.split(/-->|->|-|to|\t/).map(p => p.trim());
    if (parts.length < 2) return null;
    
    const start = parseTimeString(parts[0]);
    const end = parseTimeString(parts[1]);
    
    return start !== null && end !== null ? { start, end } : null;
};
