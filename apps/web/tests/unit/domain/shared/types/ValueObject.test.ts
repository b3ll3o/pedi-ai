import { describe, it, expect } from 'vitest';
import { EntityClass } from '@/domain/shared/types/Entity';

interface TestEntityProps {
  id: string;
  nome: string;
}

class TestEntity extends EntityClass<TestEntityProps> {
  get nome(): string {
    return this.props.nome;
  }
}

describe('EntityClass', () => {
  describe('constructor', () => {
    it('deve inicializar com props', () => {
      const entity = new TestEntity({ id: 'test-1', nome: 'Teste' });

      expect(entity.props).toEqual({ id: 'test-1', nome: 'Teste' });
    });
  });

  describe('id', () => {
    it('deve retornar o id do props', () => {
      const entity = new TestEntity({ id: 'test-1', nome: 'Teste' });

      expect(entity.id).toBe('test-1');
    });
  });

  describe('equals', () => {
    it('deve retornar true para mesma instância', () => {
      const entity = new TestEntity({ id: 'test-1', nome: 'Teste' });

      expect(entity.equals(entity)).toBe(true);
    });

    it('deve retornar true para entidades com mesmo id', () => {
      const entity1 = new TestEntity({ id: 'test-1', nome: 'Teste 1' });
      const entity2 = new TestEntity({ id: 'test-1', nome: 'Teste 2' });

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('deve retornar false para entidades com ids diferentes', () => {
      const entity1 = new TestEntity({ id: 'test-1', nome: 'Teste' });
      const entity2 = new TestEntity({ id: 'test-2', nome: 'Teste' });

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('deve retornar false para null', () => {
      const entity = new TestEntity({ id: 'test-1', nome: 'Teste' });

      expect(entity.equals(null as any)).toBe(false);
    });

    it('deve retornar false para undefined', () => {
      const entity = new TestEntity({ id: 'test-1', nome: 'Teste' });

      expect(entity.equals(undefined as any)).toBe(false);
    });
  });
});
