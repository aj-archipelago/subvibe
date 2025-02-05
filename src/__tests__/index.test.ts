import { parse } from '../index';
import { ParsedVTT } from '../types';

describe('parse', () => {
  test('parses SRT content', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello world!

2
00:00:04,500 --> 00:00:06,000
Second subtitle`;

    const result = parse(input);
    expect(result.type).toBe('srt');
    expect(result.cues).toHaveLength(2);
    expect(result.errors).toBeUndefined();
  });

  test('parses VTT content', () => {
    const input = `WEBVTT

00:01.000 --> 00:04.000
First subtitle

00:04.500 --> 00:06.000
Second subtitle`;

    const result = parse(input);
    expect(result.type).toBe('vtt');
    expect(result.cues).toHaveLength(2);
    expect(result.errors).toBeUndefined();
  });

  test('handles malformed content', () => {
    const input = `Invalid content
without proper timestamps`;

    const result = parse(input);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('handles empty input', () => {
    const result = parse('');
    expect(result.type).toBe('unknown');
    expect(result.cues).toHaveLength(0);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toBe('Empty subtitle content');
  });

  test('parses complex VTT with styling', () => {
    const input = `WEBVTT

STYLE
::cue {
  color: yellow;
}

00:01.000 --> 00:04.000
<v Speaker>Hello world!</v>`;

    const result = parse(input);
    expect(result.type).toBe('vtt');
    expect(result.cues).toHaveLength(1);
    
    // Type assertion since we've verified it's VTT
    const vttResult = result as ParsedVTT;
    expect(vttResult.styles).toBeDefined();
    expect(vttResult.styles![0]).toContain('color: yellow');
  });

  test('parses SRT with formatting', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
{\\b1}Bold{\\b0} and {\\i1}italic{\\i0}`;

    const result = parse(input);
    expect(result.type).toBe('srt');
    expect(result.cues).toHaveLength(1);
    expect(result.cues[0].text).toContain('{\\b1}Bold{\\b0}');
  });
}); 