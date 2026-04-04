/**
 * DSA Algorithms for Stock Analytics — C++ Source
 * Compiled to WebAssembly (public/wasm/dsa.wasm) using Emscripten.
 * 
 * Build command:
 *   nix shell nixpkgs#emscripten -c emcc src/lib/wasm/dsa/dsa.cpp -O2 \
 *     -s WASM=1 -s ENVIRONMENT=web -s MODULARIZE -s EXPORT_ES6 \
 *     -s EXPORTED_FUNCTIONS='["_calculateMaxProfit","_calculateStockSpan","_calculateNextGreaterElement","_calculateVolatility","_getSpanBuffer","_getNgeBuffer","_malloc","_free"]' \
 *     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","HEAPF64"]' \
 *     -o src/lib/wasm/dsa/dsa.js
 * 
 * Then copy: cp src/lib/wasm/dsa/dsa.wasm public/wasm/dsa.wasm
 * 
 * Algorithms:
 *   1. Max Profit (Greedy)        — O(n) single-pass buy-sell optimization
 *   2. Stock Span (Stack)         — O(n) consecutive-day span calculation
 *   3. Next Greater Element (Stack)— O(n) monotonic stack pattern
 *   4. Volatility (Statistics)    — O(n) standard deviation of prices
 */

#include <emscripten/emscripten.h>
#include <cmath>
#include <cstring>

// Shared buffers for returning arrays (max 200 data points)
static double span_buffer[200];
static double nge_buffer[200];

extern "C" {

/**
 * Greedy Max Profit — Best time to buy and sell stock.
 * Tracks minimum price seen so far and maximum profit achievable.
 * Time: O(n), Space: O(1)
 */
EMSCRIPTEN_KEEPALIVE
double calculateMaxProfit(const double* prices, int n) {
    if (n < 2) return 0.0;
    double minPrice = prices[0];
    double maxProfit = 0.0;
    for (int i = 1; i < n; i++) {
        double profit = prices[i] - minPrice;
        if (profit > maxProfit) maxProfit = profit;
        if (prices[i] < minPrice) minPrice = prices[i];
    }
    return round(maxProfit * 100.0) / 100.0;
}

/**
 * Stock Span using Monotonic Stack.
 * For each day, calculates the number of consecutive days
 * (going backwards) where the price was <= current day's price.
 * Time: O(n), Space: O(n)
 */
EMSCRIPTEN_KEEPALIVE
double* calculateStockSpan(const double* prices, int n) {
    int stack[200];
    int top = -1;
    for (int i = 0; i < n; i++) {
        while (top >= 0 && prices[stack[top]] <= prices[i]) {
            top--;
        }
        span_buffer[i] = (top < 0) ? (i + 1) : (i - stack[top]);
        stack[++top] = i;
    }
    return span_buffer;
}

/**
 * Next Greater Element using Monotonic Stack.
 * For each price, finds the next price that is strictly greater.
 * Returns -1.0 if no greater element exists (mapped to null in JS).
 * Time: O(n), Space: O(n)
 */
EMSCRIPTEN_KEEPALIVE
double* calculateNextGreaterElement(const double* prices, int n) {
    int stack[200];
    int top = -1;
    for (int i = n - 1; i >= 0; i--) {
        while (top >= 0 && prices[stack[top]] <= prices[i]) {
            top--;
        }
        nge_buffer[i] = (top >= 0) ? prices[stack[top]] : -1.0;
        stack[++top] = i;
    }
    return nge_buffer;
}

/**
 * Price Volatility — Standard Deviation.
 * Measures the dispersion of prices from their mean.
 * Time: O(n), Space: O(1)
 */
EMSCRIPTEN_KEEPALIVE
double calculateVolatility(const double* prices, int n) {
    if (n < 2) return 0.0;
    double mean = 0.0;
    for (int i = 0; i < n; i++) mean += prices[i];
    mean /= n;
    double variance = 0.0;
    for (int i = 0; i < n; i++) {
        double diff = prices[i] - mean;
        variance += diff * diff;
    }
    variance /= n;
    return round(sqrt(variance) * 100.0) / 100.0;
}

/** Buffer accessors for JS interop */
EMSCRIPTEN_KEEPALIVE
double* getSpanBuffer() { return span_buffer; }

EMSCRIPTEN_KEEPALIVE
double* getNgeBuffer() { return nge_buffer; }

}
