import { arr, ints, lines, type ProblemDef } from './problem-kit';

const MOD = 1_000_000_007;

/** Reads "n\n a1..an" (n may be followed by more numbers on the first line). */
const nAndArray = (input: string) => {
  const [first = '', second = ''] = lines(input);
  return { head: ints(first), a: ints(second) };
};

export const PROBLEMS: ProblemDef[] = [
  // ── Arrays & traversal ────────────────────────────────────────────────────
  {
    slug: 'array-sum',
    title: 'Sum of an Array',
    skill: 'dsa.arrays.traversal',
    difficulty: 1,
    statement: 'Given an array of integers, print the sum of its elements.',
    inputFormat: 'n\na1 a2 … an',
    outputFormat: 'The sum.',
    constraints: '1 ≤ n ≤ 10^5, |ai| ≤ 10^9 (use 64-bit integers)',
    hints: ['One pass, one accumulator.', 'The sum can exceed 32 bits — use long long.'],
    algorithmId: 'linear-search',
    tags: ['traversal'],
    samples: ['5\n1 2 3 4 5', '3\n-4 10 -6'],
    generate: (r) => {
      const n = r.int(1, 2000);
      return `${n}\n${arr(r.array(n, -1e9, 1e9))}`;
    },
    solve: (i) => String(nAndArray(i).a.reduce((s, x) => s + BigInt(x), 0n)),
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    long long sum = 0;
    for (int i = 0, x; i < n; i++) { cin >> x; sum += x; }
    cout << sum << "\\n";
}`,
  },
  {
    slug: 'second-largest',
    title: 'Second Largest Distinct Value',
    skill: 'dsa.arrays.traversal',
    difficulty: 2,
    statement: 'Print the second largest DISTINCT value in the array, or -1 if it does not exist.',
    inputFormat: 'n\na1 … an',
    outputFormat: 'The second largest distinct value, or -1.',
    constraints: '1 ≤ n ≤ 10^5, 0 ≤ ai ≤ 10^9',
    hints: ['Track the best two values in one pass.', 'Equal values are not distinct — skip them.'],
    tags: ['traversal'],
    samples: ['5\n4 9 2 9 7', '3\n5 5 5'],
    generate: (r) => {
      const n = r.int(1, 50);
      return `${n}\n${arr(r.array(n, 0, r.int(0, 30)))}`;
    },
    solve: (i) => {
      const d = [...new Set(nAndArray(i).a)].sort((x, y) => y - x);
      return String(d[1] ?? -1);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    long long first = -1, second = -1;
    for (int i = 0; i < n; i++) {
        long long x; cin >> x;
        if (x > first) { second = first; first = x; }
        else if (x < first && x > second) second = x;
    }
    cout << second << "\\n";
}`,
  },
  {
    slug: 'reverse-array',
    title: 'Reverse in Place',
    skill: 'dsa.linked-lists',
    difficulty: 1,
    statement:
      'Reverse the sequence and print it. (Practise the pointer-swapping you will use to reverse a linked list.)',
    inputFormat: 'n\na1 … an',
    outputFormat: 'The reversed sequence on one line.',
    constraints: '1 ≤ n ≤ 10^5',
    hints: ['Swap a[l] and a[r], move inward.'],
    tags: ['reversal'],
    samples: ['4\n1 2 3 4'],
    generate: (r) => {
      const n = r.int(1, 40);
      return `${n}\n${arr(r.array(n, -50, 50))}`;
    },
    solve: (i) => arr([...nAndArray(i).a].reverse()),
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    for (int l = 0, r = n - 1; l < r; l++, r--) swap(a[l], a[r]);
    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 < n ? ' ' : '\\n');
}`,
  },

  // ── Two pointers ──────────────────────────────────────────────────────────
  {
    slug: 'pair-sum-sorted',
    title: 'Pair Sum in a Sorted Array',
    skill: 'dsa.arrays.two-pointers',
    difficulty: 2,
    statement:
      'The array is sorted ascending. Is there a pair of DIFFERENT positions whose values add up to the target?',
    inputFormat: 'n target\na1 … an (sorted)',
    outputFormat: 'YES or NO',
    constraints: '2 ≤ n ≤ 10^5',
    hints: [
      'Start with l = 0, r = n − 1.',
      'If the sum is too small, only moving l right can help.',
    ],
    algorithmId: 'two-pointers',
    tags: ['two-pointers'],
    samples: ['7 17\n1 3 4 6 8 11 14', '5 8\n2 4 7 9 12'],
    generate: (r) => {
      const n = r.int(2, 60);
      const a = r.array(n, 0, 100).sort((x, y) => x - y);
      return `${n} ${r.int(0, 200)}\n${arr(a)}`;
    },
    solve: (i) => {
      const { head, a } = nAndArray(i);
      const t = head[1]!;
      let l = 0;
      let r = a.length - 1;
      while (l < r) {
        const s = a[l]! + a[r]!;
        if (s === t) return 'YES';
        if (s < t) l++;
        else r--;
      }
      return 'NO';
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; long long t; cin >> n >> t;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    int l = 0, r = n - 1;
    while (l < r) {
        long long s = a[l] + a[r];
        if (s == t) { cout << "YES\\n"; return 0; }
        if (s < t) l++; else r--;
    }
    cout << "NO\\n";
}`,
  },
  {
    slug: 'dedupe-sorted',
    title: 'Remove Duplicates from Sorted Array',
    skill: 'dsa.arrays.two-pointers',
    difficulty: 2,
    statement:
      'Remove duplicates in place from a sorted array. Print the number of unique values, then the unique values.',
    inputFormat: 'n\na1 … an (sorted)',
    outputFormat: 'k on the first line, then the k unique values.',
    constraints: '1 ≤ n ≤ 10^5',
    hints: ['A slow pointer marks where the next unique value goes; a fast pointer scans.'],
    tags: ['two-pointers', 'in-place'],
    samples: ['6\n1 1 2 3 3 3'],
    generate: (r) => {
      const n = r.int(1, 40);
      return `${n}\n${arr(r.array(n, 0, 12).sort((x, y) => x - y))}`;
    },
    solve: (i) => {
      const u = [...new Set(nAndArray(i).a)];
      return `${u.length}\n${arr(u)}`;
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    int k = 0;
    for (int i = 0; i < n; i++) if (i == 0 || a[i] != a[k - 1]) a[k++] = a[i];
    cout << k << "\\n";
    for (int i = 0; i < k; i++) cout << a[i] << (i + 1 < k ? ' ' : '\\n');
}`,
  },

  // ── Sliding window ────────────────────────────────────────────────────────
  {
    slug: 'max-sum-window',
    title: 'Maximum Sum of a Window of Size k',
    skill: 'dsa.arrays.sliding-window',
    difficulty: 2,
    statement: 'Find the maximum sum of any contiguous subarray of exactly k elements.',
    inputFormat: 'n k\na1 … an',
    outputFormat: 'The maximum window sum.',
    constraints: '1 ≤ k ≤ n ≤ 10^5, |ai| ≤ 10^4',
    hints: ['Add the element entering the window, subtract the one leaving.'],
    algorithmId: 'sliding-window',
    tags: ['sliding-window'],
    samples: ['6 3\n2 1 5 1 3 2', '4 2\n-1 -2 -3 -4'],
    generate: (r) => {
      const n = r.int(1, 80);
      return `${n} ${r.int(1, n)}\n${arr(r.array(n, -100, 100))}`;
    },
    solve: (i) => {
      const { head, a } = nAndArray(i);
      const k = head[1]!;
      let s = a.slice(0, k).reduce((x, y) => x + y, 0);
      let best = s;
      for (let j = k; j < a.length; j++) {
        s += a[j]! - a[j - k]!;
        best = Math.max(best, s);
      }
      return String(best);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, k; cin >> n >> k;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    long long s = 0;
    for (int i = 0; i < k; i++) s += a[i];
    long long best = s;
    for (int i = k; i < n; i++) { s += a[i] - a[i - k]; best = max(best, s); }
    cout << best << "\\n";
}`,
  },
  {
    slug: 'longest-unique-substring',
    title: 'Longest Substring Without Repeats',
    skill: 'dsa.arrays.sliding-window',
    difficulty: 3,
    statement:
      'Print the length of the longest substring of s that contains no repeated character.',
    inputFormat: 's (lowercase letters)',
    outputFormat: 'The length.',
    constraints: '1 ≤ |s| ≤ 10^5',
    hints: [
      'Grow the window right; when a repeat appears, shrink from the left past its last occurrence.',
    ],
    tags: ['sliding-window', 'hashing'],
    samples: ['abcabcbb', 'bbbbb', 'pwwkew'],
    generate: (r) => Array.from({ length: r.int(1, 60) }, () => 'abcdefgh'[r.int(0, 7)]).join(''),
    solve: (i) => {
      const s = i.trim();
      const last = new Map<string, number>();
      let best = 0;
      let l = 0;
      for (let rIdx = 0; rIdx < s.length; rIdx++) {
        const c = s[rIdx]!;
        if ((last.get(c) ?? -1) >= l) l = last.get(c)! + 1;
        last.set(c, rIdx);
        best = Math.max(best, rIdx - l + 1);
      }
      return String(best);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s; cin >> s;
    vector<int> last(128, -1);
    int best = 0, l = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        if (last[s[r]] >= l) l = last[s[r]] + 1;
        last[s[r]] = r;
        best = max(best, r - l + 1);
    }
    cout << best << "\\n";
}`,
  },

  // ── Prefix sums & hashing ─────────────────────────────────────────────────
  {
    slug: 'range-sum-queries',
    title: 'Range Sum Queries',
    skill: 'dsa.arrays.prefix-sum',
    difficulty: 2,
    statement: 'Answer q queries: each asks for the sum of a[l..r] (0-indexed, inclusive).',
    inputFormat: 'n q\na1 … an\nthen q lines: l r',
    outputFormat: 'q lines, one sum each.',
    constraints: '1 ≤ n, q ≤ 10^5',
    hints: ['Build p where p[i] = a[0] + … + a[i−1].', 'sum(l..r) = p[r+1] − p[l].'],
    algorithmId: 'prefix-sum',
    tags: ['prefix-sum'],
    samples: ['5 3\n3 1 4 1 5\n0 4\n1 3\n2 2'],
    generate: (r) => {
      const n = r.int(1, 40);
      const q = r.int(1, 10);
      const qs = Array.from({ length: q }, () => {
        const l = r.int(0, n - 1);
        return `${l} ${r.int(l, n - 1)}`;
      });
      return `${n} ${q}\n${arr(r.array(n, -50, 50))}\n${qs.join('\n')}`;
    },
    solve: (i) => {
      const ls = lines(i);
      const a = ints(ls[1]!);
      const p = [0];
      for (const x of a) p.push(p[p.length - 1]! + x);
      return ls
        .slice(2)
        .map((l) => {
          const [lo, hi] = ints(l);
          return String(p[hi! + 1]! - p[lo!]!);
        })
        .join('\n');
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, q; cin >> n >> q;
    vector<long long> p(n + 1, 0);
    for (int i = 0; i < n; i++) { long long x; cin >> x; p[i + 1] = p[i] + x; }
    while (q--) { int l, r; cin >> l >> r; cout << p[r + 1] - p[l] << "\\n"; }
}`,
  },
  {
    slug: 'count-distinct',
    title: 'Count Distinct Values',
    skill: 'dsa.hashing',
    difficulty: 1,
    statement: 'Print how many distinct values the array contains.',
    inputFormat: 'n\na1 … an',
    outputFormat: 'The number of distinct values.',
    constraints: '1 ≤ n ≤ 10^5',
    hints: ['A hash set answers "have I seen this?" in O(1).'],
    tags: ['hashing'],
    samples: ['6\n1 2 2 3 3 3'],
    generate: (r) => {
      const n = r.int(1, 60);
      return `${n}\n${arr(r.array(n, 0, 25))}`;
    },
    solve: (i) => String(new Set(nAndArray(i).a).size),
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    unordered_set<long long> seen;
    for (int i = 0; i < n; i++) { long long x; cin >> x; seen.insert(x); }
    cout << seen.size() << "\\n";
}`,
  },
  {
    slug: 'subarray-sum-k',
    title: 'Subarrays Summing to k',
    skill: 'dsa.hashing',
    difficulty: 3,
    statement: 'Count the contiguous subarrays whose sum equals k.',
    inputFormat: 'n k\na1 … an',
    outputFormat: 'The count.',
    constraints: '1 ≤ n ≤ 10^5, |ai| ≤ 1000',
    hints: [
      'A subarray (l, r] sums to k exactly when prefix[r] − prefix[l] = k.',
      'Count earlier prefixes in a hash map.',
    ],
    tags: ['hashing', 'prefix-sum'],
    samples: ['3 2\n1 1 1', '5 3\n1 2 3 -3 3'],
    generate: (r) => {
      const n = r.int(1, 50);
      return `${n} ${r.int(-5, 10)}\n${arr(r.array(n, -4, 6))}`;
    },
    solve: (i) => {
      const { head, a } = nAndArray(i);
      const k = head[1]!;
      const seen = new Map<number, number>([[0, 1]]);
      let s = 0;
      let count = 0;
      for (const x of a) {
        s += x;
        count += seen.get(s - k) ?? 0;
        seen.set(s, (seen.get(s) ?? 0) + 1);
      }
      return String(count);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; long long k; cin >> n >> k;
    unordered_map<long long, long long> seen{{0, 1}};
    long long s = 0, count = 0;
    for (int i = 0; i < n; i++) {
        long long x; cin >> x; s += x;
        auto it = seen.find(s - k);
        if (it != seen.end()) count += it->second;
        seen[s]++;
    }
    cout << count << "\\n";
}`,
  },

  // ── Binary search ─────────────────────────────────────────────────────────
  {
    slug: 'lower-bound',
    title: 'First Position ≥ Target',
    skill: 'dsa.searching.binary-search',
    difficulty: 2,
    statement:
      'In a sorted array, print the first index whose value is ≥ target (n if there is none).',
    inputFormat: 'n target\na1 … an (sorted)',
    outputFormat: 'The index.',
    constraints: '1 ≤ n ≤ 10^5',
    hints: [
      'Keep the invariant: the answer is in [lo, hi].',
      'When a[mid] ≥ target, mid could be the answer — hi = mid.',
    ],
    algorithmId: 'binary-search',
    tags: ['binary-search'],
    samples: ['7 23\n2 5 8 12 16 23 38', '5 4\n1 3 3 5 9', '3 100\n1 2 3'],
    generate: (r) => {
      const n = r.int(1, 60);
      return `${n} ${r.int(-5, 105)}\n${arr(r.array(n, 0, 100).sort((x, y) => x - y))}`;
    },
    solve: (i) => {
      const { head, a } = nAndArray(i);
      const t = head[1]!;
      const idx = a.findIndex((x) => x >= t);
      return String(idx === -1 ? a.length : idx);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; long long t; cin >> n >> t;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] >= t) hi = mid; else lo = mid + 1;
    }
    cout << lo << "\\n";
}`,
  },
  {
    slug: 'integer-sqrt',
    title: 'Integer Square Root',
    skill: 'dsa.searching.binary-search',
    difficulty: 2,
    statement: 'Print floor(√x) without using floating-point square root.',
    inputFormat: 'x',
    outputFormat: 'floor(√x)',
    constraints: '0 ≤ x ≤ 10^12',
    hints: ['Binary search the answer: the largest m with m·m ≤ x.', 'Watch for overflow in m·m.'],
    tags: ['binary-search', 'answer-space'],
    samples: ['16', '27', '0'],
    generate: (r) => String(r.int(0, 1e12)),
    solve: (i) => {
      const x = BigInt(i.trim());
      let lo = 0n;
      let hi = 1_000_001n;
      while (lo < hi) {
        const mid = (lo + hi + 1n) / 2n;
        if (mid * mid <= x) lo = mid;
        else hi = mid - 1n;
      }
      return String(lo);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    long long x; cin >> x;
    long long lo = 0, hi = 1000001;
    while (lo < hi) {
        long long mid = (lo + hi + 1) / 2;
        if (mid * mid <= x) lo = mid; else hi = mid - 1;
    }
    cout << lo << "\\n";
}`,
  },

  // ── Sorting ───────────────────────────────────────────────────────────────
  {
    slug: 'sort-array',
    title: 'Sort the Array',
    skill: 'dsa.sorting.elementary',
    difficulty: 1,
    statement:
      'Sort the array ascending. Implement insertion sort yourself for practice — the judge only checks the output.',
    inputFormat: 'n\na1 … an',
    outputFormat: 'The sorted array on one line.',
    constraints: '1 ≤ n ≤ 2000',
    hints: ['Insertion sort: shift larger elements right, drop the key into the gap.'],
    algorithmId: 'insertion-sort',
    tags: ['sorting'],
    samples: ['6\n5 1 4 2 8 3'],
    generate: (r) => {
      const n = r.int(1, 60);
      return `${n}\n${arr(r.array(n, -100, 100))}`;
    },
    solve: (i) => arr([...nAndArray(i).a].sort((x, y) => x - y)),
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    for (int i = 1; i < n; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 < n ? ' ' : '\\n');
}`,
  },
  {
    slug: 'merge-intervals',
    title: 'Merge Overlapping Intervals',
    skill: 'dsa.greedy',
    difficulty: 3,
    statement:
      'Merge all overlapping intervals (touching endpoints overlap). Print the merged intervals sorted by start.',
    inputFormat: 'n\nthen n lines: start end',
    outputFormat: 'One merged interval per line: start end',
    constraints: '1 ≤ n ≤ 10^5, start ≤ end',
    hints: [
      'Sort by start.',
      'Extend the current interval while the next one starts before it ends.',
    ],
    tags: ['greedy', 'sorting'],
    samples: ['4\n1 3\n2 6\n8 10\n15 18', '2\n1 4\n4 5'],
    generate: (r) => {
      const n = r.int(1, 15);
      return `${n}\n${Array.from({ length: n }, () => {
        const s = r.int(0, 40);
        return `${s} ${s + r.int(0, 8)}`;
      }).join('\n')}`;
    },
    solve: (i) => {
      const iv = lines(i)
        .slice(1)
        .map((l) => ints(l) as [number, number])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const out: [number, number][] = [];
      for (const [s, e] of iv) {
        const last = out[out.length - 1];
        if (last && s <= last[1]) last[1] = Math.max(last[1], e);
        else out.push([s, e]);
      }
      return out.map(([s, e]) => `${s} ${e}`).join('\n');
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    vector<pair<int,int>> v(n);
    for (auto& [s, e] : v) cin >> s >> e;
    sort(v.begin(), v.end());
    vector<pair<int,int>> out;
    for (auto [s, e] : v) {
        if (!out.empty() && s <= out.back().second) out.back().second = max(out.back().second, e);
        else out.push_back({s, e});
    }
    for (auto [s, e] : out) cout << s << ' ' << e << "\\n";
}`,
  },

  // ── Recursion & stacks ────────────────────────────────────────────────────
  {
    slug: 'fibonacci',
    title: 'Fibonacci Number',
    skill: 'dsa.recursion',
    difficulty: 1,
    statement:
      'Print F(n) where F(0) = 0, F(1) = 1, F(n) = F(n−1) + F(n−2). Naive recursion is too slow for n = 90 — memoize.',
    inputFormat: 'n',
    outputFormat: 'F(n)',
    constraints: '0 ≤ n ≤ 90',
    hints: ['Each F(k) is needed many times — store it once.'],
    tags: ['recursion', 'memoization'],
    samples: ['10', '1'],
    generate: (r) => String(r.int(0, 90)),
    solve: (i) => {
      let a = 0n;
      let b = 1n;
      for (let k = 0; k < Number(i.trim()); k++) [a, b] = [b, a + b];
      return String(a);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
long long memo[91];
bool done[91];
long long fib(int n) {
    if (n < 2) return n;
    if (done[n]) return memo[n];
    done[n] = true;
    return memo[n] = fib(n - 1) + fib(n - 2);
}
int main() { int n; cin >> n; cout << fib(n) << "\\n"; }`,
  },
  {
    slug: 'balanced-brackets',
    title: 'Balanced Brackets',
    skill: 'dsa.stacks-queues.stack',
    difficulty: 1,
    statement: 'Decide whether the string of brackets ()[]{} is balanced.',
    inputFormat: 's',
    outputFormat: 'YES or NO',
    constraints: '1 ≤ |s| ≤ 10^5',
    hints: ['Push openers; every closer must match the top.'],
    algorithmId: 'valid-parentheses',
    tags: ['stack'],
    samples: ['{[()()]}', '([)]', '(('],
    generate: (r) => Array.from({ length: r.int(1, 14) }, () => '()[]{}'[r.int(0, 5)]).join(''),
    solve: (i) => {
      const st: string[] = [];
      const m: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
      for (const c of i.trim()) {
        if (!(c in m)) st.push(c);
        else if (st.pop() !== m[c]) return 'NO';
      }
      return st.length ? 'NO' : 'YES';
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s; cin >> s;
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') { st.push(c); continue; }
        char want = c == ')' ? '(' : c == ']' ? '[' : '{';
        if (st.empty() || st.top() != want) { cout << "NO\\n"; return 0; }
        st.pop();
    }
    cout << (st.empty() ? "YES" : "NO") << "\\n";
}`,
  },
  {
    slug: 'next-greater',
    title: 'Next Greater Element',
    skill: 'dsa.stacks-queues.monotonic-stack',
    difficulty: 3,
    statement: 'For each element print the first larger element to its right, or -1.',
    inputFormat: 'n\na1 … an',
    outputFormat: 'n values on one line.',
    constraints: '1 ≤ n ≤ 10^5',
    hints: ['Keep a stack of indices still waiting for a larger value; its values decrease.'],
    algorithmId: 'next-greater-element',
    tags: ['monotonic-stack'],
    samples: ['7\n4 5 2 10 8 1 3'],
    generate: (r) => {
      const n = r.int(1, 40);
      return `${n}\n${arr(r.array(n, 0, 30))}`;
    },
    solve: (i) => {
      const a = nAndArray(i).a;
      return arr(a.map((v, k) => a.slice(k + 1).find((w) => w > v) ?? -1));
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    vector<int> a(n), res(n, -1), st;
    for (auto& x : a) cin >> x;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.back()] < a[i]) { res[st.back()] = a[i]; st.pop_back(); }
        st.push_back(i);
    }
    for (int i = 0; i < n; i++) cout << res[i] << (i + 1 < n ? ' ' : '\\n');
}`,
  },

  // ── Trees & heaps ─────────────────────────────────────────────────────────
  {
    slug: 'bst-height',
    title: 'Height of a BST',
    skill: 'dsa.trees.bst',
    difficulty: 2,
    statement:
      'Insert the values into an empty BST in order (equal values go right). Print the height: the number of nodes on the longest root-to-leaf path.',
    inputFormat: 'n\na1 … an',
    outputFormat: 'The height.',
    constraints: '1 ≤ n ≤ 2000',
    hints: ['Track depth while inserting — no need to build pointers at all.'],
    algorithmId: 'bst-insert',
    tags: ['bst'],
    samples: ['7\n50 30 70 20 40 60 80', '5\n10 20 30 40 50'],
    generate: (r) => {
      const n = r.int(1, 40);
      return `${n}\n${arr(r.array(n, 0, 99))}`;
    },
    solve: (i) => {
      type N = { v: number; l?: N; r?: N };
      let root: N | undefined;
      let h = 0;
      for (const v of nAndArray(i).a) {
        if (!root) {
          root = { v };
          h = 1;
          continue;
        }
        let cur = root;
        let d = 1;
        for (;;) {
          d++;
          if (v < cur.v) {
            if (!cur.l) {
              cur.l = { v };
              break;
            }
            cur = cur.l;
          } else {
            if (!cur.r) {
              cur.r = { v };
              break;
            }
            cur = cur.r;
          }
        }
        h = Math.max(h, d);
      }
      return String(h);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
struct Node { int v; Node *l = nullptr, *r = nullptr; Node(int v) : v(v) {} };
int main() {
    int n; cin >> n;
    Node* root = nullptr; int h = 0;
    for (int i = 0; i < n; i++) {
        int v; cin >> v;
        if (!root) { root = new Node(v); h = 1; continue; }
        Node* cur = root; int d = 1;
        while (true) {
            d++;
            Node*& next = v < cur->v ? cur->l : cur->r;
            if (!next) { next = new Node(v); break; }
            cur = next;
        }
        h = max(h, d);
    }
    cout << h << "\\n";
}`,
  },
  {
    slug: 'level-order-sums',
    title: 'Level Sums of a BST',
    skill: 'dsa.trees.traversal',
    difficulty: 3,
    statement:
      'Build a BST by inserting the values in order (equal values go right). Print the sum of each level, top to bottom, on one line.',
    inputFormat: 'n\na1 … an',
    outputFormat: 'Level sums separated by spaces.',
    constraints: '1 ≤ n ≤ 2000',
    hints: ['BFS with a queue; process one level (the queue size at its start) at a time.'],
    algorithmId: 'level-order-traversal',
    tags: ['bfs', 'trees'],
    samples: ['7\n50 30 70 20 40 60 80'],
    generate: (r) => {
      const n = r.int(1, 30);
      return `${n}\n${arr(r.array(n, 1, 99))}`;
    },
    solve: (i) => {
      type N = { v: number; l?: N; r?: N };
      let root: N | undefined;
      for (const v of nAndArray(i).a) {
        if (!root) {
          root = { v };
          continue;
        }
        let cur = root;
        for (;;) {
          if (v < cur.v) {
            if (!cur.l) {
              cur.l = { v };
              break;
            }
            cur = cur.l;
          } else {
            if (!cur.r) {
              cur.r = { v };
              break;
            }
            cur = cur.r;
          }
        }
      }
      const sums: number[] = [];
      let level = root ? [root] : [];
      while (level.length) {
        sums.push(level.reduce((s, x) => s + x.v, 0));
        level = level.flatMap((x) => [x.l, x.r].filter((y): y is N => !!y));
      }
      return arr(sums);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
struct Node { int v; Node *l = nullptr, *r = nullptr; Node(int v) : v(v) {} };
int main() {
    int n; cin >> n;
    Node* root = nullptr;
    for (int i = 0; i < n; i++) {
        int v; cin >> v;
        Node** at = &root;
        while (*at) at = v < (*at)->v ? &(*at)->l : &(*at)->r;
        *at = new Node(v);
    }
    queue<Node*> q; q.push(root);
    vector<long long> sums;
    while (!q.empty()) {
        long long s = 0;
        for (int k = q.size(); k > 0; k--) {
            Node* x = q.front(); q.pop(); s += x->v;
            if (x->l) q.push(x->l);
            if (x->r) q.push(x->r);
        }
        sums.push_back(s);
    }
    for (size_t i = 0; i < sums.size(); i++) cout << sums[i] << (i + 1 < sums.size() ? ' ' : '\\n');
}`,
  },
  {
    slug: 'kth-smallest',
    title: 'k-th Smallest Element',
    skill: 'dsa.heaps',
    difficulty: 2,
    statement: 'Print the k-th smallest value (1-indexed) of the array.',
    inputFormat: 'n k\na1 … an',
    outputFormat: 'The k-th smallest value.',
    constraints: '1 ≤ k ≤ n ≤ 10^5',
    hints: ['A max-heap of size k keeps the k smallest seen so far; its top is the answer.'],
    algorithmId: 'heap-push',
    tags: ['heap'],
    samples: ['6 2\n7 10 4 3 20 15'],
    generate: (r) => {
      const n = r.int(1, 50);
      return `${n} ${r.int(1, n)}\n${arr(r.array(n, 0, 100))}`;
    },
    solve: (i) => {
      const { head, a } = nAndArray(i);
      return String([...a].sort((x, y) => x - y)[head[1]! - 1]);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, k; cin >> n >> k;
    priority_queue<int> heap;
    for (int i = 0; i < n; i++) {
        int x; cin >> x; heap.push(x);
        if ((int)heap.size() > k) heap.pop();
    }
    cout << heap.top() << "\\n";
}`,
  },

  // ── Graphs ────────────────────────────────────────────────────────────────
  {
    slug: 'connected-components',
    title: 'Connected Components',
    skill: 'dsa.graphs.traversal',
    difficulty: 2,
    statement: 'Count the connected components of an undirected graph with nodes 1..n.',
    inputFormat: 'n m\nthen m lines: u v',
    outputFormat: 'The number of components.',
    constraints: '1 ≤ n ≤ 10^5, 0 ≤ m ≤ 2·10^5',
    hints: ['Start a BFS/DFS from every unvisited node; each start is a new component.'],
    algorithmId: 'dfs',
    tags: ['graphs', 'dfs'],
    samples: ['5 3\n1 2\n2 3\n4 5', '3 0'],
    generate: (r) => {
      const n = r.int(1, 25);
      const m = r.int(0, n + 3);
      return `${n} ${m}\n${Array.from({ length: m }, () => `${r.int(1, n)} ${r.int(1, n)}`).join('\n')}`.trim();
    },
    solve: (i) => {
      const ls = lines(i);
      const [n] = ints(ls[0]!);
      const parent = Array.from({ length: n! + 1 }, (_, k) => k);
      const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
      for (const l of ls.slice(1)) {
        const [u, v] = ints(l);
        parent[find(u!)] = find(v!);
      }
      let c = 0;
      for (let k = 1; k <= n!; k++) if (find(k) === k) c++;
      return String(c);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m; cin >> n >> m;
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < m; i++) { int u, v; cin >> u >> v; adj[u].push_back(v); adj[v].push_back(u); }
    vector<bool> seen(n + 1, false);
    int comps = 0;
    for (int s = 1; s <= n; s++) {
        if (seen[s]) continue;
        comps++;
        stack<int> st; st.push(s); seen[s] = true;
        while (!st.empty()) {
            int u = st.top(); st.pop();
            for (int v : adj[u]) if (!seen[v]) { seen[v] = true; st.push(v); }
        }
    }
    cout << comps << "\\n";
}`,
  },
  {
    slug: 'shortest-path-unweighted',
    title: 'Fewest Hops',
    skill: 'dsa.graphs.traversal',
    difficulty: 3,
    statement:
      'In an undirected graph, print the minimum number of edges from s to t, or -1 if t is unreachable.',
    inputFormat: 'n m s t\nthen m lines: u v',
    outputFormat: 'The distance or -1.',
    constraints: '1 ≤ n ≤ 10^5',
    hints: ['BFS visits nodes in non-decreasing distance — the first time you reach t is optimal.'],
    algorithmId: 'bfs',
    tags: ['graphs', 'bfs'],
    samples: ['6 6 1 6\n1 2\n1 3\n2 4\n3 4\n4 5\n5 6', '3 1 1 3\n1 2'],
    generate: (r) => {
      const n = r.int(2, 20);
      const m = r.int(0, n * 2);
      return `${n} ${m} ${r.int(1, n)} ${r.int(1, n)}\n${Array.from({ length: m }, () => `${r.int(1, n)} ${r.int(1, n)}`).join('\n')}`.trim();
    },
    solve: (i) => {
      const ls = lines(i);
      const [n, , s, t] = ints(ls[0]!);
      const adj: number[][] = Array.from({ length: n! + 1 }, () => []);
      for (const l of ls.slice(1)) {
        const [u, v] = ints(l);
        adj[u!]!.push(v!);
        adj[v!]!.push(u!);
      }
      const dist = Array(n! + 1).fill(-1);
      dist[s!] = 0;
      const q = [s!];
      while (q.length) {
        const u = q.shift()!;
        for (const v of adj[u]!)
          if (dist[v] === -1) {
            dist[v] = dist[u] + 1;
            q.push(v);
          }
      }
      return String(dist[t!]);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m, s, t; cin >> n >> m >> s >> t;
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < m; i++) { int u, v; cin >> u >> v; adj[u].push_back(v); adj[v].push_back(u); }
    vector<int> dist(n + 1, -1);
    queue<int> q; q.push(s); dist[s] = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u]) if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }
    }
    cout << dist[t] << "\\n";
}`,
  },
  {
    slug: 'dijkstra-distances',
    title: 'Shortest Distances (Dijkstra)',
    skill: 'dsa.graphs.shortest-path',
    difficulty: 4,
    statement:
      'Directed graph with non-negative weights. Print the shortest distance from node 1 to every node 1..n (-1 if unreachable).',
    inputFormat: 'n m\nthen m lines: u v w',
    outputFormat: 'n distances on one line.',
    constraints: '1 ≤ n ≤ 10^5, 0 ≤ w ≤ 10^9 (use 64-bit)',
    hints: ['Min-heap of (distance, node).', 'Skip stale heap entries where d > dist[u].'],
    algorithmId: 'dijkstra',
    tags: ['graphs', 'dijkstra', 'heap'],
    samples: ['5 6\n1 2 4\n1 3 2\n3 2 1\n2 4 5\n3 4 8\n4 5 3', '3 1\n2 3 5'],
    generate: (r) => {
      const n = r.int(1, 15);
      const m = r.int(0, n * 3);
      return `${n} ${m}\n${Array.from({ length: m }, () => `${r.int(1, n)} ${r.int(1, n)} ${r.int(0, 20)}`).join('\n')}`.trim();
    },
    solve: (i) => {
      const ls = lines(i);
      const [n] = ints(ls[0]!);
      const edges = ls.slice(1).map((l) => ints(l));
      const dist = Array(n! + 1).fill(Infinity);
      dist[1] = 0;
      for (let k = 0; k < n!; k++)
        for (const [u, v, w] of edges) if (dist[u!] + w! < dist[v!]) dist[v!] = dist[u!] + w!;
      return arr(dist.slice(1).map((d) => (d === Infinity ? -1 : d)));
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m; cin >> n >> m;
    vector<vector<pair<int,long long>>> adj(n + 1);
    for (int i = 0; i < m; i++) { int u, v; long long w; cin >> u >> v >> w; adj[u].push_back({v, w}); }
    const long long INF = LLONG_MAX;
    vector<long long> dist(n + 1, INF);
    priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
    dist[1] = 0; pq.push({0, 1});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; pq.push({dist[v], v}); }
    }
    for (int i = 1; i <= n; i++) cout << (dist[i] == INF ? -1 : dist[i]) << (i < n ? ' ' : '\\n');
}`,
  },
  {
    slug: 'course-schedule',
    title: 'Can You Finish All Courses?',
    skill: 'dsa.graphs.topological-sort',
    difficulty: 3,
    statement:
      'Courses 1..n; each line "a b" means b must be taken before a. Can every course be completed?',
    inputFormat: 'n m\nthen m lines: a b',
    outputFormat: 'YES or NO',
    constraints: '1 ≤ n ≤ 10^5',
    hints: ["Kahn's algorithm: if fewer than n nodes are taken, there is a cycle."],
    algorithmId: 'topological-sort',
    tags: ['graphs', 'topological-sort'],
    samples: ['3 2\n2 1\n3 2', '2 2\n1 2\n2 1'],
    generate: (r) => {
      const n = r.int(1, 12);
      const m = r.int(0, n + 2);
      return `${n} ${m}\n${Array.from({ length: m }, () => `${r.int(1, n)} ${r.int(1, n)}`).join('\n')}`.trim();
    },
    solve: (i) => {
      const ls = lines(i);
      const [n] = ints(ls[0]!);
      const indeg = Array(n! + 1).fill(0);
      const adj: number[][] = Array.from({ length: n! + 1 }, () => []);
      for (const l of ls.slice(1)) {
        const [a, b] = ints(l);
        adj[b!]!.push(a!);
        indeg[a!]++;
      }
      const q: number[] = [];
      for (let k = 1; k <= n!; k++) if (indeg[k] === 0) q.push(k);
      let taken = 0;
      while (q.length) {
        const u = q.shift()!;
        taken++;
        for (const v of adj[u]!) if (--indeg[v] === 0) q.push(v);
      }
      return taken === n ? 'YES' : 'NO';
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, m; cin >> n >> m;
    vector<vector<int>> adj(n + 1);
    vector<int> indeg(n + 1, 0);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; adj[b].push_back(a); indeg[a]++; }
    queue<int> q;
    for (int i = 1; i <= n; i++) if (indeg[i] == 0) q.push(i);
    int taken = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop(); taken++;
        for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
    }
    cout << (taken == n ? "YES" : "NO") << "\\n";
}`,
  },
  {
    slug: 'number-of-islands',
    title: 'Number of Islands',
    skill: 'dsa.graphs.grid',
    difficulty: 3,
    statement: 'Count the islands: groups of 1-cells connected up/down/left/right.',
    inputFormat: 'r c\nthen r lines of c digits (0 or 1), separated by spaces',
    outputFormat: 'The number of islands.',
    constraints: '1 ≤ r, c ≤ 500',
    hints: ['Each unvisited land cell starts a flood fill that sinks its whole island.'],
    algorithmId: 'flood-fill',
    tags: ['graphs', 'grid', 'bfs'],
    samples: ['4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1'],
    generate: (r) => {
      const rows = r.int(1, 8);
      const cols = r.int(1, 8);
      return `${rows} ${cols}\n${Array.from({ length: rows }, () => arr(r.array(cols, 0, 1))).join('\n')}`;
    },
    solve: (i) => {
      const ls = lines(i);
      const [R, C] = ints(ls[0]!);
      const g = ls.slice(1).map((l) => ints(l));
      let count = 0;
      for (let y = 0; y < R!; y++)
        for (let x = 0; x < C!; x++) {
          if (g[y]![x] !== 1) continue;
          count++;
          const st = [[y, x]];
          g[y]![x] = 0;
          while (st.length) {
            const [cy, cx] = st.pop()!;
            for (const [dy, dx] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]) {
              const ny = cy! + dy!;
              const nx = cx! + dx!;
              if (ny >= 0 && ny < R! && nx >= 0 && nx < C! && g[ny]![nx] === 1) {
                g[ny]![nx] = 0;
                st.push([ny, nx]);
              }
            }
          }
        }
      return String(count);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int R, C; cin >> R >> C;
    vector<vector<int>> g(R, vector<int>(C));
    for (auto& row : g) for (auto& x : row) cin >> x;
    int count = 0, dy[] = {1, -1, 0, 0}, dx[] = {0, 0, 1, -1};
    for (int y = 0; y < R; y++) for (int x = 0; x < C; x++) {
        if (g[y][x] != 1) continue;
        count++;
        stack<pair<int,int>> st; st.push({y, x}); g[y][x] = 0;
        while (!st.empty()) {
            auto [cy, cx] = st.top(); st.pop();
            for (int k = 0; k < 4; k++) {
                int ny = cy + dy[k], nx = cx + dx[k];
                if (ny >= 0 && ny < R && nx >= 0 && nx < C && g[ny][nx] == 1) { g[ny][nx] = 0; st.push({ny, nx}); }
            }
        }
    }
    cout << count << "\\n";
}`,
  },

  // ── Dynamic programming ───────────────────────────────────────────────────
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    skill: 'dsa.dp.1d',
    difficulty: 1,
    statement:
      'You climb 1 or 2 steps at a time. How many distinct ways reach step n? Print the answer modulo 1 000 000 007.',
    inputFormat: 'n',
    outputFormat: 'ways(n) mod 1e9+7',
    constraints: '1 ≤ n ≤ 10^6',
    hints: ['ways(n) = ways(n−1) + ways(n−2).'],
    tags: ['dp'],
    samples: ['3', '10'],
    generate: (r) => String(r.int(1, 100000)),
    solve: (i) => {
      const n = Number(i.trim());
      let a = 1;
      let b = 1;
      for (let k = 2; k <= n; k++) [a, b] = [b, (a + b) % MOD];
      return String(b);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    const long long MOD = 1000000007;
    long long a = 1, b = 1;
    for (int k = 2; k <= n; k++) { long long c = (a + b) % MOD; a = b; b = c; }
    cout << b << "\\n";
}`,
  },
  {
    slug: 'min-coins',
    title: 'Minimum Coins',
    skill: 'dsa.dp.1d',
    difficulty: 3,
    statement:
      'Using unlimited coins of the given denominations, make the amount with as few coins as possible. Print -1 if it is impossible.',
    inputFormat: 'k amount\nc1 … ck',
    outputFormat: 'The minimum number of coins, or -1.',
    constraints: '1 ≤ k ≤ 50, 0 ≤ amount ≤ 10^4',
    hints: [
      'dp[x] = 1 + min over coins c ≤ x of dp[x − c].',
      'Greedy fails for coins {1, 3, 4} and amount 6.',
    ],
    algorithmId: 'coin-change',
    tags: ['dp'],
    samples: ['3 6\n1 3 4', '2 3\n2 4'],
    generate: (r) => {
      const k = r.int(1, 4);
      return `${k} ${r.int(0, 60)}\n${arr(r.array(k, 1, 15))}`;
    },
    solve: (i) => {
      const { head, a } = nAndArray(i);
      const amount = head[1]!;
      const dp = Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let x = 1; x <= amount; x++)
        for (const c of a) if (c <= x) dp[x] = Math.min(dp[x], dp[x - c] + 1);
      return String(dp[amount] === Infinity ? -1 : dp[amount]);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int k, amount; cin >> k >> amount;
    vector<int> coins(k);
    for (auto& c : coins) cin >> c;
    vector<int> dp(amount + 1, INT_MAX);
    dp[0] = 0;
    for (int x = 1; x <= amount; x++)
        for (int c : coins)
            if (c <= x && dp[x - c] != INT_MAX) dp[x] = min(dp[x], dp[x - c] + 1);
    cout << (dp[amount] == INT_MAX ? -1 : dp[amount]) << "\\n";
}`,
  },
  {
    slug: 'lcs-length',
    title: 'Longest Common Subsequence',
    skill: 'dsa.dp.2d',
    difficulty: 4,
    statement: 'Print the length of the longest common subsequence of strings a and b.',
    inputFormat: 'a\nb',
    outputFormat: 'The LCS length.',
    constraints: '1 ≤ |a|, |b| ≤ 3000',
    hints: [
      'dp[i][j] = LCS of a[0..i) and b[0..j).',
      'Match → 1 + dp[i−1][j−1]; otherwise max of dropping one character.',
    ],
    tags: ['dp'],
    samples: ['abcde\nace', 'abc\ndef'],
    generate: (r) => {
      const s = () => Array.from({ length: r.int(1, 25) }, () => 'abcd'[r.int(0, 3)]).join('');
      return `${s()}\n${s()}`;
    },
    solve: (i) => {
      const [a = '', b = ''] = lines(i).map((l) => l.trim());
      const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
      for (let x = 1; x <= a.length; x++)
        for (let y = 1; y <= b.length; y++)
          dp[x]![y] =
            a[x - 1] === b[y - 1]
              ? dp[x - 1]![y - 1]! + 1
              : Math.max(dp[x - 1]![y]!, dp[x]![y - 1]!);
      return String(dp[a.length]![b.length]);
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string a, b; cin >> a >> b;
    vector<vector<int>> dp(a.size() + 1, vector<int>(b.size() + 1, 0));
    for (size_t i = 1; i <= a.size(); i++)
        for (size_t j = 1; j <= b.size(); j++)
            dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1] + 1 : max(dp[i-1][j], dp[i][j-1]);
    cout << dp[a.size()][b.size()] << "\\n";
}`,
  },
  {
    slug: 'subsets-sum',
    title: 'Count Subsets with Sum',
    skill: 'dsa.backtracking',
    difficulty: 3,
    statement:
      'Count the subsets (by position) of the array whose elements sum to target. The empty subset counts if target is 0.',
    inputFormat: 'n target\na1 … an',
    outputFormat: 'The count.',
    constraints: '1 ≤ n ≤ 20',
    hints: ['At each index, branch: take it or skip it.'],
    tags: ['backtracking', 'recursion'],
    samples: ['4 5\n1 2 3 4', '3 0\n1 2 3'],
    generate: (r) => {
      const n = r.int(1, 12);
      return `${n} ${r.int(0, 20)}\n${arr(r.array(n, 0, 8))}`;
    },
    solve: (i) => {
      const { head, a } = nAndArray(i);
      const t = head[1]!;
      const go = (k: number, s: number): number =>
        k === a.length ? (s === t ? 1 : 0) : go(k + 1, s) + go(k + 1, s + a[k]!);
      return String(go(0, 0));
    },
    cpp: `#include <bits/stdc++.h>
using namespace std;
int n; long long target; vector<long long> a;
long long go(int k, long long s) {
    if (k == n) return s == target;
    return go(k + 1, s) + go(k + 1, s + a[k]);
}
int main() {
    cin >> n >> target; a.resize(n);
    for (auto& x : a) cin >> x;
    cout << go(0, 0) << "\\n";
}`,
  },
];
