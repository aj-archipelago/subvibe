import { build } from '../index';

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
});
