import { SubtitleUtils } from '../utils';
import { SubtitleCue } from '../types';

describe('SubtitleUtils', () => {
  describe('shiftTime', () => {
    test('shifts all subtitles forward', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 2000, text: 'First' },
        { index: 2, startTime: 3000, endTime: 4000, text: 'Second' }
      ];

      const shifted = SubtitleUtils.shiftTime(cues, { offset: 1000 });
      expect(shifted[0].startTime).toBe(2000);
      expect(shifted[1].endTime).toBe(5000);
    });

    test('shifts subtitles backward with minimum at 0', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 2000, text: 'First' },
        { index: 2, startTime: 3000, endTime: 4000, text: 'Second' }
      ];

      const shifted = SubtitleUtils.shiftTime(cues, { offset: -2000 });
      expect(shifted[0].startTime).toBe(0);
      expect(shifted[1].startTime).toBe(1000);
    });

    test('shifts only within time range', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 2000, text: 'First' },
        { index: 2, startTime: 5000, endTime: 6000, text: 'Second' }
      ];

      const shifted = SubtitleUtils.shiftTime(cues, {
        offset: 1000,
        startAt: 3000,
        endAt: 7000
      });

      expect(shifted[0].startTime).toBe(1000); // Unchanged
      expect(shifted[1].startTime).toBe(6000); // Shifted
    });
  });

  describe('scaleTime', () => {
    test('scales subtitle timing', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 2000, text: 'First' },
        { index: 2, startTime: 3000, endTime: 4000, text: 'Second' }
      ];

      const scaled = SubtitleUtils.scaleTime(cues, { factor: 2 });
      expect(scaled[0].startTime).toBe(2000);
      expect(scaled[1].endTime).toBe(8000);
    });

    test('scales around anchor point', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 2000, text: 'First' }
      ];

      const scaled = SubtitleUtils.scaleTime(cues, { 
        factor: 2,
        anchor: 1500
      });

      expect(scaled[0].startTime).toBe(500);
      expect(scaled[0].endTime).toBe(2500);
    });
  });

  describe('mergeOverlapping', () => {
    test('merges overlapping subtitles', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 3000, text: 'First' },
        { index: 2, startTime: 2000, endTime: 4000, text: 'Second' }
      ];

      const merged = SubtitleUtils.mergeOverlapping(cues);
      expect(merged.length).toBe(1);
      expect(merged[0].endTime).toBe(4000);
      expect(merged[0].text).toContain('First');
      expect(merged[0].text).toContain('Second');
    });
  });

  describe('fixTimings', () => {
    test('ensures minimum duration', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 1100, text: 'Too short' }
      ];

      const fixed = SubtitleUtils.fixTimings(cues);
      expect(fixed[0].endTime - fixed[0].startTime).toBeGreaterThanOrEqual(500);
    });

    test('ensures minimum gap between subtitles', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 2000, text: 'First' },
        { index: 2, startTime: 2010, endTime: 3000, text: 'Too close' }
      ];

      const fixed = SubtitleUtils.fixTimings(cues);
      expect(fixed[1].startTime - fixed[0].endTime).toBeGreaterThanOrEqual(40);
    });
  });

  describe('validate', () => {
    test('detects timing issues', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 2000, endTime: 1000, text: 'Invalid timing' }
      ];

      const result = SubtitleUtils.validate(cues);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('detects empty subtitles', () => {
      const cues: SubtitleCue[] = [
        { index: 1, startTime: 1000, endTime: 2000, text: '   ' }
      ];

      const result = SubtitleUtils.validate(cues);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Empty subtitle');
    });
  });

  describe('stripFormatting', () => {
    test('removes various formatting tags', () => {
      const cues: SubtitleCue[] = [
        {
          index: 1,
          startTime: 1000,
          endTime: 2000,
          text: '<b>Bold</b> and {\\i1}italic{\\i0} and [some tag]'
        }
      ];

      const stripped = SubtitleUtils.stripFormatting(cues);
      expect(stripped[0].text).toBe('Bold and italic and');
    });
  });

  describe('parseLooseTime', () => {
    test('handles various timestamp formats', () => {
      const cases = [
        { input: '12:34', expected: 754000 },        // MM:SS
        { input: '1:23:45', expected: 5025000 },     // HH:MM:SS
        { input: '12.345', expected: 12345 },        // SS.ms
        { input: '1:23.456', expected: 83456 },      // MM:SS.ms
        { input: '1:23:45.678', expected: 5025678 }, // HH:MM:SS.ms
        { input: '12345', expected: 12345000 },      // Just seconds
        { input: '1h 23m', expected: 4980000 },      // Hour/minute format
        { input: '5m 35s', expected: 335000 },       // Minute/second format
        { input: "5'35\"", expected: 335000 },       // Alternative format
      ];

      cases.forEach(({ input, expected }) => {
        expect(SubtitleUtils.parseLooseTime(input)).toBe(expected);
      });
    });

    test('handles messy input', () => {
      const cases = [
        '12:34 something',
        'about 1:23:45',
        'starts at 12.345',
        '[1:23.456]',
        '(1:23:45.678)',
        'time = 12345',
      ];

      cases.forEach(input => {
        expect(SubtitleUtils.parseLooseTime(input)).not.toBeNull();
      });
    });
  });

  describe('looksLikeSubtitle', () => {
    test('detects various subtitle formats', () => {
      const validCases = [
        // Standard SRT
        '1\n00:00:01,000 --> 00:00:04,000\nHello world',
        
        // Messy but valid
        'random\n1:23 -> 4:56\nSome text',
        
        // Just timestamps and text
        '12:34 - 15:67\nLine one\nLine two',
        
        // Minimal format
        '1:23\nText',
        
        // Unconventional separators
        '1:23 to 4:56\nText',
        
        // Multiple timestamp lines
        '1:23\nText\n4:56\nMore text',
      ];

      validCases.forEach(input => {
        expect(SubtitleUtils.looksLikeSubtitle(input)).toBe(true);
      });

      const invalidCases = [
        'Just some text\nwithout timestamps',
        '12:34', // Single timestamp only
        'Random numbers 123 456',
      ];

      invalidCases.forEach(input => {
        expect(SubtitleUtils.looksLikeSubtitle(input)).toBe(false);
      });
    });
  });

  describe('normalize', () => {
    test('normalizes to strict SRT format', () => {
      const messy: SubtitleCue[] = [
        {
          index: 1,
          startTime: 0,
          endTime: 100,  // Too short duration
          text: '  First   line  \n  Second   line  '
        },
        {
          index: 2,
          startTime: 90,  // Overlaps with previous
          endTime: 3000,
          text: '<b>Bold</b> text'
        }
      ];

      const normalized = SubtitleUtils.normalize(messy, { format: 'srt' });
      
      // Check timing fixes
      expect(normalized[0].endTime - normalized[0].startTime).toBeGreaterThanOrEqual(500);
      expect(normalized[1].startTime - normalized[0].endTime).toBeGreaterThanOrEqual(40);
      
      // Check text cleanup
      expect(normalized[0].text).toBe('First line\nSecond line');
      expect(normalized[1].text).toBe('{\\b1}Bold{\\b0} text');
    });

    test('normalizes to strict VTT format', () => {
      const messy: SubtitleCue[] = [
        {
          index: 1,
          startTime: 1000,
          endTime: 10000,  // Too long duration
          text: '{\\b1}Bold{\\b0} and {\\i1}italic{\\i0}'
        },
        {
          index: 2,
          startTime: 9000,  // Overlaps with previous
          endTime: 12000,
          text: '   Multiple   \n   spaces   '
        }
      ];

      const normalized = SubtitleUtils.normalize(messy, { format: 'vtt' });
      
      // Check duration limit
      expect(normalized[0].endTime - normalized[0].startTime).toBeLessThanOrEqual(7000);
      
      // Check formatting conversion
      expect(normalized[0].text).toBe('<b>Bold</b> and <i>italic</i>');
      
      // Check spacing cleanup
      expect(normalized[1].text).toBe('Multiple\nspaces');
    });

    test('handles empty and stray text', () => {
      const messy: SubtitleCue[] = [
        {
          index: 1,
          startTime: 1000,
          endTime: 2000,
          text: ''  // Empty
        },
        {
          index: 2,
          startTime: 3000,
          endTime: 4000,
          text: '   \n  \n  '  // Just whitespace
        },
        {
          index: 3,
          startTime: 5000,
          endTime: 6000,
          text: 'Valid subtitle'
        }
      ];

      const normalized = SubtitleUtils.normalize(messy, {
        format: 'srt',
        removeEmpty: true
      });
      
      expect(normalized.length).toBe(1);
      expect(normalized[0].text).toBe('Valid subtitle');
    });

    test('preserves original timing information', () => {
      const cues: SubtitleCue[] = [
        {
          index: 1,
          startTime: 1000,
          endTime: 1200,  // Too short, will be adjusted
          text: 'Test'
        }
      ];

      const normalized = SubtitleUtils.normalize(cues, { format: 'srt' });
      
      expect(normalized[0].original).toBeDefined();
      expect(normalized[0].original!.startTime).toBe(1000);
      expect(normalized[0].original!.endTime).toBe(1200);
    });
  });
});

describe('SubtitleUtils Format Detection', () => {
  test('detects VTT format with header', () => {
    const input = `WEBVTT

1
00:01.000 --> 00:04.000
Hello world!`;

    const result = SubtitleUtils.detectAndParse(input);
    expect(result.type).toBe('vtt');
    expect(result.cues).toHaveLength(1);
    expect(result.errors).toBeUndefined();
  });

  test('detects SRT format with numeric index', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello world!`;

    const result = SubtitleUtils.detectAndParse(input);
    expect(result.type).toBe('srt');
    expect(result.cues).toHaveLength(1);
    expect(result.errors).toBeUndefined();
  });

  test('handles ambiguous format by choosing one with fewer errors', () => {
    const input = `00:01.000 --> 00:04.000
First subtitle

00:04.500 --> 00:06.000
Second subtitle`;

    const result = SubtitleUtils.detectAndParse(input);
    expect(['srt', 'vtt']).toContain(result.type);
    expect(result.cues).toHaveLength(2);
  });

  test('handles empty content', () => {
    const result = SubtitleUtils.detectAndParse('');
    expect(result.type).toBe('unknown');
    expect(result.cues).toHaveLength(0);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toBe('Empty subtitle content');
  });

  test('handles whitespace-only content', () => {
    const result = SubtitleUtils.detectAndParse('   \n  \t  \n   ');
    expect(result.type).toBe('unknown');
    expect(result.cues).toHaveLength(0);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toBe('Empty subtitle content');
  });
}); 