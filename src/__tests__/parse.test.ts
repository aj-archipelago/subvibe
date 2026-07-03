import { readFileSync } from 'fs';
import { join } from 'path';
import { parse, parseSRT, parseVTT } from '../index';

describe('parse function', () => {
    const srtContent = readFileSync(join(__dirname, 'fixtures/sample.srt'), 'utf-8');
    const vttContent = readFileSync(join(__dirname, 'fixtures/sample.vtt'), 'utf-8');

    test('should correctly parse SRT content', () => {
        const result = parse(srtContent, { preserveIndexes: true });
        
        expect(result.type).toBe('srt');
        expect(result.cues).toHaveLength(3);
        expect(result.cues[0]).toEqual({
            index: 1,
            startTime: 1000,
            endTime: 4000,
            text: 'First subtitle'
        });
    });

    test('should correctly parse VTT content', () => {
        const result = parse(vttContent, { preserveIndexes: true });
        
        expect(result.type).toBe('vtt');
        expect(result.cues).toHaveLength(3);
        expect(result.cues[1]).toEqual({
            index: 2,
            identifier: '35',
            startTime: 4500,
            endTime: 8000,
            text: 'Second subtitle with\nmultiple lines'
        });
    });

    test('should use sequential indexes when preserveIndexes is false', () => {
        const result = parse(vttContent, { preserveIndexes: false });
        
        expect(result.type).toBe('vtt');
        expect(result.cues).toHaveLength(3);
        expect(result.cues[1].index).toBe(2);
    });

    test('should handle invalid content', () => {
        const result = parse('invalid content');
        
        expect(result.type).toBe('unknown');
        expect(result.cues).toHaveLength(0);
        expect(result.errors).toBeDefined();
    });

    test('should handle non-string runtime input', () => {
        expect(() => parse(null as any)).not.toThrow();

        const result = parse(null as any);
        expect(result.type).toBe('unknown');
        expect(result.cues).toHaveLength(0);
        expect(result.errors?.[0].message).toBe('Input must be a string');
    });

    test('should handle direct parser non-string runtime input', () => {
        expect(parseSRT(null as any)).toMatchObject({
            type: 'srt',
            cues: [],
            errors: [{ line: 1, message: 'Input must be a string', severity: 'error' }]
        });
        expect(parseVTT(null as any)).toMatchObject({
            type: 'vtt',
            cues: [],
            errors: [{ line: 1, message: 'Input must be a string', severity: 'error' }]
        });
    });
});
