// Injectable time source so tests can control the clock.
let nowFn = () => Date.now();

export function now() {
  return nowFn();
}

export function _setNow(fn) {
  nowFn = fn;
}

export function _resetClock() {
  nowFn = () => Date.now();
}
