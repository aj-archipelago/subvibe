import { parseVTT } from '../vtt/parser';
import { generateVTT } from '../vtt/generator';
import { ParsedVTT, VTTSubtitleCue } from '../types';
import { build, parse } from '../index';

describe('VTT Parser', () => {
  test('parses valid VTT content with header', () => {
    const input = `WEBVTT

1
00:01.000 --> 00:04.000
Hello world!

2
00:04.500 --> 00:06.000
This is a test
subtitle file.

NOTE This is a comment

identifier3
00:06.500 --> 00:08.000
Goodbye!`;

    const result = parseVTT(input);
    expect(result.type).toBe('vtt');
    expect(result.cues).toHaveLength(3);
    expect(result.errors).toBeUndefined();
    
    expect(result.cues[0]).toEqual({
      index: 1,
      identifier: '1',
      startTime: 1000,
      endTime: 4000,
      text: 'Hello world!'
    });
  });

  test('handles VTT without header', () => {
    const input = `00:01.000 --> 00:04.000
First subtitle

00:04.500 --> 00:06.000
Second subtitle`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.errors).toBeUndefined();
  });

  test('handles cue settings', () => {
    const input = `WEBVTT

00:01.000 --> 00:04.000 position:50% line:63% align:middle
Subtitle with settings`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(1);
    expect(result.errors).toBeUndefined();
  });

  test('handles various timestamp formats', () => {
    const input = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hours included

1:23.400 --> 1:25.600
Hours omitted

05.600 --> 08.800
Minutes omitted`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(3);
    expect(result.errors).toBeUndefined();
  });

  test('handles malformed content', () => {
    const input = `WEBVTT

invalid --> 00:04.000
First

00:04.500 --> invalid
Second

00:06.500 --> 00:08.000
Valid`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(1);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBe(2);
  });

  test('handles metadata header', () => {
    const input = `WEBVTT - Title: My Subtitles
Kind: captions
Language: en

00:01.000 --> 00:04.000
First subtitle`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(1);
    expect(result.errors).toBeUndefined();
  });

  test('handles comments and notes', () => {
    const input = `WEBVTT

NOTE This is a comment
This is still part of the comment

00:01.000 --> 00:04.000
First subtitle

NOTE Another comment
00:04.500 --> 00:06.000
Second subtitle`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.errors).toBeUndefined();
  });

  test('handles non-numeric identifiers', () => {
    const input = `WEBVTT

intro
00:01.000 --> 00:04.000
First subtitle

chapter1
00:04.500 --> 00:06.000
Second subtitle`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.errors).toBeUndefined();
  });
});

describe('VTT Advanced Features', () => {
  test('parses style blocks', () => {
    const input = `WEBVTT

STYLE
::cue {
  background-color: yellow;
  color: black;
}

::cue(b) {
  color: red;
}

00:01.000 --> 00:04.000
This is <b>styled</b> text`;

    const result = parseVTT(input);
    expect(result.styles).toBeDefined();
    expect(result.styles!.length).toBe(1);
    expect(result.styles![0]).toContain('background-color: yellow');
  });

  test('parses region blocks', () => {
    const input = `WEBVTT

REGION
id=region1
width=40%
lines=3
regionanchor=0%,100%
viewportanchor=10%,90%
scroll=up

00:01.000 --> 00:04.000 region:region1
This text appears in the region`;

    const result = parseVTT(input);
    expect(result.regions).toBeDefined();
    expect(result.regions![0]).toEqual({
      id: 'region1',
      width: '40%',
      lines: 3,
      regionAnchor: '0%,100%',
      viewportAnchor: '10%,90%',
      scroll: 'up'
    });
    expect(result.cues[0].settings?.region).toBe('region1');
  });

  test('parses voice spans', () => {
    const input = `WEBVTT

00:01.000 --> 00:04.000
<v Roger Bingham>I'm Roger Bingham
<v Neil deGrasse Tyson>And I'm Neil deGrasse Tyson`;

    const result = parseVTT(input);
    expect(result.cues[0].voices).toBeDefined();
    expect(result.cues[0].voices!.length).toBe(2);
    expect(result.cues[0].voices![0]).toEqual({
      voice: 'Roger Bingham',
      text: "I'm Roger Bingham"
    });
  });

  test('handles complex cue settings', () => {
    const input = `WEBVTT

00:01.000 --> 00:04.000 vertical:rl line:90% align:start position:95%
Vertical text on the right`;

    const result = parseVTT(input);
    expect(result.cues[0].settings).toEqual({
      vertical: 'rl',
      line: '90%',
      align: 'start',
      position: '95%'
    });
  });

  test('handles percentage-based timestamps', () => {
    const input = `WEBVTT

00:01.000 --> 50%
Text until halfway`;

    const result = parseVTT(input);
    expect(result.cues[0].endTime).toBe(43200000); // 50% of 24 hours
  });

  test('handles shortened timestamp formats', () => {
    const input = `WEBVTT

1:30.500 --> 2:00.000
Minutes and seconds

5.000 --> 10.000
Just seconds`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.errors).toBeUndefined();
  });
});

describe('VTT Generator', () => {
  test('generates basic VTT content', () => {
    const vtt = {
      type: 'vtt' as const,
      cues: [
        { index: 1, startTime: 1000, endTime: 4000, text: 'Hello world!' },
        { index: 2, startTime: 5000, endTime: 8000, text: 'Second subtitle' }
      ]
    };

    const output = generateVTT(vtt);
    expect(output).toBe(
      'WEBVTT\n\n' +
      '1\n' +
      '00:01.000 --> 00:04.000\n' +
      'Hello world!\n\n' +
      '2\n' +
      '00:05.000 --> 00:08.000\n' +
      'Second subtitle\n'
    );
  });

  test('generates VTT with styles', () => {
    const vtt: ParsedVTT = {
      type: 'vtt',
      styles: [
        '::cue { color: yellow }',
        '::cue(b) { color: red }'
      ],
      cues: [{
        index: 1,
        startTime: 1000,
        endTime: 4000,
        text: 'Styled text'
      }]
    };

    const output = generateVTT(vtt);
    expect(output).toContain('STYLE\n::cue { color: yellow }');
    expect(output).toContain('STYLE\n::cue(b) { color: red }');
  });

  test('generates VTT with regions', () => {
    const vtt: ParsedVTT = {
      type: 'vtt',
      regions: [{
        id: 'region1',
        width: '40%',
        lines: 3,
        regionAnchor: '0%,100%',
        viewportAnchor: '10%,90%',
        scroll: 'up'
      }],
      cues: [{
        index: 1,
        startTime: 1000,
        endTime: 4000,
        text: 'Region text',
        settings: {
          region: 'region1'
        }
      }]
    };

    const output = generateVTT(vtt);
    expect(output).toContain('REGION\nid=region1');
    expect(output).toContain('width=40%');
    expect(output).toContain('region:region1');
  });

  test('generates VTT with cue settings', () => {
    const vtt: ParsedVTT = {
      type: 'vtt',
      cues: [{
        index: 1,
        startTime: 1000,
        endTime: 4000,
        text: 'Positioned text',
        settings: {
          vertical: 'rl',
          line: '90%',
          position: '95%',
          align: 'start'
        }
      }]
    };

    const output = generateVTT(vtt);
    expect(output).toContain('vertical:rl');
    expect(output).toContain('line:90%');
    expect(output).toContain('position:95%');
    expect(output).toContain('align:start');
  });

  test('generates VTT with voice spans', () => {
    const vtt: ParsedVTT = {
      type: 'vtt',
      cues: [{
        index: 1,
        startTime: 1000,
        endTime: 4000,
        text: 'Speaker text',
        voices: [
          { voice: 'Roger', text: "I'm Roger" },
          { voice: 'Neil', text: "And I'm Neil" }
        ]
      }]
    };

    const output = generateVTT(vtt);
    expect(output).toContain('<v Roger>I\'m Roger');
    expect(output).toContain('<v Neil>And I\'m Neil');
  });

  test('handles hour formatting correctly', () => {
    const vtt: ParsedVTT = {
      type: 'vtt',
      cues: [
        {
          index: 1,
          startTime: 1000,  // 1 second
          endTime: 4000,    // 4 seconds
          text: 'No hours'
        },
        {
          index: 2,
          startTime: 3600000,  // 1 hour
          endTime: 3605000,    // 1 hour and 5 seconds
          text: 'With hours'
        }
      ]
    };

    const output = generateVTT(vtt);
    expect(output).toContain('00:01.000 --> 00:04.000'); // mm:ss.ttt format
    expect(output).toContain('01:00:00.000 --> 01:00:05.000'); // hh:mm:ss.ttt format
  });

  test('handles custom identifiers', () => {
    const vtt = {
      type: 'vtt' as const,
      cues: [{
        index: 1,
        identifier: 'intro',
        startTime: 1000,
        endTime: 4000,
        text: 'Introduction'
      }]
    };

    const output = generateVTT(vtt);
    expect(output).toContain('intro\n00:01.000');
  });
});

describe('VTT Parser Timestamp Formats', () => {
  test('handles short timestamp formats (MM:SS.mmm)', () => {
    const input = `WEBVTT

1
01:30.000 --> 02:45.500
Short timestamp format`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(1);
    expect(result.cues[0].startTime).toBe(90000); // 1:30 in milliseconds
    expect(result.cues[0].endTime).toBe(165500); // 2:45.5 in milliseconds
    expect(result.errors).toBeUndefined();
  });

  test('handles ultra-short timestamp formats (SS.mmm)', () => {
    const input = `WEBVTT

1
03.298 --> 04.578
First line

2
04.578 --> 06.178
Second line`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0].startTime).toBe(3298);
    expect(result.cues[0].endTime).toBe(4578);
    expect(result.cues[1].startTime).toBe(4578);
    expect(result.cues[1].endTime).toBe(6178);
    expect(result.errors).toBeUndefined();
  });

  test('handles mixed timestamp formats in the same file', () => {
    const input = `WEBVTT

1
03.298 --> 04.578
First line

2
00:04.578 --> 00:06.178
Second line

3
00:00:06.178 --> 00:00:07.518
Third line`;

    const result = parseVTT(input);
    expect(result.cues).toHaveLength(3);
    expect(result.cues[0].startTime).toBe(3298);
    expect(result.cues[1].startTime).toBe(4578);
    expect(result.cues[2].startTime).toBe(6178);
    expect(result.errors).toBeUndefined();
  });
});


describe('VTT Parser/Builder', () => {
  const input = `WEBVTT

1
00:00.000 --> 00:07.000
It's here to change the game.

intro
00:07.000 --> 00:11.360
With the power of AI transforming the future.

question
00:11.360 --> 00:14.160
The possibilities endless.

00:14.160 --> 00:17.240
It's not just about the generative AI itself.
`;

  it('should preserve identifiers when preserveIndexes is true', () => {
    const parsed = parse(input, { preserveIndexes: true }) as ParsedVTT;
    const rebuilt = build(parsed, { preserveIndexes: true });
    
    expect(rebuilt).toBe(input);
    expect(parsed.type).toBe('vtt');
    expect(parsed.cues).toHaveLength(4);
    
    const [cue1, cue2, cue3, cue4] = parsed.cues as VTTSubtitleCue[];
    
    expect(cue1.identifier).toBe('1');
    expect(cue2.identifier).toBe('intro');
    expect(cue3.identifier).toBe('question');
    expect(cue4.identifier).toBeUndefined();
  });

  it('should override identifiers when preserveIndexes is false', () => {
    const parsed = parse(input, { preserveIndexes: false }) as ParsedVTT;
    const rebuilt = build(parsed, { preserveIndexes: false });
    
    expect(parsed.type).toBe('vtt');
    expect(parsed.cues).toHaveLength(4);
    
    // The rebuilt content should not match the input due to renumbering
    expect(rebuilt).not.toBe(input);
    // Verify the first cue in rebuilt content
    expect(rebuilt).toContain('1\n00:00.000 --> 00:07.000\nIt\'s here to change the game.');
    // Verify the second cue has been renumbered
    expect(rebuilt).toContain('2\n00:07.000 --> 00:11.360\nWith the power of AI transforming the future.');
  });
});