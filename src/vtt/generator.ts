import { ParsedVTT, VTTCue, SubtitleCue } from '../types';
import debug from 'debug';

const log = debug('subtitle:generator');

function formatVTTTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  // For timestamps less than 1 hour, treat seconds as minutes
  if (hours === 0) {
    return `${seconds}:${String(0).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }
  
  // For timestamps >= 1 hour, use HH:MM:SS.mmm format
  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  log('Formatted with hours:', formatted);
  return formatted;
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

export function generateVTT(vtt: ParsedVTT): string {
  const blocks: string[] = ['WEBVTT'];

  // Add style blocks if present
  if (vtt.styles && vtt.styles.length > 0) {
    vtt.styles.forEach(style => {
      blocks.push('', 'STYLE', style);
    });
  }

  // Add region blocks if present
  if (vtt.regions && vtt.regions.length > 0) {
    vtt.regions.forEach(region => {
      const regionLines = ['', 'REGION', `id=${region.id}`];
      if (region.width) regionLines.push(`width=${region.width}`);
      if (region.lines) regionLines.push(`lines=${region.lines}`);
      if (region.regionAnchor) regionLines.push(`regionanchor=${region.regionAnchor}`);
      if (region.viewportAnchor) regionLines.push(`viewportanchor=${region.viewportAnchor}`);
      if (region.scroll) regionLines.push(`scroll=${region.scroll}`);
      blocks.push(regionLines.join('\n'));
    });
  }

  // Add cues
  vtt.cues.forEach(cue => {
    const cueLines: string[] = [''];

    // Add identifier if present
    if (cue.identifier) {
      cueLines.push(cue.identifier);
    }

    // Add timestamp line with settings
    const timestamp = `${formatVTTTimestamp(cue.startTime)} --> ${formatVTTTimestamp(cue.endTime)}`;
    const settings = formatCueSettings(cue);
    cueLines.push(timestamp + settings);

    // Add text content with voices if present
    cueLines.push(formatVoices(cue));

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
