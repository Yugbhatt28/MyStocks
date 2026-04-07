/**
 * Stock Analytics DSA Engine — WebAssembly (C++17)
 *
 * Algorithms:
 *   1. Max Profit        — Greedy O(n) buy-sell optimizer
 *   2. Stock Span        — Monotonic stack, O(n)
 *   3. Next Greater      — Monotonic stack, O(n)
 *   4. Volatility        — Standard deviation, O(n)
 *   5. Strategy Sim      — Greedy best buy/sell with indices
 *   6. Sliding Window    — Deque-based max/min/avg over window
 *   7. Correlation       — Pearson correlation coefficient
 *
 * Build:
 *   emcc dsa.cpp -O2 -std=c++17 -s WASM=1 -s ENVIRONMENT=web \
 *     -s MODULARIZE -s EXPORT_ES6 \
 *     -s EXPORTED_FUNCTIONS='["_calculateMaxProfit","_calculateStockSpan", \
 *        "_calculateNextGreaterElement","_calculateVolatility", \
 *        "_getSpanBuffer","_getNgeBuffer", \
 *        "_simulateStrategy","_getStrategyResult", \
 *        "_slidingWindowAnalysis","_getSlidingWindowResult", \
 *        "_computeCorrelation", \
 *        "_malloc","_free"]' \
 *     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","HEAPF64"]' \
 *     -o dsa.js
 */

#include <emscripten/emscripten.h>
#include <algorithm>
#include <cmath>

constexpr int MAX_POINTS = 200;

static double span_buffer[MAX_POINTS];
static double nge_buffer[MAX_POINTS];

// Strategy result: [buyIndex, sellIndex, profit]
static double strategy_result[3];

// Sliding window result: [windowMax, windowMin, rollingAvg]
static double sliding_window_result[3];

// Simple fixed-size stack for internal use
struct IndexStack {
    int data[MAX_POINTS];
    int top = -1;

    void push(int val) { data[++top] = val; }
    void pop()         { --top; }
    int  peek() const  { return data[top]; }
    bool empty() const { return top < 0; }
};

// Simple fixed-size deque for sliding window
struct IndexDeque {
    int data[MAX_POINTS + 1];
    int front_idx = 0;
    int back_idx = 0;

    void push_back(int val)  { data[back_idx++] = val; }
    void pop_front()         { front_idx++; }
    void pop_back()          { back_idx--; }
    int  front() const       { return data[front_idx]; }
    int  back() const        { return data[back_idx - 1]; }
    bool empty() const       { return front_idx >= back_idx; }
    void clear()             { front_idx = 0; back_idx = 0; }
};

static double roundCents(double value) {
    return std::round(value * 100.0) / 100.0;
}

extern "C" {

// Track minimum price seen so far; record best sell opportunity.
EMSCRIPTEN_KEEPALIVE
double calculateMaxProfit(const double* prices, int n) {
    if (n < 2) return 0.0;

    double minPrice  = prices[0];
    double maxProfit = 0.0;

    for (int i = 1; i < n; ++i) {
        maxProfit = std::max(maxProfit, prices[i] - minPrice);
        minPrice  = std::min(minPrice,  prices[i]);
    }
    return roundCents(maxProfit);
}

// For each day, count consecutive preceding days with price ≤ today's.
EMSCRIPTEN_KEEPALIVE
double* calculateStockSpan(const double* prices, int n) {
    IndexStack stack;

    for (int i = 0; i < n; ++i) {
        while (!stack.empty() && prices[stack.peek()] <= prices[i])
            stack.pop();

        span_buffer[i] = stack.empty() ? (i + 1) : (i - stack.peek());
        stack.push(i);
    }
    return span_buffer;
}

// For each price, find the next strictly greater price (or -1).
EMSCRIPTEN_KEEPALIVE
double* calculateNextGreaterElement(const double* prices, int n) {
    IndexStack stack;

    for (int i = n - 1; i >= 0; --i) {
        while (!stack.empty() && prices[stack.peek()] <= prices[i])
            stack.pop();

        nge_buffer[i] = stack.empty() ? -1.0 : prices[stack.peek()];
        stack.push(i);
    }
    return nge_buffer;
}

// Standard deviation of prices.
EMSCRIPTEN_KEEPALIVE
double calculateVolatility(const double* prices, int n) {
    if (n < 2) return 0.0;

    double mean = 0.0;
    for (int i = 0; i < n; ++i) mean += prices[i];
    mean /= n;

    double variance = 0.0;
    for (int i = 0; i < n; ++i) {
        double diff = prices[i] - mean;
        variance += diff * diff;
    }
    return roundCents(std::sqrt(variance / n));
}

EMSCRIPTEN_KEEPALIVE double* getSpanBuffer() { return span_buffer; }
EMSCRIPTEN_KEEPALIVE double* getNgeBuffer()  { return nge_buffer; }

// ==================== NEW: STRATEGY SIMULATOR ====================

// Find the best single buy-sell pair: returns pointer to [buyIdx, sellIdx, profit]
EMSCRIPTEN_KEEPALIVE
double* simulateStrategy(const double* prices, int n) {
    strategy_result[0] = 0;  // buyIndex
    strategy_result[1] = 0;  // sellIndex
    strategy_result[2] = 0;  // profit

    if (n < 2) return strategy_result;

    int bestBuy = 0;
    int minIdx = 0;
    double maxProfit = 0.0;

    for (int i = 1; i < n; ++i) {
        double profit = prices[i] - prices[minIdx];
        if (profit > maxProfit) {
            maxProfit = profit;
            bestBuy = minIdx;
            strategy_result[1] = i;  // sellIndex
        }
        if (prices[i] < prices[minIdx]) {
            minIdx = i;
        }
    }

    strategy_result[0] = bestBuy;
    strategy_result[2] = roundCents(maxProfit);
    return strategy_result;
}

EMSCRIPTEN_KEEPALIVE
double* getStrategyResult() { return strategy_result; }

// ==================== NEW: SLIDING WINDOW ANALYTICS ====================

// Compute sliding window max, min, and rolling average for a given window size.
// Returns pointer to [windowMax, windowMin, rollingAvg]
EMSCRIPTEN_KEEPALIVE
double* slidingWindowAnalysis(const double* prices, int n, int windowSize) {
    sliding_window_result[0] = 0;  // windowMax
    sliding_window_result[1] = 0;  // windowMin
    sliding_window_result[2] = 0;  // rollingAvg

    if (n <= 0 || windowSize <= 0) return sliding_window_result;

    int w = std::min(windowSize, n);

    // Use deques for O(n) sliding window max and min
    IndexDeque maxDeque;
    IndexDeque minDeque;

    // We want the last window's max, min, avg
    int startIdx = n - w;

    // Process the last w elements using deque-based sliding window
    maxDeque.clear();
    minDeque.clear();

    double windowMax = prices[startIdx];
    double windowMin = prices[startIdx];
    double sum = 0.0;

    for (int i = startIdx; i < n; ++i) {
        int localIdx = i - startIdx;

        // Max deque: remove elements smaller than current from back
        while (!maxDeque.empty() && prices[maxDeque.back()] <= prices[i])
            maxDeque.pop_back();
        maxDeque.push_back(i);

        // Min deque: remove elements larger than current from back
        while (!minDeque.empty() && prices[minDeque.back()] >= prices[i])
            minDeque.pop_back();
        minDeque.push_back(i);

        // Remove elements outside window from front
        while (!maxDeque.empty() && maxDeque.front() < startIdx)
            maxDeque.pop_front();
        while (!minDeque.empty() && minDeque.front() < startIdx)
            minDeque.pop_front();

        sum += prices[i];
    }

    sliding_window_result[0] = roundCents(prices[maxDeque.front()]);  // windowMax
    sliding_window_result[1] = roundCents(prices[minDeque.front()]);  // windowMin
    sliding_window_result[2] = roundCents(sum / w);                    // rollingAvg

    return sliding_window_result;
}

EMSCRIPTEN_KEEPALIVE
double* getSlidingWindowResult() { return sliding_window_result; }

// ==================== NEW: CORRELATION ANALYSIS ====================

// Pearson correlation between two price arrays of equal length.
// Returns value in [-1, 1], or 0 if computation is invalid.
EMSCRIPTEN_KEEPALIVE
double computeCorrelation(const double* pricesA, int nA,
                          const double* pricesB, int nB) {
    int n = std::min(nA, nB);
    if (n < 2) return 0.0;

    // Compute means
    double meanA = 0.0, meanB = 0.0;
    for (int i = 0; i < n; ++i) {
        meanA += pricesA[i];
        meanB += pricesB[i];
    }
    meanA /= n;
    meanB /= n;

    // Compute covariance and standard deviations
    double cov = 0.0, varA = 0.0, varB = 0.0;
    for (int i = 0; i < n; ++i) {
        double diffA = pricesA[i] - meanA;
        double diffB = pricesB[i] - meanB;
        cov  += diffA * diffB;
        varA += diffA * diffA;
        varB += diffB * diffB;
    }

    double denominator = std::sqrt(varA * varB);
    if (denominator < 1e-10) return 0.0;

    double correlation = cov / denominator;
    // Clamp to [-1, 1] for floating point safety
    return std::max(-1.0, std::min(1.0, correlation));
}

} // extern "C"
