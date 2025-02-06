import { ParsedVTT, VTTCue, SubtitleCue } from '../types';
import debug from 'debug';

const log = debug('subtitle:generator');

function formatVTTTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  // Format as mm:ss.ttt if less than 1 hour
  if (hours === 0) {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }
  
  // Format as hh:mm:ss.ttt if 1 hour or more
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
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

export function generateVTT(subtitles: ParsedVTT | SubtitleCue[]): string {
  const blocks: string[] = ['WEBVTT'];
  
  // Handle array of SubtitleCue
  if (Array.isArray(subtitles)) {
    const cues = convertSRTCuesToVTT(subtitles);
    cues.forEach(cue => {
      const cueLines: string[] = [''];
      
      // Add identifier if present
      if (cue.identifier) {
        cueLines.push(cue.identifier);
      }

      // Add timestamp line
      const timestamp = `${formatVTTTimestamp(cue.startTime)} --> ${formatVTTTimestamp(cue.endTime)}`;
      cueLines.push(timestamp);

      // Add text content
      cueLines.push(cue.text);

      blocks.push(cueLines.join('\n'));
    });

    return blocks.join('\n') + '\n';
  }

  // Handle ParsedVTT
  if (subtitles.styles && subtitles.styles.length > 0) {
    subtitles.styles.forEach(style => {
      blocks.push('', 'STYLE', style);
    });
  }

  if (subtitles.regions && subtitles.regions.length > 0) {
    subtitles.regions.forEach(region => {
      const regionLines = ['', 'REGION', `id=${region.id}`];
      if (region.width) regionLines.push(`width=${region.width}`);
      if (region.lines) regionLines.push(`lines=${region.lines}`);
      if (region.regionAnchor) regionLines.push(`regionanchor=${region.regionAnchor}`);
      if (region.viewportAnchor) regionLines.push(`viewportanchor=${region.viewportAnchor}`);
      if (region.scroll) regionLines.push(`scroll=${region.scroll}`);
      blocks.push(regionLines.join('\n'));
    });
  }

  subtitles.cues.forEach(cue => {
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
