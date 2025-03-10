import { SubtitleUtils } from '../utils';
import { SubtitleCue } from '../types';

describe('Subtitle Format Detection and Conversion', () => {
    const srtExample = `1
00:00:03,382 --> 00:00:04,952
كانت في مجزره مره في مدرسه السطاوي.
2
00:00:05,072 --> 00:00:07,872
كانت اول مجزره على مستوى قطاع غزة
3
00:00:08,012 --> 00:00:10,282
للمدارس الايواء.`;

    const vttExample = `WEBVTT

1
00:00:03.382 --> 00:00:04.952
كانت في مجزره مره في مدرسه السطاوي.

2
00:00:05.072 --> 00:00:07.872
كانت اول مجزره على مستوى قطاع غزة`;

    const arabicSrt = `1
00:00:03,382 --> 00:00:04,952
كانت في مجزره مره في مدرسه السطاوي.
2
00:00:05,072 --> 00:00:07,872
كانت اول مجزره على مستوى قطاع غزة
3
00:00:08,012 --> 00:00:10,282
للمدارس الايواء.
4
00:00:10,282 --> 00:00:13,072
ايامها تحركنا حوالي ست سبع اسعافات
5
00:00:13,182 --> 00:00:16,152
لما وصلنا مكان المجزره هذه.
6
00:00:16,262 --> 00:00:18,602
دخلنا في المدرسه ما يقارب ال 12 اسعاف
7
00:00:18,712 --> 00:00:21,002
من شده هول المشهد لقينا الناس فتات
8
00:00:21,062 --> 00:00:23,972
لقينا الناس رماد في الارض
9
00:00:24,012 --> 00:00:29,382
ما لهم لا ولا لهم يعني شقف عظام لحوم صغيره
10
00:00:29,452 --> 00:00:31,672
قعدنا نردد نصيح`;

    const srtWithoutBlankLines = `1
00:00:03,382 --> 00:00:04,952
First line
2
00:00:05,072 --> 00:00:07,872
Second line
3
00:00:08,012 --> 00:00:10,282
Third line`;

    const sequentialVtt = `WEBVTT

1
00:03.298 --> 00:04.578
كانت في مجزره

2
00:04.578 --> 00:06.178
مرت في مدرسه

3
00:06.178 --> 00:07.518
الصفطاوي كانت

4
00:07.518 --> 00:08.468
اول مجزره

5
00:08.468 --> 00:10.368
على مستوى قطاع`;

    describe('Format Detection', () => {
        test('detects SRT format correctly', () => {
            const result = SubtitleUtils.detectAndParse(srtExample);
            expect(result.type).toBe('srt');
            expect(result.cues).toHaveLength(3);
            expect(result.errors).toBeUndefined();
        });

        test('detects VTT format correctly', () => {
            const result = SubtitleUtils.detectAndParse(vttExample);
            expect(result.type).toBe('vtt');
            expect(result.cues).toHaveLength(2);
            expect(result.errors).toBeUndefined();
        });

        test('detects Arabic SRT format correctly', () => {
            const result = SubtitleUtils.detectAndParse(arabicSrt);
            expect(result.type).toBe('srt');
            expect(result.cues).toHaveLength(10);
            expect(result.errors).toBeUndefined();
        });

        test('returns unknown for plain text', () => {
            const result = SubtitleUtils.detectAndParse('This is just some plain text\nwithout any timestamps or subtitle formatting.\nIt should not be detected as any subtitle format.');
            expect(result.type).toBe('unknown');
            expect(result.cues).toHaveLength(0);
            expect(result.errors).toBeDefined();
        });

        test('handles empty input', () => {
            const result = SubtitleUtils.detectAndParse('');
            expect(result.type).toBe('unknown');
            expect(result.cues).toHaveLength(0);
            expect(result.errors).toBeDefined();
            expect(result.errors![0].message).toBe('Empty subtitle content');
        });

        test('detects VTT format with sequential numbers and short timestamps', () => {
            const result = SubtitleUtils.detectAndParse(sequentialVtt);
            expect(result.type).toBe('vtt');
            expect(result.cues).toHaveLength(5);
            expect(result.errors).toBeUndefined();
        });

        test('detects VTT format embedded in markdown code block', () => {
            const markdownVtt = `
# Sample Subtitle

Here is an example of VTT in a markdown code block:

\`\`\`vtt
WEBVTT

00:00:01.916 --> 00:00:04.636
It's here to change the game.

00:00:06.296 --> 00:00:11.166
With the power of AI, transforming the future.
\`\`\`
`;
            const result = SubtitleUtils.detectAndParse(markdownVtt);
            expect(result.type).toBe('vtt');
            expect(result.cues).toHaveLength(2);
            expect(result.errors).toBeUndefined();
        });

        test('detects SRT format embedded in markdown code block', () => {
            const markdownSrt = `
# Sample Subtitle

Here is an example of SRT in a markdown code block:

\`\`\`srt
1
00:00:01,916 --> 00:00:04,636
It's here to change the game.

2
00:00:06,296 --> 00:00:11,166
With the power of AI, transforming the future.
\`\`\`
`;
            const result = SubtitleUtils.detectAndParse(markdownSrt);
            expect(result.type).toBe('srt');
            expect(result.cues).toHaveLength(2);
            expect(result.errors).toBeUndefined();
        });
    });

    describe('Format Conversion and Normalization', () => {
        test('converts SRT to VTT format correctly', () => {
            // First parse as SRT
            const parsed = SubtitleUtils.detectAndParse(srtExample);
            expect(parsed.type).toBe('srt');

            // Then normalize to VTT format
            const normalized = SubtitleUtils.normalize(parsed.cues, { format: 'vtt' });
            
            // Check the first cue
            expect(normalized[0]).toMatchObject({
                index: 1,
                startTime: 3382,
                endTime: 4952
            });
            expect(normalized[0].text).toBe('كانت في مجزره مره في مدرسه السطاوي.');
        });

        test('handles SRT without blank lines', () => {
            const parsed = SubtitleUtils.detectAndParse(srtWithoutBlankLines);
            expect(parsed.type).toBe('srt');
            expect(parsed.cues).toHaveLength(3);

            const normalized = SubtitleUtils.normalize(parsed.cues, { 
                format: 'vtt',
                cleanupSpacing: true 
            });

            expect(normalized[0].text).toBe('First line');
            expect(normalized[1].text).toBe('Second line');
            expect(normalized[2].text).toBe('Third line');
        });

        test('preserves VTT format when normalizing', () => {
            const parsed = SubtitleUtils.detectAndParse(sequentialVtt);
            expect(parsed.type).toBe('vtt');

            const normalized = SubtitleUtils.normalize(parsed.cues, { format: 'vtt' });
            
            // Check timing conversion
            expect(normalized[0].startTime).toBe(3298);
            expect(normalized[0].endTime).toBe(4578);
            expect(normalized[0].text).toBe('كانت في مجزره');
            
            // Verify sequential numbers are preserved through index property
            expect(normalized[0].index).toBe(1);
            expect(normalized[1].index).toBe(2);
        });

        test('handles format conversion with timing fixes', () => {
            const shortDurationCues: SubtitleCue[] = [
                {
                    index: 1,
                    startTime: 0,
                    endTime: 100, // Too short duration
                    text: 'First line'
                },
                {
                    index: 2,
                    startTime: 90, // Overlaps with previous
                    endTime: 3000,
                    text: 'Second line'
                }
            ];

            const normalized = SubtitleUtils.normalize(shortDurationCues, { 
                format: 'vtt',
                fixTimings: true,
                minimumDuration: 500,
                minimumGap: 40
            });

            // Check timing fixes
            expect(normalized[0].endTime - normalized[0].startTime).toBeGreaterThanOrEqual(500);
            expect(normalized[1].startTime - normalized[0].endTime).toBeGreaterThanOrEqual(40);
        });
    });
}); 