import { /* SubtitleCue, ParsedSubtitles, */ ParseError, ParsedVTT, VTTCueSettings, VTTRegion, /* VTTStyles, */ VTTVoice, ParseOptions, VTTSubtitleCue } from '../types';
import { parser as log } from '../utils/debug';
// const log = console.log; // Use direct console.log for this debugging session // Reverted

function normalizeTimestamp(originalTimestamp: string): string {
  let ts = originalTimestamp.trim().replace(',', '.');
  // Fix: If the timestamp ends with :xxx (where xxx is 3 digits), replace the last colon with a dot
  ts = ts.replace(/:(\d{3})(?!.*:\d)/, '.$1');
  let h = "00", m = "00", s = "00", ms = "000"; // Default to 00:00:00.000
  const mainParts = ts.split(':');

  if (mainParts.length === 3) { // Expected HH:MM:SS.ms or HH:MM:SSish (where SSish might contain ms)
    h = mainParts[0];
    m = mainParts[1];
    const lastPart = mainParts[2];
    if (lastPart.includes('.')) {
      const [sPart, msPartGiven] = lastPart.split('.', 2);
      s = sPart;
      ms = (msPartGiven || '').padEnd(3, '0');
    } else {
      if ((h === "00" || h === "0") && lastPart.length === 2 && /^\d+$/.test(lastPart) && parseInt(lastPart,10) > 59) {
        s = mainParts[1];
        ms = lastPart.padEnd(3,'0');
        m = "00";
      } else if ((h === "00" || h === "0") && lastPart.length === 3 && /^\d+$/.test(lastPart) && parseInt(mainParts[1], 10) < 60) {
        s = mainParts[1];
        ms = lastPart;
        m = "00";
      } else if ((h === "00" || h === "0") && parseInt(mainParts[1], 10) < 60 && lastPart.length === 2 && /^\d+$/.test(lastPart) && lastPart !== "00" ) {
        s = mainParts[1];
        ms = lastPart.padEnd(3, '0');
        m = "00";
      } else if (lastPart.length === 3 && /^\d+$/.test(lastPart)) {
        s = "00";
        ms = lastPart;
      } else if (lastPart.length <=2 && /^\d+$/.test(lastPart)) {
        s = lastPart;
        ms = "000";
      } else {
        s = "00"; 
        ms = lastPart.padEnd(3, '0');
        log(`[normalizeTimestamp] Ambiguous H:M:S case for ${originalTimestamp} (lastPart: ${lastPart}), interpreting as H:M:00.ms`);
      }
    }
  } else if (mainParts.length === 2) { // MM:SS.ms or MM:SS
    h = "00"; // No hour part explicitly given
    m = mainParts[0];
    const lastPart = mainParts[1];
    if (lastPart.includes('.')) {
      const [sPart, msPartGiven] = lastPart.split('.', 2);
      s = sPart;
      ms = (msPartGiven || '').padEnd(3, '0');
    } else { // MM:SS without ms
      s = lastPart;
      ms = "000";
    }
  } else if (mainParts.length === 1 && ts !== '') { // SS.ms or SS
    h = "00"; // No hour part
    m = "00"; // No minute part
    const lastPart = mainParts[0];
    if (lastPart.includes('.')) {
      const [sPart, msPartGiven] = lastPart.split('.', 2);
      s = sPart;
      ms = (msPartGiven || '').padEnd(3, '0');
    } else { // SS without ms
      s = lastPart;
      ms = "000";
    }
  } else if (ts.startsWith('.')) { // Handles case like ".500" meaning 0 seconds and 500ms
    h = "00"; m = "00"; s = "00";
    ms = ts.substring(1).padEnd(3, '0');
  }
  // else: malformed or empty string, returns "00:00:00.000"

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms.padEnd(3,'0')}`;
}

function parseTimestamp(timestamp: string): number {
  // log('[parseTimestamp] Input:', timestamp); // Reverted
  try {
    timestamp = normalizeTimestamp(timestamp);
    // log('[parseTimestamp] Normalized for regex:', timestamp); // Reverted
    const pattern = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/;
    const match = timestamp.match(pattern);
    
    if (!match) {
      // log('[parseTimestamp] Regex no match! Throwing error.'); // Reverted
      throw new Error('Invalid timestamp format (regex mismatch)');
    }

    const [, hours, minutes, seconds, milliseconds] = match;
    // log('[parseTimestamp] Regex match components:', { hours, minutes, seconds, milliseconds }); // Reverted
    const totalMs = (
      parseInt(hours, 10) * 3600000 +
      parseInt(minutes, 10) * 60000 +
      parseInt(seconds, 10) * 1000 +
      parseInt(milliseconds, 10)
    );

    // log('[parseTimestamp] Calculated totalMs:', totalMs); // Reverted
    if (isNaN(totalMs)) {
      // log('[parseTimestamp] totalMs is NaN! Throwing error.'); // Reverted
      throw new Error('Invalid time component resulting in NaN');
    }

    // Sanity check for unusual timestamps
    if (totalMs > 359999999) { // More than 99:59:59.999
      throw new Error('unusual timestamp value');
    }

    // log('[parseTimestamp] Output:', totalMs); // Reverted
    return totalMs;
  } catch (error) {
    // log('[parseTimestamp] Caught error:', error instanceof Error ? error.message : String(error)); // Reverted
    throw new Error(`Invalid timestamp format: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

function parseVTTTimestamp(timestamp: string): number {
  // log('[parseVTTTimestamp] Input:', timestamp); // Reverted
  // Enhance timestamp parsing to handle more VTT formats
  timestamp = timestamp.trim();
  
  // Handle percentage timestamps (e.g., 50%)
  if (timestamp.endsWith('%')) {
    const percent = parseFloat(timestamp);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      // log('[parseVTTTimestamp] Invalid percentage! Throwing error.'); // Reverted
      throw new Error('Invalid percentage timestamp');
    }
    // Convert to milliseconds assuming 100% = 24 hours
    const result = (percent / 100) * 24 * 3600000;
    // log('[parseVTTTimestamp] Percentage result:', result); // Reverted
    return result;
  }

  // Handle shortened formats
  const parts = timestamp.split(':');
  if (parts.length === 1) {
    // Format: ss.mmm
    const [seconds, milliseconds = '000'] = parts[0].split('.');
    const result = parseInt(seconds, 10) * 1000 + parseInt(milliseconds.padEnd(3, '0'), 10);
    // log('[parseVTTTimestamp] Short format (ss.mmm) result:', result); // Reverted
    if (isNaN(result)) {
        // log('[parseVTTTimestamp] Short format result is NaN! Throwing error.'); // Reverted
        throw new Error('Invalid short format timestamp (ss.mmm) resulting in NaN');
    }
    return result;
  }

  // log('[parseVTTTimestamp] Falling back to parseTimestamp with normalizeTimestamp'); // Reverted
  const finalResult = parseTimestamp(normalizeTimestamp(timestamp));
  // log('[parseVTTTimestamp] Final result from parseTimestamp fallback:', finalResult); // Reverted
  return finalResult;
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
      let identifier: string | undefined = undefined;
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
      
      let startTime: number;
      let endTime: number;
      let textFromMalformedTimestampLine = ""; 

      try {
        // log('[parseVTT] Attempting to parse startStr:', startStr); // Reverted
        startTime = parseVTTTimestamp(startStr);
        // log('[parseVTT] Successfully parsed startTime:', startTime); // Reverted
      } catch (startError) {
        // log('[parseVTT] Caught error parsing startStr:', startStr, startError instanceof Error ? startError.message : String(startError)); // Reverted
        errors.push({
            line: i + 1, 
            message: `Invalid VTT start time format or value "${startStr}"`,
            severity: 'error'
        });
        // Skip this problematic cue block by advancing i past potential text lines
        i++; // current line was the timestamp line
        // Advance past any text lines associated with this failed cue
        while (i < lines.length && lines[i]?.trim() !== '' && !lines[i].includes('-->') && !/^(WEBVTT|STYLE|REGION|NOTE)/.test(lines[i].trim()) && !/^\d+$/.test(lines[i].trim())) {
            log(`Skipping line ${i} of invalid cue (due to start time error): ${lines[i]}`);
            i++;
        }
        // If the loop above stopped because it hit a new cue's timestamp or identifier, 
        // we need to rewind `i` by one so the main loop can process it correctly.
        if (i < lines.length && (lines[i].includes('-->') || /^\d+$/.test(lines[i].trim()) || lines[i].trim() === '' || /^(STYLE|REGION|NOTE)/.test(lines[i].trim()) )) {
            // Check if the current line is not just an empty line that should be consumed by the main loop's empty line skipping logic
            // or if it's not a NOTE that the main loop would also handle.
            // Essentially, if it's a timestamp or identifier, we went one line too far.
            if (lines[i].includes('-->') || (/^\d+$/.test(lines[i].trim()) && lines[i].trim() !== '')) {
                 //Only rewind if it's a timestamp or a non-empty potential identifier
            }
            // No, the main loop's existing i++ and continue for empty/NOTE lines will handle it, or the next block processing.
            // The crucial part is that we don't want to re-increment `i` if the while loop consumed the last line of the file
            // or if it stopped on an empty line that the outer loop's `i++` will correctly handle.
            // The current `continue` will go to the next iteration of the main `while (i < lines.length)` loop,
            // where `i` will be evaluated. If we consumed text lines up to a new identifier/timestamp, 
            // the main loop should process that new identifier/timestamp line. 
            // The `i++` within the while loop for skipping text might have already positioned `i` correctly.
            // Let's simplify: the main loop increments `i` *after* processing or skipping a block.
            // If our while loop stops, `i` points to the line that made it stop.
            // This line will be processed by the next iteration of the main loop.
        }
        continue; // Continue to the next block in the main while loop
      }

      // If we reach here, startTime is valid.
      try {
        // log('[parseVTT] Attempting to parse endStr:', endStr); // Reverted
        endTime = parseVTTTimestamp(endStr);
        // log('[parseVTT] Successfully parsed endTime:', endTime); // Reverted
      } catch (endError) {
        // log('[parseVTT] Caught error parsing endStr:', endStr, endError instanceof Error ? endError.message : String(endError)); // Reverted
        errors.push({
            line: i + 1, // Error is on the timestamp line
            message: `Invalid VTT end time format or value "${endStr}"`,
            severity: 'error'
        });
        // Skip this problematic cue block by advancing i past potential text lines
        i++; // current line was the timestamp line
        // Advance past any text lines associated with this failed cue
        while (i < lines.length && lines[i]?.trim() !== '' && !lines[i].includes('-->') && !/^(WEBVTT|STYLE|REGION|NOTE)/.test(lines[i].trim()) && !/^\d+$/.test(lines[i].trim())) {
            log(`Skipping line ${i} of invalid cue (due to end time error): ${lines[i]}`);
            i++;
        }
        // Similar logic as above for startError, for potentially rewinding i.
        // However, simpler: the main loop will handle the line that `i` currently points to.
        continue; // Continue to the next block in the main while loop
      }

      // Parse settings
      const settings = parseVTTSettings(settingsParts.join(' '));

      // Parse text content
      i++;
      let text = '';
      if (textFromMalformedTimestampLine) {
        text = textFromMalformedTimestampLine;
      }

      while (i < lines.length) {
        const line = lines[i].trim();
        
        // Check if this line could be the start of a new cue
        // It's a new cue if it's empty, a numeric identifier, or contains a timestamp
        const isTimestampLine = line.includes('-->');
        const isPotentialIdentifier = /^\d+$/.test(line);
        const isEmptyLine = line === '';
        
        // If we encounter what looks like a new cue, stop collecting text
        if (isEmptyLine || isPotentialIdentifier || isTimestampLine) {
          break;
        }
        
        // Check if the next line could be a timestamp line
        // This helps with cases where a numeric identifier is immediately followed by a timestamp
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.includes('-->')) {
            // If current line is a potential identifier and next line is a timestamp,
            // this is likely the start of a new cue
            if (isPotentialIdentifier || /^\d+$/.test(line)) {
              break;
            }
          }
        }
        
        text += (text ? '\n' : '') + lines[i].trim();
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

      log('VTT PARSER DEBUG: Attempting to set identifier. Found file identifier:', identifier, 'options.preserveIndexes:', options.preserveIndexes);
      if (options.preserveIndexes && identifier && identifier.length > 0) {
        cue.identifier = identifier;
        log('VTT PARSER DEBUG: Set cue.identifier to:', cue.identifier);
      } else if (!options.preserveIndexes) {
        log('VTT PARSER DEBUG: Not setting identifier (preserveIndexes is false).');
      } else {
        log('VTT PARSER DEBUG: Not setting identifier (no file identifier found or preserveIndexes true but identifier undefined).');
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
