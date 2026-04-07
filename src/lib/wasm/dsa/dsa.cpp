/**
 * Stock Analytics DSA Engine — WebAssembly (C++17)
 *
 * Algorithms:
 *   1. Max Profit   — Greedy O(n) buy-sell optimizer
 *   2. Stock Span   — Monotonic stack, O(n)
 *   3. Next Greater  — Monotonic stack, O(n)
 *   4. Volatility   — Standard deviation, O(n)
 *
 * Build:
 *   emcc dsa.cpp -O2 -std=c++17 -s WASM=1 -s ENVIRONMENT=web \
 *     -s MODULARIZE -s EXPORT_ES6 \
 *     -s EXPORTED_FUNCTIONS='["_calculateMaxProfit","_calculateStockSpan", \
 *        "_calculateNextGreaterElement","_calculateVolatility", \
 *        "_getSpanBuffer","_getNgeBuffer","_malloc","_free"]' \
 *     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","HEAPF64"]' \
 *     -o dsa.js
 */

#include <emscripten/emscripten.h>
#include <algorithm>
#include <cmath>

constexpr int MAX_POINTS = 200;

static double span_buffer[MAX_POINTS];
static double nge_buffer[MAX_POINTS];

// Simple fixed-size stack for internal use
struct IndexStack {
    int data[MAX_POINTS];
    int top = -1;

    void push(int val) { data[++top] = val; }
    void pop()         { --top; }
    int  peek() const  { return data[top]; }
    bool empty() const { return top < 0; }
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

} // extern "C"
