import { describe, it, expect } from 'vitest';

import { Referral, calculateRewardTier, REFERRAL_CONFIG } from '@/domain/referral/Referral';

const criarProps = (overrides: Partial<ConstructorParameters<typeof Referral>[0]> = {}) => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'referral-1',
    referrerRestaurantId: 'restaurante-1',
    code: 'ABCDEFGH',
    totalSignups: 0,
    totalConversions: 0,
    rewardCreditMonths: 0,
    rewardCreditAppliedMonths: 0,
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
};

describe('Referral', () => {
  describe('getters', () => {
    it('exposes props via getters', () => {
      const referral = new Referral(criarProps());
      expect(referral.id).toBe('referral-1');
      expect(referral.code).toBe('ABCDEFGH');
      expect(referral.referrerRestaurantId).toBe('restaurante-1');
      expect(referral.totalSignups).toBe(0);
      expect(referral.totalConversions).toBe(0);
      expect(referral.rewardCreditMonths).toBe(0);
    });

    it('calcula meses disponíveis subtraindo aplicados', () => {
      const referral = new Referral(
        criarProps({ rewardCreditMonths: 5, rewardCreditAppliedMonths: 2 })
      );
      expect(referral.availableCreditMonths).toBe(3);
    });
  });

  describe('shareUrl', () => {
    it('monta URL de compartilhamento com base e código', () => {
      const referral = new Referral(criarProps({ code: 'XYZ12345' }));
      expect(referral.shareUrl('https://andreazzi.tech')).toBe(
        'https://andreazzi.tech/register?ref=XYZ12345'
      );
    });
  });

  describe('recordSignup', () => {
    it('incrementa totalSignups, version e atualiza updatedAt', () => {
      const referral = new Referral(criarProps({ version: 1 }));
      const antes = referral['props'].updatedAt;
      referral.recordSignup();
      expect(referral.totalSignups).toBe(1);
      expect(referral['props'].version).toBe(2);
      expect(referral['props'].updatedAt.getTime()).toBeGreaterThanOrEqual(antes.getTime());
    });
  });

  describe('recordConversion', () => {
    it('incrementa conversões e adiciona reward credit do tier', () => {
      const referral = new Referral(criarProps({ totalConversions: 2 }));
      const reward = referral.recordConversion();
      expect(referral.totalConversions).toBe(3);
      expect(referral.rewardCreditMonths).toBe(1);
      expect(reward).toBe(1);
    });

    it('cap no tier 3 quando conversões >= 11', () => {
      const referral = new Referral(criarProps({ totalConversions: 10 }));
      referral.recordConversion();
      expect(referral.rewardCreditMonths).toBe(3);
    });
  });

  describe('applyCredit', () => {
    it('aplica credit quando há saldo', () => {
      const referral = new Referral(
        criarProps({ rewardCreditMonths: 5, rewardCreditAppliedMonths: 1 })
      );
      const ok = referral.applyCredit(2);
      expect(ok).toBe(true);
      expect(referral['props'].rewardCreditAppliedMonths).toBe(3);
    });

    it('recusa quando saldo é insuficiente', () => {
      const referral = new Referral(
        criarProps({ rewardCreditMonths: 1, rewardCreditAppliedMonths: 0 })
      );
      const ok = referral.applyCredit(3);
      expect(ok).toBe(false);
      expect(referral['props'].rewardCreditAppliedMonths).toBe(0);
    });
  });

  describe('cancel', () => {
    it('marca status como cancelled e bumpa version', () => {
      const referral = new Referral(criarProps({ version: 1 }));
      referral.cancel();
      expect(referral['props'].status).toBe('cancelled');
      expect(referral['props'].version).toBe(2);
    });
  });

  describe('toRecord', () => {
    it('serializa para formato do Prisma', () => {
      const referral = new Referral(
        criarProps({
          rewardCreditAppliedMonths: 1,
          status: 'pending',
          version: 3,
        })
      );
      const record = referral.toRecord();
      expect(record).toMatchObject({
        id: 'referral-1',
        referrerRestaurantId: 'restaurante-1',
        code: 'ABCDEFGH',
        rewardCreditMonths: 0,
        rewardCreditAppliedMonths: 1,
        status: 'pending',
        version: 3,
      });
    });
  });

  describe('create', () => {
    it('cria novo Referral com código gerado de 8 caracteres', () => {
      const referral = Referral.create('restaurante-2');
      expect(referral.id).toBeDefined();
      expect(referral.referrerRestaurantId).toBe('restaurante-2');
      expect(referral.code).toHaveLength(8);
      expect(referral.code).toMatch(/^[A-Z2-9]+$/);
      expect(referral['props'].status).toBe('pending');
      expect(referral['props'].version).toBe(1);
    });

    it('aceita customCode quando informado', () => {
      const referral = Referral.create('restaurante-3', 'CUSTOM01');
      expect(referral.code).toBe('CUSTOM01');
    });
  });

  describe('reconstruct', () => {
    it('reconstrói a partir de props', () => {
      const props = criarProps({ id: 'r-2', code: 'REFERRAL' });
      const referral = Referral.reconstruct(props);
      expect(referral.id).toBe('r-2');
      expect(referral.code).toBe('REFERRAL');
    });
  });
});

describe('calculateRewardTier', () => {
  it('retorna 0 para menos de 3 conversões', () => {
    expect(calculateRewardTier(0)).toBe(0);
    expect(calculateRewardTier(2)).toBe(0);
  });

  it('retorna 1 para 3-5 conversões', () => {
    expect(calculateRewardTier(3)).toBe(1);
    expect(calculateRewardTier(5)).toBe(1);
  });

  it('retorna 2 para 6-10 conversões', () => {
    expect(calculateRewardTier(6)).toBe(2);
    expect(calculateRewardTier(10)).toBe(2);
  });

  it('retorna 3 (cap) para 11+ conversões', () => {
    expect(calculateRewardTier(11)).toBe(3);
    expect(calculateRewardTier(100)).toBe(3);
  });
});

describe('REFERRAL_CONFIG', () => {
  it('define constantes do programa de referral', () => {
    expect(REFERRAL_CONFIG.MAX_CONVERSIONS_PER_REFERRER).toBe(100);
    expect(REFERRAL_CONFIG.COOKIE_EXPIRY_DAYS).toBe(30);
    expect(REFERRAL_CONFIG.MAX_REWARD_TIER).toBe(3);
    expect(REFERRAL_CONFIG.MIN_CONVERSIONS_FOR_REWARD).toBe(3);
    expect(REFERRAL_CONFIG.REWARD_TO_REFERRED_MONTHS).toBe(1);
  });
});
