def coin_change(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount                   # @init
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x and dp[x - c] + 1 < dp[x]:    # @try
                dp[x] = dp[x - c] + 1           # @improve
    return -1 if dp[amount] == INF else dp[amount]  # @done
