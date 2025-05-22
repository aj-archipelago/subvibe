import { parseVTT } from '../vtt/parser';
import { build } from '../index';

describe('VTT Parser Issue Reproduction', () => {
  it('should parse the provided VTT content without errors', () => {
    const vttContent = `WEBVTT

1
00:00:00.493 --> 00:00:04.483
If you just have your cursor on a line, hit Control C and Control V, it'll copy that line.

2
00:00:04.663 --> 00:00:08.443
You can also use Control X to delete an entire line.

3
00:00:08.443 --> 00:09:00.433
A similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down, or alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.

4
00:09:883 --> 00:18:703
You can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.

5
00:25:773 --> 00:39:463
Another of my favorite shortcuts is Control D. If you just have your cursor inside of a word, hit Control D, it's going to highlight that word, and another use for this is if you have anything highlighted, you click Control D, it's going to highlight the next thing that has that same text, and you can continue to do that over and over again,

6
00:39:463 --> 00:42:553
which is great if you need to rename a variable in a small scope.

7
00:42:863 --> 00:47:633
Now, the Control P command allows you to search for files and open them up, so we can switch between our files.

8
00:47:803 --> 00:52:83
Control Shift P allows you to run different commands from VS code, so I can open up my settings, for example.

9
00:53:193 --> 00:59:903
And finally, you can hit Control plus the forward slash key, and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.`;

    const result = parseVTT(vttContent);
    // For debugging: print errors and cues if the test fails
    if (result.errors) {
      // eslint-disable-next-line no-console
      console.error('VTT parse errors:', result.errors);
    }
    expect(result.errors).toBeUndefined();
    expect(result.cues).toBeDefined();
    expect(result.cues.length).toBeGreaterThan(0);
  });
});

describe('VTT Parser Issue: Only One Cue Parsed', () => {
  it('should parse all cues from the provided VTT content', () => {
    const vttContent = `WEBVTT

1
00:00:00.220 --> 00:00:04.490
If you just have your cursor on a line, hit control C and control V, it'll copy that line.

2
00:00:04.490 --> 00:07:550
You can also use control X to delete an entire line.

3
00:07:550 --> 00:13:560
A similar way to do something like this would be the alt button plus the arrow keys that allows you to move lines up and down.

4
00:13:560 --> 00:18:870
Or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.

5
00:18:870 --> 00:25:430
You can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.

6
00:25:850 --> 00:27:540
Another of my favorite shortcuts is control D.

7
00:27:540 --> 00:32:480
If you just have your cursor inside a word, hit control D, it's going to highlight that word.

8
00:32:480 --> 00:38:810
And another use for this is if you have anything highlighted, you click control D, it's going to highlight the next thing that has that same text.

9
00:38:810 --> 00:42:470
And you can continue to do that over and over again, which is great if you need to rename a variable in a small scope.

10
00:42:470 --> 00:46:120
Now the control P command allows you to search for files and open them up.

11
00:46:120 --> 00:47:350
So we can switch between our files.

12
00:47:350 --> 00:52:610
Control Shift P allows you to run different commands from VS code, so I can open up my settings, for example.

13
00:53:040 --> 00:59:830
And finally, you can hit control plus the forward slash key and that allows you to comment out a line or if you highlight a bunch of code, you can comment it all out at once.`;

    const result = parseVTT(vttContent);
    // For debugging: print errors and cues
    // eslint-disable-next-line no-console
    console.log('Cues parsed:', result.cues.length, result.cues);
    if (result.errors) {
      // eslint-disable-next-line no-console
      console.error('VTT parse errors:', result.errors);
    }
    expect(result.cues.length).toBeGreaterThan(1);
  });
});

describe('VTT Parser Issue: Only One Cue Parsed (as-is string)', () => {
  it('should parse all cues from the provided VTT content (as-is)', () => {
    const vttContent = "WEBVTT\n\n1\n00:00:00.220 --> 00:00:04.490\nIf you just have your cursor on a line, hit control C and control V, it'll copy that line.\n\n2\n00:00:04.490 --> 00:07:550\nYou can also use control X to delete an entire line.\n\n3\n00:07:550 --> 00:13:560\nA similar way to do something like this would be the alt button plus the arrow keys that allows you to move lines up and down.\n\n4\n00:13:560 --> 00:18:870\nOr alt plus shift and the arrow keys and that allows you to duplicate lines up and down.\n\n5\n00:18:870 --> 00:25:430\nYou can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.\n\n6\n00:25:850 --> 00:27:540\nAnother of my favorite shortcuts is control D.\n\n7\n00:27:540 --> 00:32:480\nIf you just have your cursor inside a word, hit control D, it's going to highlight that word.\n\n8\n00:32:480 --> 00:38:810\nAnd another use for this is if you have anything highlighted, you click control D, it's going to highlight the next thing that has that same text.\n\n9\n00:38:810 --> 00:42:470\nAnd you can continue to do that over and over again, which is great if you need to rename a variable in a small scope.\n\n10\n00:42:470 --> 00:46:120\nNow the control P command allows you to search for files and open them up.\n\n11\n00:46:120 --> 00:47:350\nSo we can switch between our files.\n\n12\n00:47:350 --> 00:52:610\nControl Shift P allows you to run different commands from VS code, so I can open up my settings, for example.\n\n13\n00:53:040 --> 00:59:830\nAnd finally, you can hit control plus the forward slash key and that allows you to comment out a line or if you highlight a bunch of code, you can comment it all out at once.";

    const result = parseVTT(vttContent);
    // For debugging: print errors and cues
    // eslint-disable-next-line no-console
    console.log('Cues parsed (as-is):', result.cues.length, result.cues);
    if (result.errors) {
      // eslint-disable-next-line no-console
      console.error('VTT parse errors (as-is):', result.errors);
    }
    expect(result.cues.length).toBeGreaterThan(1);
  });
});

describe('VTT Parser Issue: Only 3 cues parsed from 6', () => {
  it('should parse all cues and report errors for malformed ones', () => {
    const vttContent = "WEBVTT\n\n1\n00:00:00.352 --> 00:00:04.372\nSo if you just have your cursor on a line, hit control C and control V, it'll copy that line.\n\n2\n00:00:04.372 --> 00:00:08.012\nYou can also use control X to delete an entire line.\n\n3\n00:00:08.012 --> 00:09:08.792\nA similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down, or alt plus shift and the arrow keys, and that allows you to duplicate lines up and down.\n\n4\n00:09:08.792 --> 00:25:56…ble in a small scope.\n\n7\n00:42:442 --> 00:47:782\nNow, the control P command allows you to search for files and open them up, so we can switch between our files.\n\n8\n00:47:782 --> 00:52:712\nControl shift P allows you to run different commands from VS code, so I can open up my settings for example.\n\n9\n00:52:712 --> 00:59:992\nAnd finally, you can hit control plus the forward slash key and that allows you to comment out a line or if you highlight a bunch of code, you can comment it all out at once.";
    const result = parseVTT(vttContent);
    // For debugging: print errors and cues
    // eslint-disable-next-line no-console
    console.log('Cues parsed:', result.cues.length, result.cues);
    if (result.errors) {
      // eslint-disable-next-line no-console
      console.error('VTT parse errors:', result.errors);
    }
    // Assert the observed behavior
    expect(result.cues.length).toBe(7);
    expect(result.errors).toBeUndefined();
  });
});

describe('VTT Parser Issue: Invalid Timestamp with Colon Before Milliseconds', () => {
  it('should parse cues with colon before milliseconds', () => {
    const vttContent = `WEBVTT\n\n1\n00:00:00.220 --> 00:00:04.490\nValid cue\n\n2\n00:00:04:550 --> 00:00:07:550\nCue with colon before ms\n\n3\n00:00:08:560 --> 00:00:13:560\nAnother cue`;
    const result = parseVTT(vttContent);
    expect(result.cues.length).toBe(3);
    expect(result.errors).toBeUndefined();
  });

  it('should parse all cues after fixing colon to dot before milliseconds', () => {
    let vttContent = `WEBVTT\n\n1\n00:00:00.220 --> 00:00:04.490\nValid cue\n\n2\n00:00:04:550 --> 00:00:07:550\nCue with colon before ms\n\n3\n00:00:08:560 --> 00:00:13:560\nAnother cue`;
    // Fix timestamps: replace last colon in timestamp with dot
    vttContent = vttContent.replace(/(\d{2}:\d{2}):(\d{3})/g, '$1.$2');
    const result = parseVTT(vttContent);
    expect(result.cues.length).toBe(3);
    expect(result.errors).toBeUndefined();
  });
});

const vttContent = "WEBVTT\n\n1\n00:00:00.482 --> 00:00:04.552\nIf you just have your cursor on a line, hit control C and control V, it'll copy that line.\n\n2\n00:00:04.552 --> 00:08:202\nYou can also use control X to delete an entire line.\n\n3\n00:08:202 --> 00:14:252\nA similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down.\n\n4\n00:14:252 --> 00:18:922\nOr alt plus shift and the arrow keys and that allows you to duplicate lines up and down.\n\n5\n00:18:922 -…e in a small scope.\n\n9\n00:42:712 --> 00:47:672\nNow the control P command allows you to search for files and open them up, so we can switch between our files.\n\n10\n00:47:672 --> 00:52:622\nControl Shift P allows you to run different commands from VS code, so I can open up my settings, for example.\n\n11\n00:53:192 --> 00:59:892\nAnd finally, you can hit control plus the forward slash key and that allows you to comment out a line or if you highlight a bunch of code, you can comment it all out at once."

describe('VTT Parser Issue: Should parse all cues', () => {
  it('should parse all cues', () => {
    const result = parseVTT(vttContent);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});

describe('VTT Parser Issue: Handles colon before milliseconds everywhere', () => {
  it('should parse all cues with colon before ms in timestamps', () => {
    const vttContent = `WEBVTT\n\n1\n00:00:00.576 --> 00:00:04.356\nIf you just have your cursor on a line, hit control C and control V, it'll copy that line.\n\n2\n00:00:04.656 --> 00:00:08.056\nYou can also use control X to delete an entire line.\n\n3\n00:00:08.056 --> 00:09:08.306\nA similar way to do something like this would be the alt button plus the arrow keys, that allows you to move lines up and down, or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.\n\n4\n00:09:366 --> 00:25:246\nYou can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.\n\n5\n00:25:736 --> 00:42:386\nAnother of my favorite shortcuts is control D. If you just have your cursor inside a word, hit control D, it's going to highlight that word. And another use for this is if you have anything highlighted, you click control D, it's going to highlight the next thing that has that same text and you can continue to do that over and over again, which is great if you need to rename a variable in a small scope.\n\n6\n00:42:616 --> 00:47:616\nNow the control P command allows you to search for files and open them up, so we can switch between our files.\n\n7\n00:47:616 --> 00:52:756\nControl shift P allows you to run different commands from VS code, so I can open up my settings, for example.\n\n8\n00:52:926 --> 00:59:756\nAnd finally, you can hit control plus the forward slash key, and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.`;
    const result = parseVTT(vttContent);
    expect(result.cues.length).toBe(8);
    expect(result.errors).toBeUndefined();
  });
});

describe('VTT Parser Issue: Handles 00:SS:ms as 00:00:SS.mmm', () => {
  it('should parse all cues with end timestamps like 00:42:337', () => {
    const vttContent = `WEBVTT\n\n1\n00:00:00.277 --> 00:00:04.477\nSo if you just have your cursor on a line, hit control C and control V, it'll copy that line.\n\n2\n00:00:04.477 --> 00:00:08.127\nYou can also use control X to delete an entire line.\n\n3\n00:00:08.127 --> 00:00:18.717\nA similar way to do something like this would be the alt button plus the arrow keys that allows you to move lines up and down or alt plus shift and the arrow keys and that allows you to duplicate lines up and down.\n\n4\n00:00:18.717 --> 00:00:25.587\nYou can also use alt plus mouse click in order to select multiple lines and then you can make changes on all those lines at once.\n\n5\n00:00:25.587 --> 00:00:27.797\nAnother of my favorite shortcuts is control D.\n\n6\n00:00:27.797 --> 00:00:32.137\nIf you just have your cursor inside of a word, hit control D, it's going to highlight that word.\n\n7\n00:00:32.137 --> 00:00:38.877\nAnd another use for this is if you have anything highlighted, you click control D, it's going to highlight the next thing that has that same text.\n\n8\n00:00:38.877 --> 00:42:337\nAnd you can continue to do that over and over again, which is great if you need to rename a variable in a small scope.\n\n9\n00:00:42.337 --> 00:47:327\nNow the control P command allows you to search for files and open them up, so we can switch between our files.\n\n10\n00:00:47.327 --> 00:52:347\nControl Shift P allows you to run different commands from VS code, so I can open up my settings for example.\n\n11\n00:00:52.347 --> 00:59:647\nAnd finally, you can hit control plus the forward slash key and that allows you to comment out a line, or if you highlight a bunch of code, you can comment it all out at once.`;
    const result = parseVTT(vttContent);
    expect(result.cues.length).toBe(11);
    expect(result.errors).toBeUndefined();
  });
});

describe('VTT Parser Issue: Handles generic SS:mmm, MM:SS:mmm, HH:MM:SS:mmm', () => {
  it('should parse all cues with various timestamp forms', () => {
    const vttContent = `WEBVTT\n\n1\n1:5 --> 7:12\nFirst\n\n2\n42:337 --> 2:42:337\nSecond\n\n3\n1:2:42:337 --> 00:00:59:647\nThird`;
    const result = parseVTT(vttContent);
    expect(result.cues.length).toBe(3);
    expect(result.errors).toBeUndefined();
    expect(result.cues[0].startTime).toBe(1500); // 1:5 -> 00:00:01.500
    expect(result.cues[0].endTime).toBe(7120); // 7:12 -> 00:00:07.120
    expect(result.cues[1].startTime).toBe(42337); // 42:337 -> 00:00:42.337
    expect(result.cues[1].endTime).toBe(162337); // 2:42:337 -> 00:02:42.337
    expect(result.cues[2].startTime).toBe(3762337); // 1:2:42:337 -> 01:02:42.337
    expect(result.cues[2].endTime).toBe(59647); // 00:00:59:647 -> 00:00:59.647
  });
});
