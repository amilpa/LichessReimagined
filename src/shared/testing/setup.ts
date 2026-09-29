// Fills happy-dom's gaps once for every test file, rather than each test
// patching what it needs.

// A table section's `rows`, which the forum's labels read on the table head.
if (!('rows' in HTMLTableSectionElement.prototype)) {
  Object.defineProperty(HTMLTableSectionElement.prototype, 'rows', {
    get(this: HTMLTableSectionElement) {
      return this.querySelectorAll(':scope > tr');
    },
  });
}
