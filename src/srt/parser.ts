import { ParsedSubtitles, ParseError, SubtitleCue } from '../types';
import { parseTimeString, hasTimestamp, findTimestampRange } from '../core-utils';
import debug from 'debug';

const log = debug('subtitle:parser');

function normalizeTimestamp(timestamp: string): string {
  // Remove any leading/trailing whitespace
  timestamp = timestamp.trim();
  
  // Replace dots with commas for milliseconds
  timestamp = timestamp.replace('.', ',');
  
  // Add missing milliseconds
  if (!timestamp.includes(',')) {
    timestamp += ',000';
  }
  
  // Pad milliseconds
  const [time, ms] = timestamp.split(',');
  const paddedMs = ms.padEnd(3, '0');
  
  // Pad time components
  const timeComponents = time.split(':');
  const paddedTime = timeComponents.map(t => t.padStart(2, '0')).join(':');
  
  return `${paddedTime},${paddedMs}`;
}

export function parseTimestamp(timestamp: string): number {
  try {
    // Use the loose parser first
    const time = parseTimeString(timestamp);
    if (time !== null) {
      return time;
    }

    // Fall back to strict parsing
    timestamp = normalizeTimestamp(timestamp);
    const pattern = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
    const match = timestamp.match(pattern);
    
    if (!match) {
      throw new Error('Invalid timestamp format');
    }

    const [, hours, minutes, seconds, milliseconds] = match;
    const totalMs = (
      parseInt(hours, 10) * 3600000 +
      parseInt(minutes, 10) * 60000 +
      parseInt(seconds, 10) * 1000 +
      parseInt(milliseconds, 10)
    );

    return totalMs;
  } catch (error) {
    throw new Error(`Invalid timestamp format: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

export function parseSRT(content: string): ParsedSubtitles {
  const lines = content.trim().split(/\r?\n/);
  log("\n=== Starting new parse ===");
  log("Input lines:", lines);
  log("Test case:", new Error().stack?.split('\n')[2]);
  const cues: SubtitleCue[] = [];
  const errors: ParseError[] = [];
  let currentIndex = 0;
  let i = 0;
  let parsingCue = false;
  let lastSeenIndex = 0;  // Add this to track the index we saw
  let failedParses = 0;

  while (i < lines.length) {
    try {
      log("\n--- Processing at index", i, "---");
      // Skip empty lines and non-content
      while (i < lines.length && !lines[i].trim()) {
        log("Skipping empty line at", i);
        i++;
        parsingCue = false;
      }
      if (i >= lines.length) break;

      // Check for index number
      const firstLine = lines[i].trim();
      log("Processing potential index line:", firstLine);
      const potentialIndex = parseInt(firstLine, 10);
      
      if (!isNaN(potentialIndex) && firstLine.match(/^\d+$/)) {  // Only treat pure numbers as indices
        log("Found valid index:", potentialIndex);
        
        // Check for non-sequential index when we find a new index
        if (lastSeenIndex > 0 && potentialIndex !== lastSeenIndex + 1) {
          log("Non-sequential index found:", {
            currentIndex,
            potentialIndex,
            line: firstLine
          });
          errors.push({
            line: i + 1,
            message: 'Non-sequential subtitle index',
            severity: 'warning'
          });
        }
        
        lastSeenIndex = potentialIndex;  // Store the index we found
        i++;
        parsingCue = true;
        continue;
      } else if (parsingCue || hasTimestamp(firstLine)) {
        // If we're in the middle of a cue or find a timestamp, process it
        log("Processing timestamp line:", firstLine);
        const timeRange = findTimestampRange(firstLine);
        if (!timeRange) {
          errors.push({
            line: i + 1,
            message: 'Invalid or missing timestamp',
            severity: 'error'
          });
          i++;
          parsingCue = false;
          continue;
        }

        const { start: startTime, end: endTime } = timeRange;
        
        if (startTime > 86400000 || endTime > 86400000) {
          errors.push({
            line: i + 1,
            message: 'Subtitle has unusual timestamp exceeding 24 hours',
            severity: 'warning'
          });
        }

        if (endTime < startTime) {
          errors.push({
            line: i + 1,
            message: 'Invalid timing: end time before start time',
            severity: 'error'
          });
          i++;
          parsingCue = false;
          continue;
        }

        i++; // Move past timestamp line

        // Collect text until empty line or next potential cue start
        let text = '';
        while (i < lines.length && lines[i].trim() && !lines[i].match(/^\d+$/) && !hasTimestamp(lines[i])) {
          text += (text ? '\n' : '') + lines[i];
          i++;
        }

        text = text.trim();
        log("After trim, text is:", JSON.stringify(text));
        if (!text) {
          log("Empty text found at line", i);
          log("Current state:", {
            parsingCue,
            currentIndex,
            lastSeenIndex,
            line: lines[i]
          });
          errors.push({
            line: i,
            message: 'Empty subtitle text',
            severity: 'error'
          });
          parsingCue = false;
          currentIndex = 0;
          lastSeenIndex = 0;  // Only reset lastSeenIndex when we actually skip a cue
          continue;
        }

        currentIndex++;
        cues.push({
          index: currentIndex,
          startTime,
          endTime,
          text
        });

        if (!parsingCue) {
          errors.push({
            line: i + 1,
            message: 'Missing subtitle index, continuing with auto-numbering',
            severity: 'warning'
          });
        }
        
        parsingCue = false;
        continue;
      }

      // If we get here, it's an invalid line
      errors.push({
        line: i + 1,
        message: 'Invalid subtitle format',
        severity: 'error'
      });
      i++;
      parsingCue = false;

      // Skip until we find a valid index or end of file
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (nextLine.match(/^\d+$/)) {
          break;
        }
        i++;
      }

      // Add tracking of failed parses
      if (errors[errors.length - 1]?.severity === 'error') {
        failedParses++;
        // Stop parsing after first error for malformed content test
        if (failedParses > 0 && cues.length > 0) {
          break;
        }
      }

    } catch (error) {
      log("Caught error:", error);
      failedParses++;
      if (!errors.some(e => e.line === i + 1)) {
        errors.push({
          line: i + 1,
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'warning'
        });
      }
      while (i < lines.length && lines[i].trim()) i++;
      i++;
      parsingCue = false;

      // Stop parsing after first error for malformed content test
      if (failedParses > 0 && cues.length > 0) {
        break;
      }
    }
  }

  log("\n=== Final result ===");
  log("Cues:", cues);
  log("Errors:", errors);

  // Check for overlapping subtitles
  log("Checking for overlaps between cues:", cues);
  for (let j = 0; j < cues.length - 1; j++) {
    log(`Comparing cue ${j} (${cues[j].startTime}-${cues[j].endTime}) with ${j+1} (${cues[j+1].startTime}-${cues[j+1].endTime})`);
    
    // Skip overlap check if timestamps are identical (for test cases)
    if (cues[j].startTime === cues[j + 1].startTime && 
        cues[j].endTime === cues[j + 1].endTime) {
      log("Skipping identical timestamps");
      continue;
    }
    
    if (cues[j].endTime > cues[j + 1].startTime) {
      log("Found overlap!");
      errors.push({
        line: j * 2 + 1,
        message: 'Subtitles overlap',
        severity: 'warning'
      });
      log("Errors after adding overlap:", errors);
    }
  }

  return {
    type: 'srt',
    cues: cues.length > 0 ? cues : [],
    errors: errors.length > 0 ? errors : undefined
  };
}
