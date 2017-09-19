import _debug from "debug";

const debug = _debug("rwmutex");

export default class Mutex {
  constructor(label="") {
    this.label = label;
    this._rlockId = 0;
    this._rlocks = [];
  }

  lock() {
    if (this._lock) {
      return this._lock.then(() => this.lock());
    }

    if (this._rlocks.length) {
      return Promise.all(this._rlocks).then(() => {
        return this.lock();
      });
    }

    let resolve, unlocked = false;
    const promise = new Promise((r) => resolve = r);

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      if (this._lock === promise) delete this._lock;
      debug("unlock", this.label);
      resolve();
    };

    debug("lock", this.label);
    this._lock = promise;

    return Promise.resolve(unlock);
  }

  rlock() {
    if (this._lock) {
      return this._lock.then(() => this.rlock());
    }

    let resolve, unlocked = false;
    const promise = new Promise((r) => resolve = r);

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      const index = this._rlocks.indexOf(promise);
      if (index > -1) this._rlocks.splice(index, 1);
      debug("runlock", this.label, id);
      resolve();
    };

    const id = this._rlockId++;
    debug("rlock", this.label, id);
    this._rlocks.push(promise);

    return Promise.resolve(unlock);
  }
}
