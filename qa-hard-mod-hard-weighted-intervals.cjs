function weightedIntervalMax(intervals) {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  const dp = new Array(sorted.length);
  for (let i = 0; i < sorted.length; i++) {
    const [s, , v] = sorted[i];
    let best = v;
    // last interval ending <= this start
    let compat = 0;
    for (let j = i - 1; j >= 0; j--) if (sorted[j][1] <= s) { compat = dp[j]; break; }
    best = v + compat;
    dp[i] = Math.max(best, i ? dp[i - 1] : 0);
  }
  return dp[sorted.length - 1];
}
module.exports = { weightedIntervalMax };
