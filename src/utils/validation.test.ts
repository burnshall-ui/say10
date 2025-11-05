/**
 * Unit Tests für validation.ts
 * 
 * Testet alle Validierungs- und Sanitisierungs-Funktionen
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeServiceName,
  sanitizeHostname,
  sanitizeHostnameOrIP,
  sanitizeLogPath,
  sanitizeSearchPattern,
  sanitizeRecordType,
  parseIntSafe,
  sanitizeErrorMessage,
  truncateString,
  sanitizeContainerName,
  sanitizeDockerCommand,
} from './validation.js';

describe('sanitizeServiceName', () => {
  it('sollte valide Service-Namen akzeptieren', () => {
    expect(sanitizeServiceName('nginx')).toBe('nginx');
    expect(sanitizeServiceName('nginx.service')).toBe('nginx.service');
    expect(sanitizeServiceName('my-service_123')).toBe('my-service_123');
    expect(sanitizeServiceName('sshd@.service')).toBe('sshd@.service');
    expect(sanitizeServiceName('systemd-networkd@eth0.service')).toBe('systemd-networkd@eth0.service');
  });

  it('sollte ungültige Zeichen ablehnen', () => {
    expect(() => sanitizeServiceName('nginx; rm -rf /')).toThrow();
    expect(() => sanitizeServiceName('service && evil')).toThrow();
    expect(() => sanitizeServiceName('service|cat /etc/passwd')).toThrow();
    expect(() => sanitizeServiceName('../../../etc/passwd')).toThrow();
  });

  it('sollte zu lange Namen ablehnen', () => {
    const longName = 'a'.repeat(101);
    expect(() => sanitizeServiceName(longName)).toThrow();
  });
});

describe('sanitizeHostname', () => {
  it('sollte valide Hostnamen akzeptieren', () => {
    expect(sanitizeHostname('example.com')).toBe('example.com');
    expect(sanitizeHostname('sub.example.com')).toBe('sub.example.com');
    expect(sanitizeHostname('my-server-123')).toBe('my-server-123');
  });

  it('sollte ungültige Hostnamen ablehnen', () => {
    expect(() => sanitizeHostname('example.com; rm -rf /')).toThrow();
    expect(() => sanitizeHostname('../etc/passwd')).toThrow();
    expect(() => sanitizeHostname('example..com')).toThrow();
    expect(() => sanitizeHostname('-example.com')).toThrow(); // Beginnt mit -
  });

  it('sollte zu lange Hostnamen ablehnen', () => {
    const longHostname = 'a'.repeat(254) + '.com';
    expect(() => sanitizeHostname(longHostname)).toThrow();
  });
});

describe('sanitizeHostnameOrIP', () => {
  it('sollte valide IPv4-Adressen akzeptieren', () => {
    expect(sanitizeHostnameOrIP('192.168.1.1')).toBe('192.168.1.1');
    expect(sanitizeHostnameOrIP('8.8.8.8')).toBe('8.8.8.8');
    expect(sanitizeHostnameOrIP('127.0.0.1')).toBe('127.0.0.1');
  });

  it('sollte ungültige IPv4-Adressen ablehnen', () => {
    expect(() => sanitizeHostnameOrIP('256.1.1.1')).toThrow(); // Octet > 255
    expect(() => sanitizeHostnameOrIP('192.168.1.999')).toThrow();
    // '192.168.1' wird als Hostname interpretiert (valid), nicht als IP
  });

  it('sollte valide IPv6-Adressen akzeptieren', () => {
    expect(sanitizeHostnameOrIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    expect(sanitizeHostnameOrIP('::1')).toBe('::1');
  });

  it('sollte valide Hostnamen akzeptieren', () => {
    expect(sanitizeHostnameOrIP('example.com')).toBe('example.com');
    expect(sanitizeHostnameOrIP('localhost')).toBe('localhost');
  });

  it('sollte leere Strings ablehnen', () => {
    expect(() => sanitizeHostnameOrIP('')).toThrow();
  });
});

describe('sanitizeLogPath', () => {
  // HINWEIS: Diese Tests funktionieren nur auf Linux/Unix Systemen
  // Auf Windows würde path.resolve() absolute Windows-Pfade erzeugen
  
  it('sollte nur /var/log/ Pfade akzeptieren (Linux)', () => {
    // Nur auf Linux testen
    if (process.platform !== 'win32') {
      expect(sanitizeLogPath('/var/log/syslog')).toContain('/var/log/');
      expect(sanitizeLogPath('/var/log/nginx/access.log')).toContain('/var/log/');
    }
  });

  it('sollte Pfade außerhalb /var/log/ ablehnen', () => {
    expect(() => sanitizeLogPath('/etc/passwd')).toThrow();
    expect(() => sanitizeLogPath('/home/user/file.log')).toThrow();
    expect(() => sanitizeLogPath('../../../etc/passwd')).toThrow();
  });

  it('sollte versteckte Dateien ablehnen', () => {
    expect(() => sanitizeLogPath('/var/log/.hidden')).toThrow();
  });
});

describe('sanitizeSearchPattern', () => {
  it('sollte normale Patterns akzeptieren', () => {
    expect(sanitizeSearchPattern('error')).toBe('error');
    expect(sanitizeSearchPattern('failed|error')).toBe('failed|error');
  });

  it('sollte zu lange Patterns ablehnen', () => {
    const longPattern = 'a'.repeat(201);
    expect(() => sanitizeSearchPattern(longPattern)).toThrow();
  });

  it('sollte gefährliche ReDoS-Patterns ablehnen', () => {
    expect(() => sanitizeSearchPattern('(a+)+')).toThrow();
    expect(() => sanitizeSearchPattern('(a*)*')).toThrow();
  });
});

describe('sanitizeRecordType', () => {
  it('sollte valide DNS Record Types akzeptieren', () => {
    expect(sanitizeRecordType('A')).toBe('A');
    expect(sanitizeRecordType('AAAA')).toBe('AAAA');
    expect(sanitizeRecordType('MX')).toBe('MX');
    expect(sanitizeRecordType('txt')).toBe('TXT'); // Case-insensitive
  });

  it('sollte ungültige Record Types ablehnen', () => {
    expect(() => sanitizeRecordType('INVALID')).toThrow();
    expect(() => sanitizeRecordType('A; DROP TABLE')).toThrow();
  });
});

describe('parseIntSafe', () => {
  it('sollte valide Zahlen parsen', () => {
    expect(parseIntSafe('42', 0)).toBe(42);
    expect(parseIntSafe(42, 0)).toBe(42);
  });

  it('sollte Default-Werte bei ungültigen Inputs zurückgeben', () => {
    expect(parseIntSafe('invalid', 10)).toBe(10);
    expect(parseIntSafe(undefined, 5)).toBe(5);
    expect(parseIntSafe(null as any, 7)).toBe(7);
  });

  it('sollte Min/Max Grenzen respektieren', () => {
    expect(parseIntSafe('5', 0, 1, 10)).toBe(5);
    expect(parseIntSafe('0', 10, 1, 10)).toBe(1); // Unter min
    expect(parseIntSafe('15', 10, 1, 10)).toBe(10); // Über max
  });
});

describe('sanitizeErrorMessage', () => {
  it('sollte Pfade entfernen', () => {
    const msg = 'Error in /home/user/project/file.js';
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain('/home/user');
    expect(sanitized).toContain('[PATH]');
  });

  it('sollte IP-Adressen entfernen', () => {
    const msg = 'Connection to 192.168.1.100 failed';
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain('192.168.1.100');
    expect(sanitized).toContain('[IP]');
  });

  it('sollte Ports entfernen', () => {
    const msg = 'Server running on :8080';
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain(':8080');
    expect(sanitized).toContain('[PORT]');
  });
});

describe('truncateString', () => {
  it('sollte kurze Strings unverändert lassen', () => {
    const str = 'Short text';
    expect(truncateString(str, 100)).toBe(str);
  });

  it('sollte lange Strings kürzen', () => {
    const str = 'This is a very long string that should be truncated';
    const truncated = truncateString(str, 20);
    expect(truncated.length).toBeLessThanOrEqual(20);
    expect(truncated).toContain('...');
  });

  it('sollte an Wortgrenzen trennen wenn möglich', () => {
    const str = 'This is a test string';
    const truncated = truncateString(str, 15);
    expect(truncated).not.toMatch(/\s\.\.\.$/); // Kein Space vor ...
  });
});

describe('sanitizeContainerName', () => {
  it('sollte valide Container-Namen akzeptieren', () => {
    expect(sanitizeContainerName('nginx')).toBe('nginx');
    expect(sanitizeContainerName('my-app_1')).toBe('my-app_1');
    expect(sanitizeContainerName('redis.cache')).toBe('redis.cache');
    expect(sanitizeContainerName('web-server-123')).toBe('web-server-123');
  });

  it('sollte valide Container-IDs akzeptieren', () => {
    expect(sanitizeContainerName('abc123def456')).toBe('abc123def456');
    expect(sanitizeContainerName('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).toBe('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
  });

  it('sollte ungültige Container-Namen ablehnen', () => {
    expect(() => sanitizeContainerName('nginx; rm -rf /')).toThrow();
    expect(() => sanitizeContainerName('app && evil')).toThrow();
    expect(() => sanitizeContainerName('container|cat /etc/passwd')).toThrow();
    expect(() => sanitizeContainerName('test$malicious')).toThrow();
    expect(() => sanitizeContainerName('../../../etc/passwd')).toThrow();
  });

  it('sollte zu lange Namen ablehnen', () => {
    const longName = 'a'.repeat(256);
    expect(() => sanitizeContainerName(longName)).toThrow();
  });

  it('sollte leere Namen ablehnen', () => {
    expect(() => sanitizeContainerName('')).toThrow();
    expect(() => sanitizeContainerName(null as any)).toThrow();
  });
});

describe('sanitizeDockerCommand', () => {
  it('sollte sichere Docker-Commands akzeptieren', () => {
    expect(sanitizeDockerCommand('ps -a')).toBe('ps -a');
    expect(sanitizeDockerCommand('logs nginx')).toBe('logs nginx');
    expect(sanitizeDockerCommand('restart my-app_1')).toBe('restart my-app_1');
  });

  it('sollte unsichere Zeichen ablehnen', () => {
    expect(() => sanitizeDockerCommand('ps; rm -rf /')).toThrow();
    expect(() => sanitizeDockerCommand('logs && cat /etc/passwd')).toThrow();
    expect(() => sanitizeDockerCommand('restart | evil')).toThrow();
    expect(() => sanitizeDockerCommand('exec $malicious')).toThrow();
  });

  it('sollte leere Commands ablehnen', () => {
    expect(() => sanitizeDockerCommand('')).toThrow();
    expect(() => sanitizeDockerCommand(null as any)).toThrow();
  });
});

