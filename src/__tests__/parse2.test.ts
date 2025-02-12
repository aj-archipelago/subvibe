import { parse } from '../index';

describe('parse with preserveIndexes option', () => {
    test('should preserve original indexes when option is set', () => {
        const srtContent = `35
00:00:04,500 --> 00:00:08,000
Second subtitle with
multiple lines`;

        const result = parse(srtContent, { preserveIndexes: true });
        expect(result.cues[0].index).toBe(35);
    });

    test('should use sequential indexes when preserveIndexes is false', () => {
        const srtContent = `35
00:00:04,500 --> 00:00:08,000
Second subtitle with
multiple lines`;

        const result = parse(srtContent, { preserveIndexes: false });
        expect(result.cues[0].index).toBe(1);
    });
});
