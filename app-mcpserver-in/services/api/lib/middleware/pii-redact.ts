import { NextRequest, NextResponse } from 'next/server';

// Regex patterns for Indian PII (Aadhaar, PAN, GSTIN, Phone, Email, Bank Account)
const PII_PATTERNS = [
  // Aadhaar (12 digits, optional formatting like XXXX-XXXX-XXXX)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  // PAN (5 letters + 4 digits + 1 letter)
  /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
  // Indian Phone (+91 or 0 prefix)
  /(?:\+91|0)[\- ]?\d{10}/g,
  // GSTIN (15 alphanumeric)
  /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g,
  // Bank Account Numbers (9-18 digits, common patterns)
  /\b[0-9]{9,18}\b/g,
  // Email addresses
  /(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
];

/**
 * Recursively redacts PII from an object or string
 */
export function redactPII(data: any): any {
  if (typeof data === 'string') {
    return PII_PATTERNS.reduce((str, pattern) => str.replace(pattern, '[REDACTED]'), data);
  }
  if (Array.isArray(data)) {
    return data.map((item) => redactPII(item));
  }
  if (data && typeof data === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip redacting keys that are known PII fields but keep the value redacted
      const isSensitiveField = [
        'aadhaar', 'pan', 'gstin', 'phone', 'email', 'bank_account', 
        'upi_id', 'account_number', 'ifsc_code', 'vpa'
      ].some(field => key.toLowerCase().includes(field));

      if (isSensitiveField) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactPII(value);
      }
    }
    return redacted;
  }
  return data;
}

/**
 * Middleware to redact PII from request body before logging/storage
 */
export async function redactRequestMiddleware(request: NextRequest): Promise<NextRequest> {
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return request; // Skip non-JSON requests
  }

  try {
    const body = await request.json();
    const redactedBody = redactPII(body);
    
    // Reconstruct request with redacted body
    const newBody = JSON.stringify(redactedBody);
    const newHeaders = new Headers(request.headers);
    newHeaders.set('content-length', newBody.length);

    return new NextRequest(request, {
      body: newBody,
      headers: newHeaders,
    });
  } catch (error) {
    // If JSON parsing fails, return original request (don't break the flow)
    console.error('PII Redaction Middleware Error:', error);
    return request;
  }
}

/**
 * Utility to redact PII from logs before storage
 */
export function sanitizeForLogs(data: any): any {
  return redactPII(data);
}