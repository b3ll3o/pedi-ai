import { describe, it, expect } from 'vitest';
import { AggregateRootClass } from '@/domain/shared/types/AggregateRoot';

interface TestAggregateProps {
  id: string;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

class TestAggregate extends AggregateRootClass<TestAggregateProps> {
  get nome(): string {
    return this.props.nome;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

describe('AggregateRootClass', () => {
  describe('extends EntityClass', () => {
    it('deve ter id acessível via herança', () => {
      const aggregate = new TestAggregate({
        id: 'agg-1',
        nome: 'Teste',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(aggregate.id).toBe('agg-1');
    });

    it('deve comparar equals via id (herança)', () => {
      const aggregate1 = new TestAggregate({
        id: 'agg-1',
        nome: 'Teste 1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const aggregate2 = new TestAggregate({
        id: 'agg-1',
        nome: 'Teste 2',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(aggregate1.equals(aggregate2)).toBe(true);
    });
  });

  describe('createdAt', () => {
    it('deve retornar createdAt do props', () => {
      const now = new Date();
      const aggregate = new TestAggregate({
        id: 'agg-1',
        nome: 'Teste',
        createdAt: now,
        updatedAt: now,
      });

      expect(aggregate.createdAt).toBe(now);
    });
  });

  describe('updatedAt', () => {
    it('deve retornar updatedAt do props', () => {
      const now = new Date();
      const aggregate = new TestAggregate({
        id: 'agg-1',
        nome: 'Teste',
        createdAt: now,
        updatedAt: now,
      });

      expect(aggregate.updatedAt).toBe(now);
    });
  });
});
