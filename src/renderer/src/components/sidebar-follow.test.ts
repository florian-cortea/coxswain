import assert from "node:assert/strict";
import { test } from "node:test";
import { createSidebarFollower } from "./sidebar-follow.ts";

function setup() {
  let frame: FrameRequestCallback | undefined;
  let requests = 0;
  const list = {
    scrollTop: 0,
    scrollHeight: 3000,
    clientHeight: 200,
    isConnected: true,
    getBoundingClientRect: () => ({ top: 0, bottom: 200 }),
    scrollTo(this: { scrollTop: number }, options: ScrollToOptions) {
      this.scrollTop = options.top ?? this.scrollTop;
    },
  } as unknown as HTMLElement;
  const follower = createSidebarFollower(
    (callback) => {
      frame = callback;
      return ++requests;
    },
    () => {
      frame = undefined;
    },
  );
  const row = (at: number) =>
    ({
      getBoundingClientRect: () => ({ top: at - list.scrollTop, bottom: at + 24 - list.scrollTop }),
    }) as HTMLElement;
  return {
    follower,
    list,
    row,
    requests: () => requests,
    tick(time: number) {
      const callback = frame;
      frame = undefined;
      callback?.(time);
    },
    pending: () => !!frame,
  };
}

test("active-file reveals ease in without jumping, preserve one animation on retarget, and settle", () => {
  const s = setup();
  s.follower.reveal(s.list, s.row(50), false);
  assert.equal(s.requests(), 0);
  s.follower.reveal(s.list, s.row(800), false);
  s.tick(0);
  s.tick(16);
  assert.ok(
    s.list.scrollTop > 0 && s.list.scrollTop < 15,
    "reveal accelerates gently instead of jumping",
  );
  const before = s.requests();
  s.follower.reveal(s.list, s.row(1000), false);
  assert.equal(s.requests(), before, "retargeting never restarts the animation");
  for (let t = 32; t <= 2400 && s.pending(); t += 16) s.tick(t);
  assert.equal(s.list.scrollTop, 832);
  assert.equal(s.pending(), false);
  s.follower.reveal(s.list, s.row(1500), false);
  s.follower.stop();
  assert.equal(s.pending(), false);
  s.follower.reveal(s.list, s.row(1500), true);
  assert.equal(s.list.scrollTop, 1332);
  assert.equal(s.pending(), false);
});

test("damped reveal has the same position at the same time at 60/120 Hz", () => {
  const at = (interval: number) => {
    const s = setup();
    s.follower.reveal(s.list, s.row(800), false);
    for (let t = 0; t <= 160; t += interval) s.tick(t);
    s.follower.stop();
    return s.list.scrollTop;
  };
  assert.ok(Math.abs(at(16) - at(8)) < 0.001);
});
