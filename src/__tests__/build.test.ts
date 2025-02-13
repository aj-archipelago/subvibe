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
});
