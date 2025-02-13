import { resync } from '../index';

describe('resync function', () => {
    const testCues = [
        { index: 1, startTime: 1000, endTime: 4000, text: 'First' },
        { index: 2, startTime: 4500, endTime: 8000, text: 'Second' },
        { index: 3, startTime: 8500, endTime: 12000, text: 'Third' }
    ];

    test('should shift all timestamps forward', () => {
        const shifted = resync(testCues, { offset: 2000 });
        
        expect(shifted[0].startTime).toBe(3000);
        expect(shifted[0].endTime).toBe(6000);
        expect(shifted[0].original).toEqual({
            startTime: 1000,
            endTime: 4000
        });
    });

    test('should shift all timestamps backward', () => {
        const shifted = resync(testCues, { offset: -1000 });
        
        expect(shifted[0].startTime).toBe(0);
        expect(shifted[1].startTime).toBe(3500);
    });

    test('should shift timestamps only after startAt', () => {
        const shifted = resync(testCues, { 
            offset: 1000,
            startAt: 5000
        });
        
        expect(shifted[0].startTime).toBe(1000); // unchanged
        expect(shifted[1].startTime).toBe(5500); // shifted
        expect(shifted[2].startTime).toBe(9500); // shifted
    });
});
