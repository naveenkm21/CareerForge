static int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, Integer.MAX_VALUE); dp[0] = 0;            // @init
    for (int x = 1; x <= amount; x++) {
        for (int c : coins) {
            if (c <= x && dp[x - c] != Integer.MAX_VALUE && dp[x - c] + 1 < dp[x]) {  // @try
                dp[x] = dp[x - c] + 1;                        // @improve
            }
        }
    }
    return dp[amount] == Integer.MAX_VALUE ? -1 : dp[amount]; // @done
}
