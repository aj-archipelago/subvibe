import { parseSRT } from './srt/parser';
import { parseVTT } from './vtt/parser';
import { generateSRT } from './srt/generator';
import { generateVTT } from './vtt/generator';
import { SubtitleUtils } from './utils';
import { ParsedSubtitles } from './types';

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
  return SubtitleUtils.detectAndParse(content);
}
