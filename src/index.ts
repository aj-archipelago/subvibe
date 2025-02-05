import { parseSRT } from './srt/parser';
import { parseVTT } from './vtt/parser';
import { generateSRT } from './srt/generator';
import { generateVTT } from './vtt/generator';
import { SubtitleUtils } from './utils';
import { ParsedSubtitles, SubtitleCue, TimeShiftOptions } from './types';
import { detectFormat } from './core-utils';

export { parseSRT, parseVTT, generateSRT, generateVTT, SubtitleUtils };
export * from './types';

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
export function parse(content: string): ParsedSubtitles {
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
export function resync(cues: SubtitleCue[], options: TimeShiftOptions): SubtitleCue[] {
    return SubtitleUtils.shiftTime(cues, options);
}
