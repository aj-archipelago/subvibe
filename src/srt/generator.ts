import { SubtitleCue, TimeComponents, ParsedSubtitles } from '../types';

function formatTimeComponent(num: number): string {
  return num.toString().padStart(2, '0');
}

function formatMilliseconds(ms: number): string {
  return ms.toString().padStart(3, '0');
}

function millisecondsToTimeComponents(ms: number): TimeComponents {
  const hours = Math.floor(ms / 3600000);
  ms %= 3600000;
  const minutes = Math.floor(ms / 60000);
  ms %= 60000;
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;

  return { hours, minutes, seconds, milliseconds };
}

export function formatTimestamp(ms: number): string {
  const time = millisecondsToTimeComponents(ms);
  return `${formatTimeComponent(time.hours)}:${formatTimeComponent(time.minutes)}:${formatTimeComponent(time.seconds)},${formatMilliseconds(time.milliseconds)}`;
}

export function generateSRT(input: ParsedSubtitles | SubtitleCue[], options: { preserveIndexes?: boolean } = {}): string {
  const cues = Array.isArray(input) ? input : input.cues;
  
  return cues
    .map((cue, index) => {
      const sequenceNumber = options.preserveIndexes ? (cue.index || index + 1) : index + 1;
      return [
        sequenceNumber,
        `${formatTimestamp(cue.startTime)} --> ${formatTimestamp(cue.endTime)}`,
        cue.text,
        ''
      ].join('\n');
    })
    .join('\n');
}

// Optional utility function to convert VTT cues to SRT format
export function convertVTTCuesToSRT(cues: SubtitleCue[]): SubtitleCue[] {
  return cues.map((cue, index) => ({
    ...cue,
    index: index + 1,
    // Strip any VTT-specific formatting if present
    text: cue.text.replace(/<v\s+[^>]*>(.*?)<\/v>/g, '$1')
  }));
}
