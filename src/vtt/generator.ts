import { ParsedVTT, VTTCue, SubtitleCue } from '../types';

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

function formatCueSettings(cue: VTTCue): string {
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

function formatVoices(cue: VTTCue): string {
  if (!cue.voices || cue.voices.length === 0) return cue.text;

  return cue.voices.map(voice => 
    `<v ${voice.voice}>${voice.text}</v>`
  ).join('\n');
}

function isVTTCue(cue: SubtitleCue | VTTCue): cue is VTTCue {
  return 'identifier' in cue || 'settings' in cue || 'voices' in cue;
}

export function generateVTT(subtitles: ParsedVTT | SubtitleCue[], options: { preserveIndexes?: boolean } = {}): string {
  const blocks: string[] = ['WEBVTT'];
  
  // Handle ParsedVTT specific blocks
  if (!Array.isArray(subtitles)) {
    // Add style blocks
    if (subtitles.styles?.length) {
      subtitles.styles.forEach(style => {
        blocks.push('', 'STYLE', style);
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
  
  cues.forEach((cue, index) => {
    const cueLines: string[] = [''];
    
    // Add identifier if present and not a simple number
    if (isVTTCue(cue) && cue.identifier && !cue.identifier.match(/^\d+$/)) {
      cueLines.push(cue.identifier);
    } else if (options.preserveIndexes && cue.index) {
      cueLines.push(String(cue.index));
    } else {
      cueLines.push(String(index + 1));
    }

    // Add timestamp line
    const timestamp = `${formatVTTTimestamp(cue.startTime)} --> ${formatVTTTimestamp(cue.endTime)}`;
    const settings = isVTTCue(cue) ? formatCueSettings(cue) : '';
    cueLines.push(timestamp + settings);

    // Add text content with voices if present
    cueLines.push(isVTTCue(cue) && cue.voices ? formatVoices(cue) : cue.text);

    blocks.push(cueLines.join('\n'));
  });

  return blocks.join('\n') + '\n';
}

// Optional utility function to convert SRT cues to VTT format
export function convertSRTCuesToVTT(cues: SubtitleCue[]): VTTCue[] {
  return cues.map(cue => ({
    ...cue,
    identifier: cue.index.toString()
  }));
}
