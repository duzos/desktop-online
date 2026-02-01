/**
 * Utility functions for AIT Generator
 */

const Utils = (function() {
    'use strict';

    return {
        /**
         * Format and capitalize an ID string
         * @param {string} input - The input string (e.g., "my_console_name")
         * @returns {string} - Formatted string (e.g., "My Console Name")
         */
        formatAndCapitalize(input) {
            if (!input) return '';
            return input
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        },

        /**
         * Sanitize a string to be used as an ID
         * @param {string} input - The input string
         * @returns {string} - Sanitized string (lowercase, underscores)
         */
        sanitizeId(input) {
            if (!input) return '';
            return input
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '');
        },

        /**
         * Calculate Levenshtein distance between two strings
         * @param {string} a - First string
         * @param {string} b - Second string
         * @returns {number} - Edit distance
         */
        levenshtein(a, b) {
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;

            const matrix = [];

            for (let i = 0; i <= b.length; i++) {
                matrix[i] = [i];
            }

            for (let j = 0; j <= a.length; j++) {
                matrix[0][j] = j;
            }

            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }

            return matrix[b.length][a.length];
        },

        /**
         * Find the best fuzzy match for a string in a list
         * @param {string} target - The string to match
         * @param {string[]} candidates - List of candidate strings
         * @param {number} maxDistance - Maximum allowed distance (default 3)
         * @returns {string|null} - Best match or null if none found
         */
        fuzzyMatch(target, candidates, maxDistance = 3) {
            if (!target || !candidates.length) return null;

            const targetLower = target.toLowerCase();
            let bestMatch = null;
            let bestDistance = Infinity;

            for (const candidate of candidates) {
                const candidateLower = candidate.toLowerCase();

                // Check for substring match first
                if (candidateLower.includes(targetLower) || targetLower.includes(candidateLower)) {
                    return candidate;
                }

                const distance = this.levenshtein(targetLower, candidateLower);
                if (distance < bestDistance && distance <= maxDistance) {
                    bestDistance = distance;
                    bestMatch = candidate;
                }
            }

            return bestMatch;
        },

        /**
         * Read a file as text
         * @param {File} file - The file to read
         * @returns {Promise<string>} - File contents
         */
        readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsText(file);
            });
        },

        /**
         * Read a file as ArrayBuffer
         * @param {File} file - The file to read
         * @returns {Promise<ArrayBuffer>} - File contents
         */
        readFileAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsArrayBuffer(file);
            });
        },

        /**
         * Read a file as Data URL (for images)
         * @param {File} file - The file to read
         * @returns {Promise<string>} - Data URL
         */
        readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsDataURL(file);
            });
        },

        /**
         * Debounce a function
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in ms
         * @returns {Function} - Debounced function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Show a toast notification
         * @param {string} message - Message to show
         * @param {string} type - 'success', 'error', 'info'
         */
        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            // Trigger animation
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        /**
         * Create an element with attributes and children
         * @param {string} tag - Tag name
         * @param {Object} attrs - Attributes
         * @param {Array} children - Child elements or text
         * @returns {HTMLElement}
         */
        createElement(tag, attrs = {}, children = []) {
            const el = document.createElement(tag);

            for (const [key, value] of Object.entries(attrs)) {
                if (key === 'className') {
                    el.className = value;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(el.style, value);
                } else if (key.startsWith('on') && typeof value === 'function') {
                    el.addEventListener(key.slice(2).toLowerCase(), value);
                } else {
                    el.setAttribute(key, value);
                }
            }

            for (const child of children) {
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    el.appendChild(child);
                }
            }

            return el;
        }
    };
})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

