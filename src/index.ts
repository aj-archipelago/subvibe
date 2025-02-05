import { parseSRT } from './srt/parser';
import { parseVTT } from './vtt/parser';
import { generateSRT } from './srt/generator';
import { generateVTT } from './vtt/generator';
import { SubtitleUtils } from './utils';
import { ParsedSubtitles, SubtitleCue, TimeShiftOptions } from './types';
import { detectFormat } from './core-utils';

/**
 * Parse subtitle content in either SRT or VTT format.
 * The format will be automatically detected based on the content.
 * 
 * @param content - The subtitle content to parse
 * @returns ParsedSubtitles object containing the parsed cues and detected format
 * 
 * @example
 * ```typescript
 * import { parse } from 'subvibe';
 * 
 * const content = readFileSync('subtitles.srt', 'utf8');
 * const result = parse(content);
 * 
 * console.log(result.type);  // 'srt' or 'vtt'
 * console.log(result.cues);  // array of parsed subtitle cues
 * ```
 */
function parse(content: string): ParsedSubtitles {
    const formatResult = detectFormat(content);
    
    switch (formatResult.type) {
        case 'srt':
            return parseSRT(content);
        case 'vtt':
            return parseVTT(content);
        default:
            return {
                type: 'unknown',
                cues: [],
                errors: formatResult.errors
            };
    }
}

/**
 * Resync subtitles by shifting their timestamps by a specified offset.
 * 
 * @param cues - Array of subtitle cues to shift
 * @param options - Time shift options containing the offset
 * @returns Array of shifted subtitle cues
 * 
 * @example
 * ```typescript
 * import { resync } from 'subvibe';
 * 
 * // Shift subtitles forward by 2 seconds
 * const shiftedCues = resync(cues, { offset: 2000 });
 * ```
 */
function resync(cues: SubtitleCue[], options: TimeShiftOptions): SubtitleCue[] {
    return SubtitleUtils.shiftTime(cues, options);
}

/**
 * Generate subtitle content in SRT, VTT, or plain text format.
 * 
 * @param cues - Array of subtitle cues to format
 * @param format - Output format ('text', 'srt', or 'vtt'), defaults to 'text'
 * @returns Formatted subtitle content as string
 */
function build(cues: SubtitleCue[], format: 'text' | 'srt' | 'vtt' = 'text'): string {
    switch (format) {
        case 'srt':
            return generateSRT({ type: 'srt', cues });
        case 'vtt':
            return generateVTT({ type: 'vtt', cues });
        case 'text':
        default:
            return cues
                .map(cue => cue.text.trim())
                .filter(Boolean)
                .join('\n\n');
    }
}

// Create the module object
const SubVibe = {
    parse,
    resync,
    build,
    parseSRT,
    parseVTT,
    generateSRT,
    generateVTT,
    SubtitleUtils
};

// Export both named exports and default export
export {
    parse,
    resync,
    build,
    parseSRT,
    parseVTT,
    generateSRT,
    generateVTT,
    SubtitleUtils
};

export default SubVibe;

// Export types
export type { ParsedSubtitles, SubtitleCue, TimeShiftOptions };
