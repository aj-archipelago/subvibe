import { /* SubtitleCue, ParsedSubtitles, */ ParseError, ParsedVTT, VTTCueSettings, VTTRegion, /* VTTStyles, */ VTTVoice, ParseOptions, VTTSubtitleCue } from '../types';
import { parser as log } from '../utils/debug';

function normalizeTimestamp(timestamp: string): string {
  // Remove any leading/trailing whitespace
  timestamp = timestamp.trim();
  
  // Ensure we're using dots for milliseconds
  timestamp = timestamp.replace(',', '.');
  
  // Add missing milliseconds
  if (!timestamp.includes('.')) {
    timestamp += '.000';
  }
  
  // Pad milliseconds
  const [time, ms] = timestamp.split('.');
  const paddedMs = ms.padEnd(3, '0');
  
  // Handle hour format - add if missing
  const timeComponents = time.split(':');
  if (timeComponents.length === 2) {
    timeComponents.unshift('00');
  }
  
  // Pad all components
  const paddedTime = timeComponents.map(t => t.padStart(2, '0')).join(':');
  
  return `${paddedTime}.${paddedMs}`;
}

function parseTimestamp(timestamp: string): number {
  try {
    timestamp = normalizeTimestamp(timestamp);
    const pattern = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/;
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

    // Sanity check for unusual timestamps
    if (totalMs > 359999999) { // More than 99:59:59.999
      throw new Error('unusual timestamp value');
    }

    return totalMs;
  } catch (error) {
    throw new Error(`Invalid timestamp format: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

function parseVTTTimestamp(timestamp: string): number {
  // Enhance timestamp parsing to handle more VTT formats
  timestamp = timestamp.trim();
  
  // Handle percentage timestamps (e.g., 50%)
  if (timestamp.endsWith('%')) {
    const percent = parseFloat(timestamp);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      throw new Error('Invalid percentage timestamp');
    }
    // Convert to milliseconds assuming 100% = 24 hours
    return (percent / 100) * 24 * 3600000;
  }

  // Handle shortened formats
  const parts = timestamp.split(':');
  if (parts.length === 1) {
    // Format: ss.mmm
    const [seconds, milliseconds = '000'] = parts[0].split('.');
    return parseInt(seconds, 10) * 1000 + parseInt(milliseconds.padEnd(3, '0'), 10);
  }

  return parseTimestamp(normalizeTimestamp(timestamp));
}

function parseVTTSettings(settings: string): VTTCueSettings {
  const result: VTTCueSettings = {};
  const pairs = settings.trim().split(/\s+/);

  for (const pair of pairs) {
    const [key, value] = pair.split(':');
    if (!key || !value) continue;

    switch (key) {
      case 'vertical':
        if (value === 'rl' || value === 'lr') {
          result.vertical = value;
        }
        break;
      case 'line':
        result.line = value;
        break;
      case 'position':
        result.position = value;
        break;
      case 'size':
        result.size = value;
        break;
      case 'align':
        if (['start', 'center', 'end', 'left', 'right'].includes(value)) {
          result.align = value as VTTCueSettings['align'];
        }
        break;
      case 'region':
        result.region = value;
        break;
    }
  }

  return result;
}

function parseVTTRegion(content: string): VTTRegion {
  const lines = content.split('\n');
  const region: VTTRegion = {
    id: '',
    width: '100%',
    lines: 3,
    regionAnchor: '0%,100%',
    viewportAnchor: '0%,100%',
    scroll: 'none'
  };

  lines.forEach(line => {
    const [key, value] = line.split('=').map(part => part.trim());
    log(`Parsing region setting: ${key} = ${value}`);
    
    switch (key) {
      case 'id':
        region.id = value;
        break;
      case 'width':
        region.width = value;
        break;
      case 'lines':
        region.lines = parseInt(value, 10);
        break;
      case 'regionanchor':
        region.regionAnchor = value;
        break;
      case 'viewportanchor':
        region.viewportAnchor = value;
        break;
      case 'scroll':
        region.scroll = value as 'up' | 'none';
        break;
    }
  });

  log('Parsed region:', region);
  return region;
}

function parseVTTVoices(text: string): { text: string; voices: VTTVoice[] } {
  const voices: VTTVoice[] = [];
  let cleanText = text;
  
  // Match <v Speaker>Text</v> patterns
  const voicePattern = /<v\s+([^>]*)>(.*?)<\/v>/g;
  let match;

  while ((match = voicePattern.exec(text)) !== null) {
    voices.push({
      voice: match[1].trim(),
      text: match[2].trim()
    });
    // Remove the voice tag from clean text
    cleanText = cleanText.replace(match[0], match[2]);
  }

  return { text: cleanText, voices };
}

function parseVoiceSpans(text: string): { voice: string; text: string }[] | undefined {
  const voiceRegex = /<v\s+([^>]+)>([^<]+)/g;
  const matches = Array.from(text.matchAll(voiceRegex));
  
  if (matches.length === 0) {
    return undefined;
  }

  return matches.map(match => ({
    voice: match[1].trim(),
    text: match[2].trim()
  }));
}

function parseCueIndex(line: string): number | null {
  const num = parseInt(line, 10);
  return !isNaN(num) ? num : null;
}

export function parseVTT(content: string, options: ParseOptions = { preserveIndexes: true }): ParsedVTT {
  const lines = content.trim().split(/\r?\n/);
  const cues: VTTSubtitleCue[] = [];
  const errors: ParseError[] = [];
  const styles: string[] = [];
  const regions: VTTRegion[] = [];
  
  let currentIndex = 0;
  let i = 0;

  log('=== Starting VTT parse ===');
  log('Input:', content);

  // Check and parse WEBVTT header
  if (!lines[0]?.trim().startsWith('WEBVTT')) {
    // Continue parsing without header
  } else {
    i++;
    // Parse header metadata
    while (i < lines.length && lines[i].trim() !== '') {
      // Store any header metadata if needed
      i++;
    }
    i++;
  }

  // Parse blocks (STYLE, REGION) and cues
  while (i < lines.length) {
    try {
      const line = lines[i].trim();
      log(`Processing line ${i}: "${line}"`);

      // Skip empty lines and comments
      if (!line || line.startsWith('NOTE')) {
        log(`Line ${i} type: ${line ? 'NOTE' : 'empty'}, content: "${line}"`);
        if (line.startsWith('NOTE')) {
          log(`Found NOTE at line ${i}, content: "${line}"`);
          i++;
          // Only treat non-timestamp lines as part of the comment
          while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
            log(`Skipping comment line ${i}: "${lines[i]}"`);
            i++;
          }
          log(`After NOTE block, next line ${i}: "${lines[i] || '(end of file)'}"`);
          continue;
        } else {
          log(`Skipping empty line ${i}`);
          i++;
          continue;
        }
      }

      // Handle STYLE blocks
      if (line === 'STYLE') {
        i++;
        let styleContent = '';
        while (i < lines.length && lines[i].trim() !== '') {
          styleContent += lines[i] + '\n';
          i++;
        }
        styles.push(styleContent.trim());
        continue;
      }

      // Handle REGION blocks
      if (line === 'REGION') {
        i++;
        let regionContent = '';
        while (i < lines.length && lines[i].trim() !== '') {
          regionContent += lines[i] + '\n';
          i++;
        }
        try {
          regions.push(parseVTTRegion(regionContent.trim()));
        } catch (error) {
          errors.push({
            line: i,
            message: error instanceof Error ? error.message : 'Invalid region',
            severity: 'error'
          });
        }
        continue;
      }

      // Parse cue
      let identifier = '';
      let timestampLine = line;

      // Check if this line is a cue identifier
      if (!line.includes('-->')) {
        identifier = line;
        log('Found identifier:', identifier);
        i++;
        if (i >= lines.length) break;
        timestampLine = lines[i].trim();
      }

      // Parse timestamp line
      log('Parsing timestamp line:', timestampLine);
      const timestampParts = timestampLine.split('-->').map(t => t.trim());
      if (timestampParts.length !== 2) {
        log('Invalid timestamp format:', timestampLine);
        errors.push({
          line: i + 1,
          message: 'Invalid timestamp format',
          severity: 'error'
        });
        // Skip until next empty line or end
        while (i < lines.length && lines[i].trim() !== '') {
          i++;
        }
        continue;
      }

      // Split timestamp from settings
      const [startStr, endWithSettings] = timestampParts;
      log('Start timestamp:', startStr);
      log('End timestamp with settings:', endWithSettings);
      
      // Split end timestamp from settings
      const [endStr, ...settingsParts] = endWithSettings.split(/\s+/);
      
      let startTime: number, endTime: number;
      try {
        startTime = parseVTTTimestamp(startStr);
        endTime = parseVTTTimestamp(endStr);
        log('Parsed timestamps:', { startTime, endTime });

        // Skip cue if either timestamp is invalid
        if (isNaN(startTime) || isNaN(endTime)) {
          log('Invalid timestamp values');
          errors.push({
            line: i + 1,
            message: 'Invalid timestamp format',
            severity: 'error'
          });
          // Skip until next empty line or end
          while (i < lines.length && lines[i].trim() !== '') {
            i++;
          }
          continue;
        }
      } catch (error) {
        log('Error parsing timestamp:', error);
        errors.push({
          line: i + 1,
          message: 'Invalid timestamp format',
          severity: 'error'
        });
        // Skip until next empty line or end
        while (i < lines.length && lines[i].trim() !== '') {
          i++;
        }
        continue;
      }

      // Parse settings
      const settings = parseVTTSettings(settingsParts.join(' '));

      // Parse text content
      i++;
      let text = '';
      while (i < lines.length && lines[i].trim() !== '') {
        text += (text ? '\n' : '') + lines[i];
        i++;
      }

      // Parse voices and clean text
      const { text: cleanText, voices } = parseVTTVoices(text.trim());

      // Create cue with properly handled index and identifier
      const cue: VTTSubtitleCue = {
        index: currentIndex + 1,
        startTime,
        endTime,
        text: cleanText
      };

      if (options.preserveIndexes && identifier) {
        // When preserving indexes, store all identifiers
        cue.identifier = identifier;
      } else if (!options.preserveIndexes) {
        // When not preserving indexes, only store non-numeric identifiers
        if (identifier && !identifier.match(/^\d+$/)) {
          cue.identifier = identifier;
        }
      }

      if (settings && Object.keys(settings).length > 0) {
        cue.settings = settings;
      }
      if (voices && voices.length > 0) {
        cue.voices = voices;
      }

      const voiceSpans = parseVoiceSpans(cue.text);
      if (voiceSpans) {
        cue.voices = voiceSpans;
      }

      cues.push(cue);
      currentIndex++;

    } catch (error) {
      log('Error processing line:', error);
      errors.push({
        line: i + 1,
        message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'error'
      });
      i++;
    }
  }

  log('=== Parse complete ===');
  log('Cues:', cues);
  log('Errors:', errors);

  return {
    type: 'vtt',
    cues,
    styles: styles.length > 0 ? styles : undefined,
    regions: regions.length > 0 ? regions : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}
