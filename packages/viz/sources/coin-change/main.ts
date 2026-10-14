function coinChange(coins: number[], amount: number): number {
  const dp = [0, ...new Array<number>(amount).fill(Infinity)];  // @init
  for (let x = 1; x <= amount; x++) {
    for (const c of coins) {
      if (c <= x && dp[x - c] + 1 < dp[x]) {                    // @try
        dp[x] = dp[x - c] + 1;                                  // @improve
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];             // @done
}
