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

describe('resync with VTT cues and offset 0', () => {
  it('should not throw and cues should be unchanged', () => {
    const vttContent = `WEBVTT\n\n1\n00:00:00.447 --> 00:00:04.837\nSo if you just have your cursor on a line, hit control C and control V, it'll copy that line.\n\n2\n00:00:04.837 --> 00:08:037\nYou can also use control X to delete an entire line.\n\n3\n00:08:037 --> 00:13:627\nA similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down.\n\n4\n00:13:627 --> 00:18:887\nOr alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.\n\n5\n00:18:887 --> 00:25:537\nYou can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.\n\n6\n00:25:537 --> 00:30:677\nAnother of my favorite shortcuts is control D. If you just have your cursor inside a word, hit control D, it's going to highlight that word.\n\n7\n00:30:677 --> 00:39:417\nAnd another use for this is if you have anything highlighted, you click control D, it's going to highlight the next thing that has that same text and you can continue to do that over and over again.\n\n8\n00:39:787 --> 00:42:687\nWhich is great if you need to rename a variable in a small scope.\n\n9\n00:43:067 --> 00:45:957\nNow the control P command allows you to search for files and open them up.\n\n10\n00:45:957 --> 00:47:467\nSo we can switch between our files.\n\n11\n00:47:467 --> 00:52:797\nControl Shift P allows you to run different commands from VS code, so I can open up my settings, for example.\n\n12\n00:53:217 --> 00:59:787\nAnd finally, you can hit control plus the forward slash key and that allows you to comment out a line or if you highlight a bunch of code, you can comment it all out at once.`;
    const { parse, resync } = require('../index');
    const captions = parse(vttContent);
    expect(() => resync(captions.cues, { offset: 0 })).not.toThrow();
    const resynced = resync(captions.cues, { offset: 0 });
    expect(resynced).toHaveLength(captions.cues.length);
    for (let i = 0; i < resynced.length; i++) {
      expect(resynced[i].startTime).toBe(captions.cues[i].startTime);
      expect(resynced[i].endTime).toBe(captions.cues[i].endTime);
    }
  });
});
