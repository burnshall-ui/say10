/**
 * Input Validation & Sanitization Utilities
 *
 * Schützt vor Command Injection, Path Traversal und anderen Security Issues
 */

/**
 * Sanitizes service names to prevent command injection
 * @throws {Error} if service name contains invalid characters
 */
export function sanitizeServiceName(service: string): string {
  // Nur alphanumerische Zeichen, Punkt, Minus, Unterstrich erlauben
  if (!/^[a-zA-Z0-9._-]+$/.test(service)) {
    throw new Error(`Ungültiger Service-Name: ${service}`);
  }

  // Max length check
  if (service.length > 100) {
    throw new Error('Service-Name zu lang (max 100 Zeichen)');
  }

  return service;
}

/**
 * Validates hostname to prevent command injection
 * RFC 1123 compliant
 * @throws {Error} if hostname is invalid
 */
export function sanitizeHostname(hostname: string): string {
  // RFC 1123 hostname validation
  const hostnameRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$/;

  if (!hostnameRegex.test(hostname)) {
    throw new Error(`Ungültiger Hostname: ${hostname}`);
  }

  if (hostname.length > 253) {
    throw new Error('Hostname zu lang (max 253 Zeichen)');
  }

  return hostname;
}

/**
 * Validates and resolves log file path to prevent path traversal
 * @throws {Error} if path is outside /var/log or invalid
 */
export function sanitizeLogPath(path: string): string {
  const { normalize, resolve } = require('path');

  // Normalisiere und resolve den Pfad
  const normalizedPath = normalize(resolve(path));

  // Prüfe ob der normalisierte Pfad wirklich in /var/log ist
  if (!normalizedPath.startsWith("/var/log/")) {
    throw new Error(`Nur Log-Dateien in /var/log/ sind erlaubt. Angegeben: ${path}`);
  }

  // Keine versteckten Dateien
  if (normalizedPath.split('/').some((part: string) => part.startsWith('.'))) {
    throw new Error('Versteckte Dateien sind nicht erlaubt');
  }

  return normalizedPath;
}

/**
 * Validates search pattern to prevent ReDoS attacks
 * @throws {Error} if pattern is potentially dangerous
 */
export function sanitizeSearchPattern(pattern: string): string {
  // Limit length
  if (pattern.length > 200) {
    throw new Error('Search pattern zu lang (max 200 Zeichen)');
  }

  // Test for ReDoS patterns (basic check)
  const dangerousPatterns = [
    /(\(.*\+\))+/,  // Nested quantifiers
    /(\(.*\*\))+/,
    /(\w\+)+\w+/,
  ];

  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      throw new Error('Potentiell gefährliches Regex-Pattern erkannt');
    }
  }

  return pattern;
}

/**
 * Validates DNS record type
 * @throws {Error} if record type is invalid
 */
export function sanitizeRecordType(recordType: string): string {
  const validRecordTypes = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "PTR"];

  const upperType = recordType.toUpperCase();
  if (!validRecordTypes.includes(upperType)) {
    throw new Error(`Ungültiger Record-Type: ${recordType}. Erlaubt: ${validRecordTypes.join(', ')}`);
  }

  return upperType;
}

/**
 * Validates numeric input safely
 */
export function parseIntSafe(value: string | number | undefined, defaultValue: number, min?: number, max?: number): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);

  if (isNaN(parsed)) {
    return defaultValue;
  }

  if (min !== undefined && parsed < min) {
    return min;
  }

  if (max !== undefined && parsed > max) {
    return max;
  }

  return parsed;
}

/**
 * Sanitizes error messages to prevent information leakage
 */
export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'Unknown error';

  // Remove file paths
  let sanitized = msg.replace(/\/[\w/.-]+/g, '[PATH]');

  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

  // Remove ports
  sanitized = sanitized.replace(/:\d{2,5}\b/g, ':[PORT]');

  return sanitized;
}

/**
 * Truncates string with ellipsis, trying to break at word boundary
 */
export function truncateString(str: string, maxLength: number, ellipsis = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }

  // Try to break at word boundary
  const truncated = str.substring(0, maxLength - ellipsis.length);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + ellipsis;
  }

  return truncated + ellipsis;
}
