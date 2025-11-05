/**
 * Unit Tests für config/index.ts
 * 
 * Testet Config Validation
 * 
 * HINWEIS: Diese Tests sind vereinfacht, da die Config beim Import geladen wird.
 * Für echte Integration Tests müsste das Modul dynamisch neu geladen werden.
 */

import { describe, it, expect } from 'vitest';
import { validateConfig } from './index.js';

describe('validateConfig', () => {
  it('sollte bei der aktuellen Config nicht werfen', () => {
    // Dieser Test prüft, dass die aktuelle Config valide ist
    expect(() => validateConfig()).not.toThrow();
  });

  it('sollte validateConfig Funktion exportieren', () => {
    expect(validateConfig).toBeDefined();
    expect(typeof validateConfig).toBe('function');
  });
  
  // Weitere Tests würden dynamisches Modul-Reloading oder Dependency Injection benötigen
  // Für Production-Code würden wir eine factory function oder DI Container verwenden
});

