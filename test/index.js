import tape from "tape";
import tapePromise from "tape-promise";
import RWMutex from "../src/index";

const test = tapePromise(tape);

function reader(mutex, n, fn) {
  let promises = [];

  async function readlock(i) {
    const unlock = await mutex.rlock();
    await fn(i);
    await sleep(100);
    unlock();
  }

  for (let i = 0; i < n; i++) {
    promises.push(readlock(i));
  }

  return promises;
}

test("parallel read locks", async function(t) {
  t.plan(1);
  t.timeoutAfter(10000);

  let count = 0;
  const mutex = new RWMutex();
  const promises = reader(mutex, 4, () => count++);
  await Promise.all(promises);
  t.equals(count, 4, "runs 4 rlocks");
});

function writer(mutex, fn) {
  async function writeLock() {
    const unlock = await mutex.lock();
    await fn();
    await sleep(100);
    unlock();
  }

  return writeLock();
}

test("blocks all reads until unlock", async function(t) {
  t.plan(11);
  t.timeoutAfter(10000);

  const mutex = new RWMutex();
  const masterUnlock = await mutex.lock();
  let unlocked = false;

  const promises = reader(mutex, 10, (i) => {
    t.ok(unlocked, `blocked read ${i} until master unlocks`);
  });

  await sleep(500);
  unlocked = true;
  masterUnlock();
  await Promise.all(promises);
  t.pass("unlocked completely");
});

test("blocks write until unlock", async function(t) {
  t.plan(2);
  t.timeoutAfter(10000);

  const mutex = new RWMutex();
  const masterUnlock = await mutex.lock();
  let unlocked = false;

  const promise = writer(mutex, () => {
    t.ok(unlocked, `blocked write until master unlocks`);
  });

  await sleep(500);
  unlocked = true;
  masterUnlock();
  await promise;
  t.pass("unlocked completely");
});

function sleep(ms=0) {
  return new Promise((r) => setTimeout(r, ms));
}
