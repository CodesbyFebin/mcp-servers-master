/**
 * PII Redaction Middleware for DPDP Act Compliance
 * 
 * Scans incoming request bodies and redacts Indian PII patterns before
 * data is logged, stored, or processed further.
 * 
 * Patterns covered:
 * - Aadhaar: 12 digits (with or without spaces/hyphens)
 * - PAN: 5 uppercase letters + 4 digits + 1 uppercase letter
 * - Indian Phone: +91 followed by 10 digits
 * - GSTIN: 15 character alphanumeric (2 state + 10 PAN + 3)
 * - Email: Standard email pattern
 * - Indian Bank Account: 9-18 digits (common range)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Redacts PII from a string value
 */
function redactPii(value: string): string {
  if (typeof value !== 'string') return value;

  // Aadhaar: 12 digits (with optional spaces/hyphens after 4th and 8th digit)
  const aadhaarPattern = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
  value = value.replace(aadhaarPattern, '[REDACTED_AADHAAR]');

  // PAN: 5 uppercase letters + 4 digits + 1 uppercase letter
  const panPattern = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  value = value.replace(panPattern, '[REDACTED_PAN]');

  // Indian Phone: +91 followed by 10 digits
  const indianPhonePattern = /\+91[-\s]?[6-9]\d{9}\b/g;
  value = value.replace(indianPhonePattern, '[REDACTED_INDIAN_PHONE]');

  // GSTIN: 15 character alphanumeric (2 state + 10 PAN + 3)
  const gstinPattern = /\b\d{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9][Z][A-Z0-9]\b/g;
  value = value.replace(gstinPattern, '[REDACTED_GSTIN]');

  // Email: Standard email pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  value = value.replace(emailPattern, '[REDACTED_EMAIL]');

  // Indian Bank Account: 9-18 digits (common range for Indian banks)
  const bankAccountPattern = /\b\d{9,18}\b/g;
  value = value.replace(bankAccountPattern, '[REDACTED_BANK_ACCOUNT]');

  return value;
}

/**
 * Recursively redacts PII in JSON objects and arrays
 */
function redactPiiInObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? redactPii(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactPiiInObject(item));
  }

  const redacted: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      redacted[key] = redactPiiInObject(obj[key]);
    }
  }
  return redacted;
}

/**
 * Middleware function to redact PII from request body
 */
export async function piiRedactionMiddleware(request: NextRequest) {
  // Only apply to methods that typically have a body
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return NextResponse.next();
  }

  // Clone the request to read its body
  const requestBody = await request.clone().json().catch(() => null);
  
  if (requestBody) {
    // Redact PII from the body
    const redactedBody = redactPiiInObject(requestBody);
    
    // Create a new request with the redacted body
    const redactedHeaders = new Headers(request.headers);
    // Update content-length header since body size may have changed
    const bodyString = JSON.stringify(redactedBody);
    redactedHeaders.set('Content-Length', bodyString.length.toString());
    
    // Return new request with redacted body
    return new NextRequest(new URL(request.url), {
      method: request.method,
      headers: redactedHeaders,
      body: bodyString
    });
  }

  return NextResponse.next();
}