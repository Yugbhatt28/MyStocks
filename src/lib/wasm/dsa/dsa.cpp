/**
 * Stock Analytics DSA Engine — WebAssembly (C++17)
 *
 * Algorithms:
 *   1. Max Profit        — Greedy O(n) buy-sell optimizer
 *   2. Heap Profit       — Min-heap based buy/sell with indices
 *   3. Stock Span        — Monotonic stack, O(n)
 *   4. Next Greater      — Monotonic stack, O(n)
 *   5. Volatility        — Standard deviation, O(n)
 *   6. Strategy Sim      — Greedy best buy/sell with indices
 *   7. Sliding Window    — Deque-based max/min/avg over window
 *   8. Correlation       — Pearson correlation coefficient
 *   9. Heap Max/Min      — Priority queue for max/min price tracking
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
 *        "_heapMaxPrice","_heapMinPrice","_heapProfit","_getHeapProfitResult", \
 *        "_malloc","_free"]' \
 *     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","HEAPF64"]' \
 *     -o dsa.js
 */

#include <emscripten/emscripten.h>
#include <algorithm>
#include <cmath>

constexpr int MAX_POINTS = 200;
constexpr int MIN_HISTORY = 30; // minimum data points required for trend analysis

static double span_buffer[MAX_POINTS];
static double nge_buffer[MAX_POINTS];
static double strategy_result[3];
static double sliding_window_result[3];
static double heap_profit_result[3];

struct IndexStack {
    int data[MAX_POINTS];
    int top = -1;
    void push(int val) { data[++top] = val; }
    void pop()         { --top; }
    int  peek() const  { return data[top]; }
    bool empty() const { return top < 0; }
};

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

struct MinHeap {
    int indices[MAX_POINTS];
    int size = 0;
    const double* prices = nullptr;
    void init(const double* p) { prices = p; size = 0; }
    void swap_idx(int& a, int& b) { int t = a; a = b; b = t; }
    void push(int idx) {
        indices[size] = idx;
        int i = size++;
        while (i > 0) {
            int parent = (i - 1) / 2;
            if (prices[indices[i]] < prices[indices[parent]]) {
                swap_idx(indices[i], indices[parent]);
                i = parent;
            } else break;
        }
    }
    int top() const { return indices[0]; }
    void pop() {
        indices[0] = indices[--size];
        int i = 0;
        while (true) {
            int smallest = i;
            int left = 2 * i + 1, right = 2 * i + 2;
            if (left < size && prices[indices[left]] < prices[indices[smallest]]) smallest = left;
            if (right < size && prices[indices[right]] < prices[indices[smallest]]) smallest = right;
            if (smallest != i) { swap_idx(indices[i], indices[smallest]); i = smallest; }
            else break;
        }
    }
};

struct MaxHeap {
    int indices[MAX_POINTS];
    int size = 0;
    const double* prices = nullptr;
    void init(const double* p) { prices = p; size = 0; }
    void swap_idx(int& a, int& b) { int t = a; a = b; b = t; }
    void push(int idx) {
        indices[size] = idx;
        int i = size++;
        while (i > 0) {
            int parent = (i - 1) / 2;
            if (prices[indices[i]] > prices[indices[parent]]) {
                swap_idx(indices[i], indices[parent]);
                i = parent;
            } else break;
        }
    }
    int top() const { return indices[0]; }
};

static double roundCents(double value) {
    return std::round(value * 100.0) / 100.0;
}

extern "C" {

// Guard: returns 1 if dataset has enough history for trend analysis, 0 otherwise.
EMSCRIPTEN_KEEPALIVE
int hasSufficientHistory(int n) {
    return n >= MIN_HISTORY ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE
int getMinHistoryRequirement() {
    return MIN_HISTORY;
}

// Max profit — uses incremental MinHeap so the cheapest historical price is tracked
// in O(log n) instead of repeated std::min scans. Signature preserved.
EMSCRIPTEN_KEEPALIVE
double calculateMaxProfit(const double* prices, int n) {
    if (n < 2) return 0.0;
    MinHeap heap;
    heap.init(prices);
    heap.push(0);
    double maxProfit = 0.0;
    for (int i = 1; i < n; ++i) {
        double profit = prices[i] - prices[heap.top()];
        if (profit > maxProfit) maxProfit = profit;
        heap.push(i);
    }
    return roundCents(maxProfit);
}

EMSCRIPTEN_KEEPALIVE
double* calculateStockSpan(const double* prices, int n) {
    IndexStack stack;
    for (int i = 0; i < n; ++i) {
        while (!stack.empty() && prices[stack.peek()] <= prices[i]) stack.pop();
        span_buffer[i] = stack.empty() ? (i + 1) : (i - stack.peek());
        stack.push(i);
    }
    return span_buffer;
}

EMSCRIPTEN_KEEPALIVE
double* calculateNextGreaterElement(const double* prices, int n) {
    IndexStack stack;
    for (int i = n - 1; i >= 0; --i) {
        while (!stack.empty() && prices[stack.peek()] <= prices[i]) stack.pop();
        nge_buffer[i] = stack.empty() ? -1.0 : prices[stack.peek()];
        stack.push(i);
    }
    return nge_buffer;
}

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

// Strategy simulation — uses MinHeap to track cheapest buy index (no std::min scan).
EMSCRIPTEN_KEEPALIVE
double* simulateStrategy(const double* prices, int n) {
    strategy_result[0] = 0; strategy_result[1] = 0; strategy_result[2] = 0;
    if (n < 2) return strategy_result;
    MinHeap heap;
    heap.init(prices);
    heap.push(0);
    int bestBuy = 0;
    double maxProfit = 0.0;
    for (int i = 1; i < n; ++i) {
        int minIdx = heap.top();
        double profit = prices[i] - prices[minIdx];
        if (profit > maxProfit) { maxProfit = profit; bestBuy = minIdx; strategy_result[1] = i; }
        heap.push(i);
    }
    strategy_result[0] = bestBuy;
    strategy_result[2] = roundCents(maxProfit);
    return strategy_result;
}

EMSCRIPTEN_KEEPALIVE double* getStrategyResult() { return strategy_result; }

EMSCRIPTEN_KEEPALIVE
double* slidingWindowAnalysis(const double* prices, int n, int windowSize) {
    sliding_window_result[0] = 0; sliding_window_result[1] = 0; sliding_window_result[2] = 0;
    if (n <= 0 || windowSize <= 0) return sliding_window_result;
    int w = std::min(windowSize, n);
    IndexDeque maxDeque, minDeque;
    int startIdx = n - w;
    maxDeque.clear(); minDeque.clear();
    double sum = 0.0;
    for (int i = startIdx; i < n; ++i) {
        while (!maxDeque.empty() && prices[maxDeque.back()] <= prices[i]) maxDeque.pop_back();
        maxDeque.push_back(i);
        while (!minDeque.empty() && prices[minDeque.back()] >= prices[i]) minDeque.pop_back();
        minDeque.push_back(i);
        while (!maxDeque.empty() && maxDeque.front() < startIdx) maxDeque.pop_front();
        while (!minDeque.empty() && minDeque.front() < startIdx) minDeque.pop_front();
        sum += prices[i];
    }
    sliding_window_result[0] = roundCents(prices[maxDeque.front()]);
    sliding_window_result[1] = roundCents(prices[minDeque.front()]);
    sliding_window_result[2] = roundCents(sum / w);
    return sliding_window_result;
}

EMSCRIPTEN_KEEPALIVE double* getSlidingWindowResult() { return sliding_window_result; }

EMSCRIPTEN_KEEPALIVE
double computeCorrelation(const double* pricesA, int nA, const double* pricesB, int nB) {
    int n = std::min(nA, nB);
    if (n < 2) return 0.0;
    double meanA = 0.0, meanB = 0.0;
    for (int i = 0; i < n; ++i) { meanA += pricesA[i]; meanB += pricesB[i]; }
    meanA /= n; meanB /= n;
    double cov = 0.0, varA = 0.0, varB = 0.0;
    for (int i = 0; i < n; ++i) {
        double diffA = pricesA[i] - meanA, diffB = pricesB[i] - meanB;
        cov += diffA * diffB; varA += diffA * diffA; varB += diffB * diffB;
    }
    double denom = std::sqrt(varA * varB);
    if (denom < 1e-10) return 0.0;
    return std::max(-1.0, std::min(1.0, cov / denom));
}

// ==================== NEW: HEAP-BASED MAX/MIN PRICE ====================

EMSCRIPTEN_KEEPALIVE
double heapMaxPrice(const double* prices, int n) {
    if (n <= 0) return 0.0;
    MaxHeap heap;
    heap.init(prices);
    for (int i = 0; i < n; ++i) heap.push(i);
    return roundCents(prices[heap.top()]);
}

EMSCRIPTEN_KEEPALIVE
double heapMinPrice(const double* prices, int n) {
    if (n <= 0) return 0.0;
    MinHeap heap;
    heap.init(prices);
    for (int i = 0; i < n; ++i) heap.push(i);
    return roundCents(prices[heap.top()]);
}

// ==================== NEW: HEAP-BASED PROFIT ====================

EMSCRIPTEN_KEEPALIVE
double* heapProfit(const double* prices, int n) {
    heap_profit_result[0] = 0; heap_profit_result[1] = 0; heap_profit_result[2] = 0;
    if (n < 2) return heap_profit_result;
    MinHeap heap;
    heap.init(prices);
    heap.push(0);
    double maxProfit = 0.0;
    int bestBuy = 0, bestSell = 0;
    for (int i = 1; i < n; ++i) {
        int minIdx = heap.top();
        double profit = prices[i] - prices[minIdx];
        if (profit > maxProfit) { maxProfit = profit; bestBuy = minIdx; bestSell = i; }
        heap.push(i);
    }
    heap_profit_result[0] = bestBuy;
    heap_profit_result[1] = bestSell;
    heap_profit_result[2] = roundCents(maxProfit);
    return heap_profit_result;
}

EMSCRIPTEN_KEEPALIVE double* getHeapProfitResult() { return heap_profit_result; }

} // extern "C"