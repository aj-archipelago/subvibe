import { parseVTT } from '../vtt/parser';
import { generateVTT } from '../vtt/generator';
import { ParsedVTT, VTTSubtitleCue } from '../types';
import { build, parse } from '../index';
import * as fs from 'fs';
import * as path from 'path';

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
    expect(result.cues).toHaveLength(3);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
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

  test('handles VTT with H:M:S-like timestamp without a dot correctly', () => {
    const vttContent = `WEBVTT

1
00:00:00.383 --> 00:00:04.503
If you just have your cursor on a line, hit Ctrl+C and Ctrl+V, it\\'ll copy that line.

2
00:04.503 --> 00:08.553
You can also use Ctrl+X to delete an entire line.

3
00:08.553 --> 00:13.673
A similar way to do something like this would be the Alt button plus the arrow keys, that allows you to move lines up and down.

4
00:13.673 --> 00:18:93
or Alt+Shift and the arrow keys and that allows you to duplicate lines up and down.

5
00:18.93 --> 00:25.603
You ca…ame a variable in a small scope.

10
00:42.603 --> 00:47.903
Now the Ctrl+P command allows you to search for files and open them up so we can switch between our files.

11
00:47.903 --> 00:52.893
Ctrl+Shift+P allows you to run different commands from VS Code, so I can open up my settings, for example.

12
00:53.123 --> 00:59.723
And finally, you can hit Ctrl+the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out a...`;

    const result = parseVTT(vttContent);
    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(8);

    expect(result.cues[0].identifier).toBe('1');
    expect(result.cues[0].startTime).toBe(383);
    expect(result.cues[0].endTime).toBe(4503);

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(13673);
    expect(result.cues[3].endTime).toBe(18930);

    expect(result.cues[4].identifier).toBe('5');
    expect(result.cues[4].startTime).toBe(18930);
    expect(result.cues[4].endTime).toBe(25603);
    
    expect(result.cues[5].identifier).toBe('10');
    expect(result.cues[5].startTime).toBe(42603);
    expect(result.cues[5].endTime).toBe(47903);

    expect(result.cues[7].identifier).toBe('12');
    expect(result.cues[7].startTime).toBe(53123);
    expect(result.cues[7].endTime).toBe(59723);
    expect(result.cues[7].text).toBe("And finally, you can hit Ctrl+the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out a...");
  });

  test('handles VTT with non-sequential identifiers and multi-line text correctly', () => {
    const vttContent = `WEBVTT

1
00:00:00.000 --> 00:00:04.500
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.500 --> 00:07:570
You can also use control X to delete an entire line.

3
00:07:570 --> 00:18:910
A similar way to do something like this would be the alt button plus the arrow keys that allows you to move lines up and down, or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.

4
00:18:910 --> 00:25:540
You can also…ble in a small scope.

7
00:42:620 --> 00:47:400
Now the control P command allows you to search for files and open them up, so we can switch between our files.

8
00:47:400 --> 00:52:590
Control Shift P allows you to run different commands from VS Code, so I can open up my settings for example.

9
00:53:090 --> 01:00:300
And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at on...`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(7);

    expect(result.cues[0].identifier).toBe('1');
    expect(result.cues[0].startTime).toBe(0);
    expect(result.cues[0].endTime).toBe(4500);
    expect(result.cues[0].text).toBe("So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.");

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(18910);
    expect(result.cues[3].endTime).toBe(25540);
    expect(result.cues[3].text).toBe("You can also…ble in a small scope.");

    expect(result.cues[4].identifier).toBe('7');
    expect(result.cues[4].startTime).toBe(42620);
    expect(result.cues[4].endTime).toBe(47400);

    expect(result.cues[6].identifier).toBe('9');
    expect(result.cues[6].startTime).toBe(53090);
    // Robust parser: ambiguous timestamp '01:00:300' is interpreted as 1 minute, 0.3 seconds (60300 ms)
    expect(result.cues[6].endTime).toBe(60300);
    expect(result.cues[6].text).toBe("And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at on...");
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
          startTime: 1000,
          endTime: 4000,
          text: 'No hours'
        },
        {
          index: 2,
          startTime: 3600000,
          endTime: 3605000,
          text: 'With hours'
        }
      ]
    };

    const output = generateVTT(vtt);
    expect(output).toContain('00:01.000 --> 00:04.000');
    expect(output).toContain('01:00:00.000 --> 01:00:05.000');
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
    expect(result.cues[0].startTime).toBe(90000);
    expect(result.cues[0].endTime).toBe(165500);
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
    
    expect(rebuilt).not.toBe(input);
    expect(rebuilt).toContain('1\n00:00.000 --> 00:07.000\nIt\'s here to change the game.');
    expect(rebuilt).toContain('2\n00:07.000 --> 00:11.360\nWith the power of AI transforming the future.');
  });
});

describe('VTT Parser Edge Cases', () => {
  test('parses VTT file with no empty lines', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'subnospacing.vtt');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    
    const result = parseVTT(content);
    
    expect(result.type).toBe('vtt');
    expect(result.errors).toBeUndefined();
    expect(result.cues).toBeDefined();
    expect(result.cues.length).toBeGreaterThan(0);
    
    expect(result.cues[0]).toMatchObject({
      index: 1,
      identifier: '1',
      startTime: 424,
      endTime: 1464,
      text: 'The end of programming'
    });
    
    expect(result.cues[4]).toMatchObject({
      index: 5,
      identifier: '5',
      startTime: 5844,
      endTime: 10044,
      text: 'I went and checked the length of this and if this is new, it is new.'
    });
    
    expect(result.cues[82]).toMatchObject({
      index: 83,
      identifier: '83',
      startTime: 356024,
      endTime: 357884,
      text: 'Pretty fantastic.'
    });
  });

  test('handles malformed timestamp line and recovers to parse subsequent cues', () => {
    const vttContent = `WEBVTT

1
00:00:00.519 --> 00:00:04.249
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.249 --> 00:08:249
You can also use control X to delete an entire line.

3
00:08:249 --> 00:13:779
A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down.

4
00:13:779 --> 00:18:739
Or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.

5
00:19:00…e in a small scope.

8
00:42:399 --> 00:47:569
Now the control P command allows you to search for files and open them up, so we can switch between our files.

9
00:47:729 --> 00:52:699
Control Shift P allows you to run different commands from VS Code, so I can open up my settings, for example.

10
00:53:199 --> 00:59:979
And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at...`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].message).toBe('Invalid timestamp format');
    expect(result.errors![0].line).toBe(20);

    expect(result.cues).toHaveLength(7);

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(13779);
    expect(result.cues[3].endTime).toBe(18739);

    expect(result.cues[4].identifier).toBe('8');
    expect(result.cues[4].startTime).toBe(42399);
    expect(result.cues[4].endTime).toBe(47569);

    const parsedText = result.cues[6].text;
    const expectedText = "And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at...";
    expect(parsedText).toBe(expectedText);
  });

  test('handles another malformed timestamp line (starting with 0…) and recovers', () => {
    const vttContent = `WEBVTT

1
00:00:00.346 --> 00:00:04.386
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.386 --> 00:07:57.246
You can also use control X to delete an entire line.

3
00:07:57.246 --> 00:13:916
A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down.

4
00:13:916 --> 00:18:746
Or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.

5
0…e in a small scope.

8
00:42:706 --> 00:47:816
Now the control P command allows you to search for files and open them up, so we can switch between our files.

9
00:47:816 --> 00:52:796
Control shift P allows you to run different commands from VS code, so I can open up my settings for example.

10
00:53:006 --> 00:59:806
And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at...`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].message).toBe('Invalid timestamp format');
    expect(result.errors![0].line).toBe(20);

    expect(result.cues).toHaveLength(7);

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(13916);
    expect(result.cues[3].endTime).toBe(18746);

    expect(result.cues[4].identifier).toBe('8');
    expect(result.cues[4].startTime).toBe(42706);
    expect(result.cues[4].endTime).toBe(47816);

    const parsedText = result.cues[6].text;
    const expectedText = "And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at...";
    expect(parsedText).toBe(expectedText);
  });

  test('handles cues where text is not followed by an empty line before next cue', () => {
    const vttContent = `WEBVTT

1
00:00:00.575 --> 00:00:04.775
If you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.775 --> 00:08:095
You can also use control X to delete an entire line. A similar way to do something like this would be the Alt button plus the arrow keys,

3
00:08:095 --> 00:14:405
that allows you to move lines up and down, or Alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.

4
00:14:405 --> 00:25:175
You can also … in a small scope.

7
00:42:605 --> 00:47:775
Now, the control P command allows you to search for files and open them up, so we can switch between our files.

8
00:47:775 --> 00:52:705
Control Shift P allows you to run different commands from VS Code, so I can open up my settings for example.

9
00:52:975 --> 00:59:915
And finally, you can hit control plus the forward slash key, and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at on...`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(7);

    expect(result.cues[0].identifier).toBe('1');
    expect(result.cues[0].startTime).toBe(575);
    expect(result.cues[0].text).toBe("If you just have your cursor on a line, hit control C and control V, it\'ll copy that line.");

    expect(result.cues[1].identifier).toBe('2');
    expect(result.cues[1].startTime).toBe(4775);
    expect(result.cues[1].endTime).toBe(8095);
    expect(result.cues[1].text).toBe("You can also use control X to delete an entire line. A similar way to do something like this would be the Alt button plus the arrow keys,");

    expect(result.cues[2].identifier).toBe('3');
    expect(result.cues[2].startTime).toBe(8095);
    expect(result.cues[2].endTime).toBe(14405);
    expect(result.cues[2].text).toBe("that allows you to move lines up and down, or Alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.");

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].text).toBe("You can also … in a small scope.");

    expect(result.cues[4].identifier).toBe('7');
    expect(result.cues[4].startTime).toBe(42605);

    expect(result.cues[6].identifier).toBe('9');
    expect(result.cues[6].startTime).toBe(52975);
    expect(result.cues[6].endTime).toBe(59915);
    const parsedText = result.cues[6].text;
    const expectedText = "And finally, you can hit control plus the forward slash key, and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at on...";
    console.log('PARSED TEXT JSON:', JSON.stringify(parsedText));
    console.log('EXPECTED TEXT JSON:', JSON.stringify(expectedText));
    console.log('PARSED LENGTH:', parsedText.length);
    console.log('EXPECTED LENGTH:', expectedText.length);
    if (parsedText.length === expectedText.length && parsedText !== expectedText) {
      for (let k = 0; k < parsedText.length; k++) {
        if (parsedText.charCodeAt(k) !== expectedText.charCodeAt(k)) {
          console.log(`Char diff at index ${k}: Parsed=${parsedText.charCodeAt(k)} (${parsedText[k]}), Expected=${expectedText.charCodeAt(k)} (${expectedText[k]})`);
        }
      }
    } else if (parsedText.length !== expectedText.length) {
      console.log('LENGTHS DIFFER');
    }
    expect(parsedText).toBe(expectedText);
  });

  test('handles another VTT content with potential parsing issues', () => {
    const vttContent = `WEBVTT

1
00:00:00.488 --> 00:00:04.728
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:05.138 --> 00:00:08.038
You can also use control X to delete an entire line.

3
00:00:08.038 --> 00:09:488
A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down, or alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.

4
00:09:988 --> 00:25:538
You …le in a small scope.

7
00:42:828 --> 00:47:888
Now the control P command allows you to search for files and open them up, so we can switch between our files.

8
00:48:088 --> 00:52:648
Control shift P allows you to run different commands from VS code, so I can open up my settings for example.

9
00:53:068 --> 00:59:788
And finally, you can hit control plus the forward slash key, and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at on...`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(7);

    expect(result.cues[0].identifier).toBe('1');
    expect(result.cues[0].startTime).toBe(488);
    expect(result.cues[0].endTime).toBe(4728);
    expect(result.cues[0].text).toBe("So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.");

    expect(result.cues[1].identifier).toBe('2');
    expect(result.cues[1].startTime).toBe(5138);
    expect(result.cues[1].endTime).toBe(8038);
    expect(result.cues[1].text).toBe("You can also use control X to delete an entire line.");

    expect(result.cues[2].identifier).toBe('3');
    expect(result.cues[2].startTime).toBe(8038);
    expect(result.cues[2].endTime).toBe(9488);
    expect(result.cues[2].text).toBe("A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down, or alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.");

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(9988);
    expect(result.cues[3].endTime).toBe(25538);
    expect(result.cues[3].text).toBe("You …le in a small scope.");

    expect(result.cues[4].identifier).toBe('7');
    expect(result.cues[4].startTime).toBe(42828);
    expect(result.cues[4].endTime).toBe(47888);
    expect(result.cues[4].text).toBe("Now the control P command allows you to search for files and open them up, so we can switch between our files.");

    expect(result.cues[5].identifier).toBe('8');
    expect(result.cues[5].startTime).toBe(48088);
    expect(result.cues[5].endTime).toBe(52648);
    expect(result.cues[5].text).toBe("Control shift P allows you to run different commands from VS code, so I can open up my settings for example.");

    const parsedTextCue9 = result.cues[6].text;
    const expectedTextCue9 = "And finally, you can hit control plus the forward slash key, and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at on...";
    expect(parsedTextCue9).toBe(expectedTextCue9);
  });

  test('handles VTT with MM:SS:msms timestamps and more skipped cue IDs (1,2,3,4,8,9,10)', () => {
    const vttContent = `WEBVTT

1
00:00:00.111 --> 00:00:04.521
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.521 --> 00:00:08.091
You can also use control X to delete an entire line.

3
00:08:091 --> 00:17:971
A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down, or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.

4
00:17:971 --> 00:25:471
You can … in a small scope.

8
00:42:891 --> 00:47:921
Now, the control P command allows you to search for files and open them up, so we can switch between our files.

9
00:47:921 --> 00:52:991
Control Shift P allows you to run different commands from VS code, so I can open up my settings for example.

10
00:53:481 --> 00:59:961
And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at on...`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(7);

    expect(result.cues[0].identifier).toBe('1');
    expect(result.cues[0].startTime).toBe(111);
    expect(result.cues[0].endTime).toBe(4521);

    expect(result.cues[2].identifier).toBe('3');
    expect(result.cues[2].startTime).toBe(8091);
    expect(result.cues[2].endTime).toBe(17971);
    expect(result.cues[2].text).toContain("A similar way to do something like this");

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(17971);
    expect(result.cues[3].endTime).toBe(25471);
    expect(result.cues[3].text).toBe("You can … in a small scope.");

    expect(result.cues[4].identifier).toBe('8');
    expect(result.cues[4].startTime).toBe(42891);
    expect(result.cues[4].endTime).toBe(47921);

    const parsedText = result.cues[6].text;
    const expectedText = "And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at on...";
    expect(parsedText).toBe(expectedText);
  });

  test('handles malformed line for one cue and then skips to much later cue ID', () => {
    const vttContent = `WEBVTT

1
00:00:00.113 --> 00:00:04.333
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.673 --> 00:08:293
You can also use control X to delete an entire line.

3
00:08:413 --> 00:13:803
A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down.

4
00:14:103 --> 00:18:503
Or alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.

5
00:18:8…ntrol P command allows you to search for files and open them up.

11
00:46:463 --> 00:47:723
So we can switch between our files.

12
00:47:803 --> 00:52:523
Control shift P allows you to run different commands from VS code, so I can open up my settings for example.

13
00:53:073 --> 00:56:873
And finally, you can hit control plus the forward slash key and that allows you to comment out a line.

14
00:56:873 --> 00:59:763
Or if you highlight a bunch of code, you can comment it all ou...`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].message).toBe('Invalid timestamp format');
    expect(result.errors![0].line).toBe(20);

    expect(result.cues).toHaveLength(8);

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(14103);
    expect(result.cues[3].endTime).toBe(18503);

    expect(result.cues[4].identifier).toBe('11');
    expect(result.cues[4].startTime).toBe(46463);
    expect(result.cues[4].endTime).toBe(47723);
    expect(result.cues[4].text).toBe("So we can switch between our files.");

    const parsedText = result.cues[7].text;
    const expectedText = "Or if you highlight a bunch of code, you can comment it all ou...";
    expect(parsedText).toBe(expectedText);
  });

  test('handles VTT with potentially ambiguous short timestamps like MM:SS:xx', () => {
    const vttContent = `WEBVTT

1
00:00:00.391 --> 00:00:04.501
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.501 --> 00:08:491
You can also use control X to delete an entire line.

3
00:08:491 --> 00:13:981
A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down.

4
00:14:141 --> 00:18:651
Or alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.

5
00:18:911 --> 00:25:491
You can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.

6
00:25:811 --> 00:27:31
Another of my favorite shortcuts is control D.

7
00:27:31 --> 00:31:471
If you just have your cursor inside a word, hit control D, it\'s going to highlight that word.

8
00:31:471 --> 00:41:341
And another use for this is if you have anything highlighted, you click control D, it\'s going to highlight the next thing that has that same text and you can continue to do that over and over again, which is great if you need to rename a variable in a small scope.

9
00:42:11 --> 00:47:801
Now the control P command allows you to search for files and open them up, so we can switch between our files.

10
00:47:801 --> 00:52:441
Control Shift P allows you to run different commands from VS code, so I can open up my settings for example.

11
00:53:151 --> 00:59:551
${"And finally, you can hit control plus the forward slash key, and that allows you to comment out a line or if you highlight a bunch of code, you can comment it all out at once.".trim()}`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(11);

    expect(result.cues[4].identifier).toBe('5');
    expect(result.cues[4].startTime).toBe(18911);
    expect(result.cues[4].endTime).toBe(25491);
    expect(result.cues[4].text).toBe("You can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.");

    expect(result.cues[5].identifier).toBe('6');
    expect(result.cues[5].startTime).toBe(25811);
    expect(result.cues[5].endTime).toBe(27310);
    expect(result.cues[5].text).toBe("Another of my favorite shortcuts is control D.");

    expect(result.cues[6].identifier).toBe('7');
    expect(result.cues[6].startTime).toBe(27310);
    expect(result.cues[6].endTime).toBe(31471);

    expect(result.cues[8].identifier).toBe('9');
    expect(result.cues[8].startTime).toBe(42110);
    expect(result.cues[8].endTime).toBe(47801);

    const parsedText = result.cues[10].text;
    const expectedText = "And finally, you can hit control plus the forward slash key, and that allows you to comment out a line or if you highlight a bunch of code, you can comment it all out at once.";
    expect(parsedText).toBe(expectedText.trim());
  });

  test('handles VTT with full HH:MM:SS timestamp and mixed formats', () => {
    const vttContent = `WEBVTT

1
00:00:00.490 --> 00:00:04.500
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.500 --> 00:00:08.470
You can also use control X to delete an entire line.

3
00:00:08.470 --> 00:09:59.450
A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down, or alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.

4
00:09:59.450 --> 00:15:59.450
You can also use alt plus mouse click in order to select multiple lines, and then you can make changes on all those lines at once.

5
00:25:380 --> 00:31:500
Another of my favorite shortcuts is control D. If you just have your cursor inside of word, hit control D, it\'s going to highlight that word.

6
00:31:500 --> 00:38:750
And another use for this is if you have anything highlighted, you click control D, it\'s going to highlight the next thing that has that same text.

7
00:38:750 --> 00:42:390
And you can continue to do that over and over again.

8
00:42:390 --> 00:43:530
Which is great if you need to rename a variable in a small scope.

9
00:43:530 --> 00:47:690
Now the control P command allows you to search for files and open them up, so we can switch between our files.

10
00:47:690 --> 00:52:790
Control shift P allows you to run different commands from VS code, so I can open up my settings for example.

11
00:53:00 --> 00:59:860
And finally, you can hit control plus the forward slash key, and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(11);

    expect(result.cues[2].identifier).toBe('3');
    expect(result.cues[2].endTime).toBe(599450);

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(599450);
    expect(result.cues[3].endTime).toBe(959450);
        
    expect(result.cues[4].identifier).toBe('5');
    expect(result.cues[4].startTime).toBe(25380);
    expect(result.cues[4].endTime).toBe(31500);

    expect(result.cues[10].identifier).toBe('11');
    expect(result.cues[10].startTime).toBe(53000);
    expect(result.cues[10].endTime).toBe(59860);
    expect(result.cues[10].text).toBe("And finally, you can hit control plus the forward slash key, and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.");
  });

  test('parses VTT with standard HH:MM:SS.mmm timestamps and multi-line text', () => {
    const vttContent = `WEBVTT

1
00:00:00.541 --> 00:00:04.381
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.641 --> 00:00:08.111
You can also use control X to delete an entire line.

3
00:00:08.111 --> 00:00:18.911
A similar way to do something like this would be the Alt button plus the arrow keys that allows you to move lines up and down, or Alt plus Shift and the arrow keys and that allows you to duplicate lines up and down.

4
00:00:19.211 --> 00:00:25.471
You can also use Alt plus mouse click in order to select multiple lines, and then you can make changes on all those lines at once.

5
00:00:25.841 --> 00:00:39.871
Another of my favorite shortcuts is control D. If you just have your cursor inside a word, hit control D, it\'s going to highlight that word, and another use for this is if you have anything highlighted, you click control D, it\'s going to highlight the next thing that has that same text, and you can continue to do that over and over again.

6
00:00:40.061 --> 00:00:42.611
Which is great if you need to rename a variable in a small scope.

7
00:00:42.771 --> 00:00:46.451
Now the control P command allows you to search for files and open them up.

8
00:00:46.451 --> 00:00:52.401
So we can switch between our files, control Shift P allows you to run different commands from VS code, so I can open up my settings for example.

9
00:00:52.731 --> 00:01:00.401
And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(9);

    expect(result.cues[0].identifier).toBe('1');
    expect(result.cues[0].startTime).toBe(541);
    expect(result.cues[0].endTime).toBe(4381);
    expect(result.cues[0].text).toBe("So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.");

    expect(result.cues[1].identifier).toBe('2');
    expect(result.cues[1].startTime).toBe(4641);
    expect(result.cues[1].endTime).toBe(8111);
    expect(result.cues[1].text).toBe("You can also use control X to delete an entire line.");

    expect(result.cues[2].identifier).toBe('3');
    expect(result.cues[2].startTime).toBe(8111);
    expect(result.cues[2].endTime).toBe(18911);
    expect(result.cues[2].text).toBe("A similar way to do something like this would be the Alt button plus the arrow keys that allows you to move lines up and down, or Alt plus Shift and the arrow keys and that allows you to duplicate lines up and down.");

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(19211);
    expect(result.cues[3].endTime).toBe(25471);
    expect(result.cues[3].text).toBe("You can also use Alt plus mouse click in order to select multiple lines, and then you can make changes on all those lines at once.");

    expect(result.cues[4].identifier).toBe('5');
    expect(result.cues[4].startTime).toBe(25841);
    expect(result.cues[4].endTime).toBe(39871);
    expect(result.cues[4].text).toBe("Another of my favorite shortcuts is control D. If you just have your cursor inside a word, hit control D, it\'s going to highlight that word, and another use for this is if you have anything highlighted, you click control D, it\'s going to highlight the next thing that has that same text, and you can continue to do that over and over again.");

    expect(result.cues[5].identifier).toBe('6');
    expect(result.cues[5].startTime).toBe(40061);
    expect(result.cues[5].endTime).toBe(42611);
    expect(result.cues[5].text).toBe("Which is great if you need to rename a variable in a small scope.");

    expect(result.cues[6].identifier).toBe('7');
    expect(result.cues[6].startTime).toBe(42771);
    expect(result.cues[6].endTime).toBe(46451);
    expect(result.cues[6].text).toBe("Now the control P command allows you to search for files and open them up.");

    expect(result.cues[7].identifier).toBe('8');
    expect(result.cues[7].startTime).toBe(46451);
    expect(result.cues[7].endTime).toBe(52401);
    expect(result.cues[7].text).toBe("So we can switch between our files, control Shift P allows you to run different commands from VS code, so I can open up my settings for example.");

    expect(result.cues[8].identifier).toBe('9');
    expect(result.cues[8].startTime).toBe(52731);
    expect(result.cues[8].endTime).toBe(60401);
    expect(result.cues[8].text).toBe("And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.");
  });

  test('parses VTT with mixed HH:MM:SS.mmm and 00:SS:mmm like timestamps', () => {
    const vttContent = `WEBVTT

1
00:00:00.174 --> 00:00:04.834
So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.

2
00:00:04.834 --> 00:00:08.284
You can also use control X to delete an entire line.

3
00:08:284 --> 00:18:934
A similar way to do something like this would be the alt button plus the arrow keys that allows you to move lines up and down or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.

4
00:18:934 --> 00:25:404
You can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.

5
00:25:814 --> 00:32:084
Another of my favorite shortcuts is control D. If you just have your cursor inside of a word, hit control D, it\'s going to highlight that word.

6
00:32:084 --> 00:42:234
And another use for this is if you have anything highlighted, you click control D, it\'s going to highlight the next thing that has that same text and you can continue to do that over and over again, which is great if you need to rename a variable in a small scope.

7
00:42:234 --> 00:47:354
Now the control P command allows you to search for files and open them up, so we can switch between our files.

8
00:47:354 --> 00:52:824
Control Shift P allows you to run different commands from VS code so I can open up my settings for example.

9
00:53:164 --> 00:59:614
And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.`;

    const result = parseVTT(vttContent);

    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(9);

    expect(result.cues[0].identifier).toBe('1');
    expect(result.cues[0].startTime).toBe(174);
    expect(result.cues[0].endTime).toBe(4834);
    expect(result.cues[0].text).toBe("So if you just have your cursor on a line, hit control C and control V, it\'ll copy that line.");

    expect(result.cues[1].identifier).toBe('2');
    expect(result.cues[1].startTime).toBe(4834);
    expect(result.cues[1].endTime).toBe(8284);
    expect(result.cues[1].text).toBe("You can also use control X to delete an entire line.");

    expect(result.cues[2].identifier).toBe('3');
    expect(result.cues[2].startTime).toBe(8284);
    expect(result.cues[2].endTime).toBe(18934);
    expect(result.cues[2].text).toBe("A similar way to do something like this would be the alt button plus the arrow keys that allows you to move lines up and down or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.");

    expect(result.cues[3].identifier).toBe('4');
    expect(result.cues[3].startTime).toBe(18934);
    expect(result.cues[3].endTime).toBe(25404);
    expect(result.cues[3].text).toBe("You can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.");

    expect(result.cues[4].identifier).toBe('5');
    expect(result.cues[4].startTime).toBe(25814);
    expect(result.cues[4].endTime).toBe(32084);
    expect(result.cues[4].text).toBe("Another of my favorite shortcuts is control D. If you just have your cursor inside of a word, hit control D, it\'s going to highlight that word.");

    expect(result.cues[5].identifier).toBe('6');
    expect(result.cues[5].startTime).toBe(32084);
    expect(result.cues[5].endTime).toBe(42234);
    expect(result.cues[5].text).toBe("And another use for this is if you have anything highlighted, you click control D, it\'s going to highlight the next thing that has that same text and you can continue to do that over and over again, which is great if you need to rename a variable in a small scope.");

    expect(result.cues[6].identifier).toBe('7');
    expect(result.cues[6].startTime).toBe(42234);
    expect(result.cues[6].endTime).toBe(47354);
    expect(result.cues[6].text).toBe("Now the control P command allows you to search for files and open them up, so we can switch between our files.");

    expect(result.cues[7].identifier).toBe('8');
    expect(result.cues[7].startTime).toBe(47354);
    expect(result.cues[7].endTime).toBe(52824);
    expect(result.cues[7].text).toBe("Control Shift P allows you to run different commands from VS code so I can open up my settings for example.");

    expect(result.cues[8].identifier).toBe('9');
    expect(result.cues[8].startTime).toBe(53164);
    expect(result.cues[8].endTime).toBe(59614);
    expect(result.cues[8].text).toBe("And finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.");
  });

  test('parses VTT where three digits at the end are always ms', () => {
    const vttContent = `WEBVTT\n\n1\n00:00:00.296 --> 00:00:04.756\nIf you just have your cursor on a line, hit control C and control V, it'll copy that line.\n\n2\n00:00:04.756 --> 00:08:636\nYou can also use control X to delete an entire line. A similar way to do something like this\n\n3\n00:08:636 --> 00:13:406\nHi`;

    const result = parse(vttContent);
    expect(result.errors).toBeUndefined();
    expect(result.cues).toHaveLength(3);

    expect(result.cues[0].startTime).toBe(296);
    expect(result.cues[0].endTime).toBe(4756);
    expect(result.cues[0].text).toBe("If you just have your cursor on a line, hit control C and control V, it'll copy that line.");

    expect(result.cues[1].startTime).toBe(4756);
    expect(result.cues[1].endTime).toBe(8636);
    expect(result.cues[1].text).toBe("You can also use control X to delete an entire line. A similar way to do something like this");

    expect(result.cues[2].startTime).toBe(8636);
    expect(result.cues[2].endTime).toBe(13406);
    expect(result.cues[2].text).toBe("Hi");
  });
}); 