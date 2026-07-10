// Compatibility wrapper: replaces node-fetch with native fetch
// while handling the form-data package used by sslcommerz-lts.
//
// The sslcommerz-lts library sends POST bodies using the npm 'form-data'
// package (a Node.js stream). Native fetch doesn't understand that format,
// so we convert it to a plain URLSearchParams body instead.

const nativeFetch = globalThis.fetch;

async function compatFetch(url, options = {}) {
  const cleanOptions = { ...options };

  // Remove browser-only options that cause errors in Node.js native fetch
  delete cleanOptions.mode;
  delete cleanOptions.cache;
  delete cleanOptions.credentials;
  delete cleanOptions.referrer;

  // If the body is a form-data stream (from the npm 'form-data' package),
  // convert it to URLSearchParams which native fetch understands.
  if (cleanOptions.body && typeof cleanOptions.body === 'object' && typeof cleanOptions.body.getBuffer === 'function') {
    try {
      // form-data package exposes getBuffer() and getHeaders()
      const buf = cleanOptions.body.getBuffer().toString('utf-8');
      const boundary = cleanOptions.body.getBoundary();

      // Parse multipart form data into key-value pairs
      const params = new URLSearchParams();
      const parts = buf.split('--' + boundary);
      for (const part of parts) {
        const nameMatch = part.match(/name="([^"]+)"/);
        if (nameMatch) {
          // Extract value after the double CRLF
          const valueMatch = part.split('\r\n\r\n');
          if (valueMatch[1]) {
            const value = valueMatch[1].replace(/\r\n$/, '');
            params.append(nameMatch[1], value);
          }
        }
      }

      cleanOptions.body = params.toString();
      cleanOptions.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
    } catch (e) {
      // If parsing fails, let it pass through as-is
      console.error('node-fetch-mock: form-data conversion failed:', e);
    }
  }

  return nativeFetch(url, cleanOptions);
}

// Support both CJS default and named imports
compatFetch.default = compatFetch;
module.exports = compatFetch;
