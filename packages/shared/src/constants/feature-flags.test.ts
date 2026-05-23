import { describe, it, expect } from 'vitest';
import { FeatureFlags } from '@pedi-ai/shared/constants/feature-flags';

describe('FeatureFlags', () => {
  describe('OFFLINE_ENABLED', () => {
    it('deve ser true', () => {
      expect(FeatureFlags.OFFLINE_ENABLED).toBe(true);
    });
  });

  describe('PIX_ENABLED', () => {
    it('deve ser true', () => {
      expect(FeatureFlags.PIX_ENABLED).toBe(true);
    });
  });

  describe('WAITER_MODE', () => {
    it('deve ser true', () => {
      expect(FeatureFlags.WAITER_MODE).toBe(true);
    });
  });

  describe('QR_CODE_ENABLED', () => {
    it('deve ser true', () => {
      expect(FeatureFlags.QR_CODE_ENABLED).toBe(true);
    });
  });

  describe('COMBOS_ENABLED', () => {
    it('deve ser true', () => {
      expect(FeatureFlags.COMBOS_ENABLED).toBe(true);
    });
  });

  describe('ANALYTICS_ENABLED', () => {
    it('deve ser true', () => {
      expect(FeatureFlags.ANALYTICS_ENABLED).toBe(true);
    });
  });

  describe('CASHBACK_ENABLED', () => {
    it('deve ser false', () => {
      expect(FeatureFlags.CASHBACK_ENABLED).toBe(false);
    });
  });

  describe('imutabilidade', () => {
    it('deve ser um objeto frozen', () => {
      expect(Object.isFrozen(FeatureFlags)).toBe(true);
    });

    it('não deve permitir modificação de propriedades', () => {
      expect(() => {
        (FeatureFlags as any).OFFLINE_ENABLED = false;
      }).toThrow();
    });
  });

  describe('FeatureFlagName type', () => {
    it('deve extrair todos os nomes de flags', () => {
      const flagNames: (keyof typeof FeatureFlags)[] = [
        'OFFLINE_ENABLED',
        'PIX_ENABLED',
        'WAITER_MODE',
        'QR_CODE_ENABLED',
        'COMBOS_ENABLED',
        'ANALYTICS_ENABLED',
        'CASHBACK_ENABLED',
      ];

      flagNames.forEach((name) => {
        expect(FeatureFlags[name]).toBeDefined();
      });
    });
  });
});
