import { build } from '../index';
import { parse } from '../index';
import fs from 'fs';
import path from 'path';

describe('build function', () => {
    const testCues = [
        { index: 1, startTime: 1000, endTime: 4000, text: 'First' },
        { index: 35, startTime: 4500, endTime: 8000, text: 'Second' },
        { index: 77, startTime: 8500, endTime: 12000, text: 'Third' }
    ];

    test('should build SRT with preserved indexes', () => {
        const result = build(testCues, { format: 'srt', preserveIndexes: true });
        
        expect(result).toContain('35');
        expect(result).toContain('77');
        expect(result).toMatch(/35\n00:00:04,500 --> 00:00:08,000\nSecond/);
    });

    test('should build SRT with sequential indexes', () => {
        const result = build(testCues, { format: 'srt' });
        
        expect(result).not.toContain('35');
        expect(result).toMatch(/2\n00:00:04,500 --> 00:00:08,000\nSecond/);
    });

    test('should build VTT with preserved indexes', () => {
        const result = build(testCues, { format: 'vtt', preserveIndexes: true });
        
        expect(result).toContain('WEBVTT');
        expect(result).toContain('35');
        expect(result).toMatch(/35\n00:04\.500 --> 00:08\.000\nSecond/);
    });

    test('should build plain text', () => {
        const result = build(testCues, { format: 'text' });
        
        expect(result).toBe('First\n\nSecond\n\nThird');
    });

    test('should support legacy string format parameter', () => {
        const result = build(testCues, 'srt');
        
        expect(result).toMatch(/1\n00:00:01,000 --> 00:00:04,000\nFirst/);
        expect(result).toMatch(/2\n00:00:04,500 --> 00:00:08,000\nSecond/);
    });

    test('should handle ParsedSubtitles input', () => {
        const parsedInput = {
            type: 'srt' as const,
            cues: testCues
        };
        
        const result = build(parsedInput);
        expect(result).toMatch(/1\n00:00:01,000 --> 00:00:04,000\nFirst/);
    });

    test('should respect input type when no format specified', () => {
        const parsedInput = {
            type: 'vtt' as const,
            cues: testCues
        };
        
        const result = build(parsedInput);
        expect(result).toContain('WEBVTT');
        expect(result).toMatch(/1\n00:01\.000 --> 00:04\.000\nFirst/);
    });

    test('should override input type with format option', () => {
        const parsedInput = {
            type: 'vtt' as const,
            cues: testCues
        };
        
        const result = build(parsedInput, { format: 'srt' });
        expect(result).not.toContain('WEBVTT');
        expect(result).toMatch(/1\n00:00:01,000 --> 00:00:04,000\nFirst/);
    });

    test('should handle numeric text content correctly', () => {
        const numericCues = [
            { index: 378, startTime: 227220, endTime: 228220, text: 'حرب' },
            { index: 379, startTime: 228220, endTime: 228620, text: '73' },
            { index: 380, startTime: 228620, endTime: 229120, text: 'حصل' }
        ];
        
        const result = build(numericCues, { format: 'srt', preserveIndexes: true });
        expect(result).toMatch(/379\n00:03:48,220 --> 00:03:48,620\n73/);
    });

    test('should rebuild subtitle file with numeric content', () => {
        const filePath = path.join(__dirname, 'fixtures', 'numeric-content.srt');
        const original = fs.readFileSync(filePath, 'utf8');
        const parsed = parse(original);
        const rebuilt = build(parsed); // Using default sequential numbering
        
        // Normalize line endings and whitespace for comparison
        const normalizeStr = (str: string) => str.replace(/\r\n/g, '\n').trim();
        expect(normalizeStr(rebuilt)).toBe(normalizeStr(original));
        
        // Specific check for the numeric content
        expect(parsed.cues[1].text).toBe('73');
        expect(rebuilt).toContain('2\n00:03:48,220 --> 00:03:48,620\n73');
    });

    test('should rebuild sublong.srt identical to original', () => {
        const filePath = path.join(__dirname, 'fixtures', 'sublong.srt');
        const original = fs.readFileSync(filePath, 'utf8');
        const parsed = parse(original);
        const rebuilt = build(parsed);
        
        // Normalize line endings and whitespace for comparison
        const normalizeStr = (str: string) => str.replace(/\r\n/g, '\n').trim();
        expect(normalizeStr(rebuilt)).toBe(normalizeStr(original));
    });

    test('should return empty text for invalid runtime input', () => {
        expect(() => build(null as any, { format: 'text' })).not.toThrow();
        expect(() => build({} as any, { format: 'text' })).not.toThrow();
        expect(() => build('not cues' as any, { format: 'text' })).not.toThrow();

        expect(build(null as any, { format: 'text' })).toBe('');
        expect(build({} as any, { format: 'text' })).toBe('');
        expect(build('not cues' as any, { format: 'text' })).toBe('');
    });

    test('should filter malformed cues without dropping valid cues', () => {
        const parsedInput = {
            type: 'srt' as const,
            cues: [
                { index: 1, startTime: 0, endTime: 1000, text: 'Keep me' },
                { index: 2, startTime: 1000, endTime: 'bad', text: 'Drop me' },
                { index: 3, startTime: 2000, endTime: 3000, text: 123 }
            ]
        };

        expect(build(parsedInput as any, { format: 'text' })).toBe('Keep me\n\n123');
    });

    test('should filter malformed cues for subtitle output', () => {
        const cues = [
            { index: 10, startTime: 0, endTime: 1000, text: 'Keep me' },
            { index: 11, startTime: NaN, endTime: 2000, text: 'Drop me' },
            { index: 12, startTime: 2000, endTime: 3000, text: null }
        ];

        const result = build(cues as any, { format: 'srt', preserveIndexes: true });

        expect(result).toContain('10\n00:00:00,000 --> 00:00:01,000\nKeep me');
        expect(result).not.toContain('Drop me');
        expect(result).not.toContain('NaN');
    });
});
