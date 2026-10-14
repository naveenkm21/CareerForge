int coinChange(const vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, INT_MAX); dp[0] = 0;           // @init
    for (int x = 1; x <= amount; x++) {
        for (int c : coins) {
            if (c <= x && dp[x - c] != INT_MAX && dp[x - c] + 1 < dp[x]) {   // @try
                dp[x] = dp[x - c] + 1;                        // @improve
            }
        }
    }
    return dp[amount] == INT_MAX ? -1 : dp[amount];           // @done
}
