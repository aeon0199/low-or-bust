export function success(data) {
  return { ok: true, data };
}

export function failure(error, detail = []) {
  return { ok: false, error, detail };
}
