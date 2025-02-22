import { ParsedVTT, VTTSubtitleCue, SubtitleCue } from '../types';

function formatVTTTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function formatCueSettings(cue: VTTSubtitleCue): string {
  if (!cue.settings) return '';
  
  const parts: string[] = [];
  const { vertical, line, position, size, align, region } = cue.settings;

  if (vertical) parts.push(`vertical:${vertical}`);
  if (line) parts.push(`line:${line}`);
  if (position) parts.push(`position:${position}`);
  if (size) parts.push(`size:${size}`);
  if (align) parts.push(`align:${align}`);
  if (region) parts.push(`region:${region}`);

  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

function formatVoices(cue: VTTSubtitleCue): string {
  if (!cue.voices || cue.voices.length === 0) return cue.text;

  return cue.voices.map(voice => 
    `<v ${voice.voice}>${voice.text}</v>`
  ).join('\n');
}

function isVTTCue(cue: SubtitleCue | VTTSubtitleCue): cue is VTTSubtitleCue {
  return 'identifier' in cue || 'settings' in cue || 'voices' in cue;
}

export function generateVTT(subtitles: ParsedVTT | SubtitleCue[], options: { preserveIndexes?: boolean } = { preserveIndexes: true }): string {
  const blocks: string[] = ['WEBVTT'];
  
  // Handle ParsedVTT specific blocks
  if (!Array.isArray(subtitles)) {
    // Add style blocks
    if (subtitles.styles?.length) {
      subtitles.styles.forEach(style => {
        blocks.push('STYLE\n' + style);
      });
    }

    // Add region blocks
    if (subtitles.regions?.length) {
      subtitles.regions.forEach(region => {
        const regionLines = ['', 'REGION'];
        if (region.id) regionLines.push(`id=${region.id}`);
        if (region.width) regionLines.push(`width=${region.width}`);
        if (region.lines) regionLines.push(`lines=${region.lines}`);
        if (region.regionAnchor) regionLines.push(`regionanchor=${region.regionAnchor}`);
        if (region.viewportAnchor) regionLines.push(`viewportanchor=${region.viewportAnchor}`);
        if (region.scroll) regionLines.push(`scroll=${region.scroll}`);
        blocks.push(regionLines.join('\n'));
      });
    }
  }

  const cues = Array.isArray(subtitles) ? subtitles : subtitles.cues;
  const isParsedVTT = !Array.isArray(subtitles);
  // Determine whether any cue was parsed with an explicit identifier.
  const hasAnyIdentifiers = isParsedVTT && cues.some(cue => isVTTCue(cue) && (cue.identifier !== undefined));
  
  cues.forEach((cue, index) => {
    // Determine cue identifier based on options.
    let cueIdentifier: string;
    if (options.preserveIndexes) {
      if (isParsedVTT) {
        if (hasAnyIdentifiers) {
          if (isVTTCue(cue) && (cue.identifier !== undefined)) {
            cueIdentifier = (cue.identifier.trim() !== '' ? cue.identifier : '');
          } else {
            cueIdentifier = '';
          }
        } else {
          // For parsed VTT that lack any explicit identifier, fall back to sequential numbering.
          cueIdentifier = (cue.index !== undefined ? String(cue.index) : String(index + 1));
        }
      } else {
        // For non‑parsed cues, fallback to sequential numbering.
        cueIdentifier = (cue.index !== undefined ? String(cue.index) : String(index + 1));
      }
    } else {
      // When not preserving indexes, always use sequential numbering.
      cueIdentifier = String(index + 1);
    }
    
    // Build cue block without an initial empty line
    const cueLines: string[] = [];
    if (cueIdentifier) {
      cueLines.push(cueIdentifier);
    }
    const timestamp = `${formatVTTTimestamp(cue.startTime)} --> ${formatVTTTimestamp(cue.endTime)}`;
    const settings = isVTTCue(cue) ? formatCueSettings(cue) : '';
    cueLines.push(timestamp + settings);
    cueLines.push(isVTTCue(cue) && cue.voices ? formatVoices(cue) : cue.text);
    
    blocks.push(cueLines.join('\n'));
  });

  const output = blocks.join('\n\n');
  return output + '\n';
}

// Optional utility function to convert SRT cues to VTT format
export function convertSRTCuesToVTT(cues: SubtitleCue[]): VTTSubtitleCue[] {
  return cues.map(cue => ({
    ...cue,
    identifier: cue.index.toString()
  }));
}
