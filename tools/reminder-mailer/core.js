function parseOffsets(str) {
  return String(str == null ? '' : str)
    .split(/[,\s]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return /^\d+$/.test(s); })
    .map(Number);
}

if (typeof module !== 'undefined') {
  module.exports = { parseOffsets: parseOffsets };
}
