import { parseSRT } from './srt/parser';
import { parseVTT } from './vtt/parser';
import { generateSRT, formatTimestamp } from './srt/generator';
import { generateVTT } from './vtt/generator';
import { SubtitleUtils } from './utils';
import { ParsedSubtitles, SubtitleCue, TimeShiftOptions, BuildOptions, ParsedVTT, ParseOptions } from './types';
import { detectFormat } from './core-utils';

/**
 * Parse subtitle content in either SRT or VTT format.
 * The format will be automatically detected based on the content.
 * 
 * @param content - The subtitle content to parse
 * @param options - Optional parsing options
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
function parse(content: string, options: ParseOptions = {}): ParsedSubtitles {
    const formatResult = detectFormat(content);
    
    switch (formatResult.type) {
        case 'srt':
            return parseSRT(content, options);
        case 'vtt':
            return parseVTT(content, options);
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

function isValidFormat(format: string): format is 'text' | 'srt' | 'vtt' {
    return ['text', 'srt', 'vtt'].includes(format);
}

/**
 * Generate subtitle content in SRT, VTT, or plain text format.
 * 
 * @param input - Array of subtitle cues or ParsedSubtitles object
 * @param options - Build options including format and index preservation, or format string
 * @returns Formatted subtitle content as string
 * 
 * @example
 * ```typescript
 * // Using array of cues
 * build(cues, { format: 'srt', preserveIndexes: true });
 * 
 * // Using ParsedSubtitles object
 * build(parsedSubtitles, { format: 'vtt' });
 * 
 * // Using legacy string format
 * build(cues, 'srt');
 * ```
 */
function build(input: ParsedSubtitles | SubtitleCue[], options: BuildOptions | 'srt' | 'vtt' | 'text' = {}): string {
    const cues = Array.isArray(input) ? input : input.cues;
    const inputType = Array.isArray(input) ? undefined : input.type;
    
    // Handle legacy string parameter for backward compatibility
    const opts: BuildOptions = typeof options === 'string' 
        ? { format: options } 
        : options;
    
    // Use input type if no format specified, otherwise use specified format or default to text
    const format = opts.format || inputType || 'text';

    switch (format) {
        case 'srt':
            return generateSRT({ type: 'srt', cues }, { preserveIndexes: opts.preserveIndexes });
        case 'vtt':
            // Always create a new VTT object to ensure type safety
            return generateVTT({
                type: 'vtt',
                cues,
                ...((!Array.isArray(input) && input.type === 'vtt') 
                    ? {
                        styles: (input as ParsedVTT).styles,
                        regions: (input as ParsedVTT).regions
                    } 
                    : {})
            }, { preserveIndexes: opts.preserveIndexes });
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
    SubtitleUtils,
    formatTimestamp
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
    SubtitleUtils,
    formatTimestamp
};

export default SubVibe;

// Export types
export type { ParsedSubtitles, SubtitleCue, TimeShiftOptions, BuildOptions, ParseOptions };
