import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  assertNoRawPiiAccess,
  createPiiPrismaExtension,
  detectRawQueryModel,
  PII_PROTECTED_MODELS,
} from '../../../src/common/pii-prisma.extension';
import { PiiCryptoService } from '../../../src/common/pii-crypto.service';

describe('pii-prisma.extension — helpers', () => {
  describe('assertNoRawPiiAccess', () => {
    it('não lança quando modelHint é undefined', () => {
      expect(() => assertNoRawPiiAccess(undefined)).not.toThrow();
    });

    it('não lança quando modelHint é model não-PII', () => {
      expect(() => assertNoRawPiiAccess('Product')).not.toThrow();
      expect(() => assertNoRawPiiAccess('Category')).not.toThrow();
      expect(() => assertNoRawPiiAccess('Table')).not.toThrow();
    });

    it('lança quando modelHint é UsersProfile (PII direta)', () => {
      expect(() => assertNoRawPiiAccess('UsersProfile')).toThrow(/Raw query contra model PII/);
    });

    it('lança quando modelHint é Order (PII direta em customerPhone/Name/Email)', () => {
      expect(() => assertNoRawPiiAccess('Order')).toThrow(/Raw query contra model PII/);
    });

    it('a mensagem de erro cita os métodos tipados como alternativa', () => {
      expect(() => assertNoRawPiiAccess('UsersProfile')).toThrow(/operações tipadas do Prisma/);
      expect(() => assertNoRawPiiAccess('UsersProfile')).toThrow(/findUnique, update/);
    });
  });

  describe('PII_PROTECTED_MODELS', () => {
    it('contém UsersProfile', () => {
      expect(PII_PROTECTED_MODELS.has('UsersProfile')).toBe(true);
    });

    it('contém Order (PII em customerPhone/customerName/customerEmail)', () => {
      expect(PII_PROTECTED_MODELS.has('Order')).toBe(true);
    });

    it('NÃO contém models não-PII', () => {
      expect(PII_PROTECTED_MODELS.has('Product')).toBe(false);
      expect(PII_PROTECTED_MODELS.has('Category')).toBe(false);
      expect(PII_PROTECTED_MODELS.has('Restaurant')).toBe(false);
    });
  });

  describe('detectRawQueryModel', () => {
    it('detecta UsersProfile em SELECT FROM "UsersProfile"', () => {
      expect(detectRawQueryModel('SELECT * FROM "UsersProfile"')).toBe('UsersProfile');
    });

    it('detecta Order em SELECT FROM "Order"', () => {
      expect(detectRawQueryModel('SELECT id FROM "Order" WHERE status = \'paid\'')).toBe('Order');
    });

    it('detecta em UPDATE com aspas', () => {
      expect(detectRawQueryModel('UPDATE "UsersProfile" SET name = \'x\' WHERE id = 1')).toBe(
        'UsersProfile'
      );
    });

    it('detecta em JOIN quando o FROM é não-PII e o JOIN é PII', () => {
      // A regex captura apenas o PRIMEIRO `FROM|UPDATE|JOIN|INTO`. Se o FROM
      // é não-PII, o match[1] é não-PII e a função retorna undefined —
      // mesmo se um JOIN posterior toca uma tabela PII. Esta é uma
      // limitação conhecida (heurística imperfeita, documentada em design.md
      // §AC-HA-N28). Aqui documentamos o comportamento atual:
      expect(
        detectRawQueryModel('SELECT u.id FROM "Product" p JOIN "UsersProfile" u ON p.userId = u.id')
      ).toBeUndefined();
    });

    it('detecta em INSERT INTO', () => {
      expect(detectRawQueryModel('INSERT INTO "Order" (id, total) VALUES ($1, $2)')).toBe('Order');
    });

    it('detecta sem aspas (FROM UsersProfile)', () => {
      expect(detectRawQueryModel('SELECT * FROM UsersProfile')).toBe('UsersProfile');
    });

    it('detecta com aspas simples', () => {
      expect(detectRawQueryModel("SELECT * FROM 'Order'")).toBe('Order');
    });

    it('normaliza whitespace múltiplo antes de parsear', () => {
      expect(detectRawQueryModel('SELECT   *\n\tFROM   "UsersProfile"')).toBe('UsersProfile');
    });

    it('retorna undefined quando não há nenhum model PII envolvido', () => {
      expect(detectRawQueryModel('SELECT * FROM "Product"')).toBeUndefined();
      expect(detectRawQueryModel('SELECT * FROM "Category"')).toBeUndefined();
      expect(detectRawQueryModel('SELECT 1')).toBeUndefined();
    });

    it('retorna undefined quando o FROM é de tabela não-PII mesmo com keywords', () => {
      expect(detectRawQueryModel('SELECT u.id FROM "Product" u')).toBeUndefined();
    });
  });

  describe('detectRawQueryModel — case insensitive', () => {
    it('detecta mesmo com keywords em lowercase', () => {
      expect(detectRawQueryModel('select * from "UsersProfile"')).toBe('UsersProfile');
    });
  });
});

describe('createPiiPrismaExtension', () => {
  /**
   * `Prisma.defineExtension` retorna uma função `(client) => client.$extends(ext)`.
   * Capturamos o `ext` interno passando um fake client que expõe `$extends`
   * como espião e devolve o `ext` recebido.
   */
  function materializeExtension(crypto: PiiCryptoService) {
    const extFactory = createPiiPrismaExtension(crypto);
    let capturedExt: { name?: string; query?: { $allModels?: { $allOperations?: Function } } } = {};
    const fakeClient = {
      $extends: vi.fn((e: typeof capturedExt) => {
        capturedExt = e;
        return fakeClient;
      }),
    };
    // Aplica o extension — captura o objeto ext.
    extFactory(fakeClient as unknown as Parameters<typeof extFactory>[0]);
    return capturedExt;
  }

  describe('crypto desabilitado (modo dev sem chave)', () => {
    let crypto: PiiCryptoService;

    beforeEach(() => {
      // Mock mínimo: isEnabled() retorna false → extension passa query(args) sem mexer.
      crypto = {
        isEnabled: () => false,
        encrypt: vi.fn(),
        decrypt: vi.fn(),
      } as unknown as PiiCryptoService;
    });

    it('retorna um objeto com `name` "pii-encryption"', () => {
      const ext = materializeExtension(crypto);
      expect(ext.name).toBe('pii-encryption');
    });

    it('passa args adiante sem criptografar quando crypto desabilitado', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ id: 1, name: 'A' });
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler(
        { model: 'usersProfile', operation: 'findMany', args: { where: {} }, query },
        undefined
      );

      expect(query).toHaveBeenCalledWith({ where: {} });
      expect(crypto.encrypt).not.toHaveBeenCalled();
    });

    it('passa args adiante quando model não tem campos encriptados', async () => {
      const crypto2 = {
        isEnabled: () => true,
        encrypt: vi.fn(),
        decrypt: vi.fn(),
      } as unknown as PiiCryptoService;
      const ext = materializeExtension(crypto2);
      const query = vi.fn().mockResolvedValue([]);
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler({ model: 'Product', operation: 'findMany', args: {}, query }, undefined);

      expect(query).toHaveBeenCalledWith({});
      expect(crypto2.encrypt).not.toHaveBeenCalled();
      expect(crypto2.decrypt).not.toHaveBeenCalled();
    });

    it('passa args adiante quando model é undefined (sem fields)', async () => {
      const crypto2 = {
        isEnabled: () => true,
        encrypt: vi.fn(),
        decrypt: vi.fn(),
      } as unknown as PiiCryptoService;
      const ext = materializeExtension(crypto2);
      const query = vi.fn().mockResolvedValue(null);
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler({ model: undefined, operation: 'findMany', args: {}, query }, undefined);

      expect(query).toHaveBeenCalledWith({});
    });
  });

  describe('crypto habilitado', () => {
    let crypto: PiiCryptoService;

    beforeEach(() => {
      crypto = {
        isEnabled: () => true,
        encrypt: vi.fn((s: string) => `ENC(${s})`),
        decrypt: vi.fn((s: string) => `DEC(${s})`),
      } as unknown as PiiCryptoService;
    });

    it('encripta campo PII em create (data como objeto único)', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ id: 1 });
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler(
        {
          model: 'usersProfile',
          operation: 'create',
          args: { data: { name: 'João', email: 'j@x.com' } },
          query,
        },
        undefined
      );

      // name é PII (UsersProfile) e deve passar pelo encrypt.
      expect(crypto.encrypt).toHaveBeenCalledWith('João');
      // email NÃO é PII e NÃO deve ser encriptado.
      expect(crypto.encrypt).not.toHaveBeenCalledWith('j@x.com');
    });

    it('encripta campos PII em createMany (data como array)', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ count: 2 });
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler(
        {
          model: 'usersProfile',
          operation: 'createMany',
          args: { data: [{ name: 'Ana' }, { name: 'Bia' }] },
          query,
        },
        undefined
      );

      expect(crypto.encrypt).toHaveBeenCalledWith('Ana');
      expect(crypto.encrypt).toHaveBeenCalledWith('Bia');
      // O número de chamadas é exatamente 2 (uma por registro).
      expect((crypto.encrypt as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    });

    it('encripta campos PII em upsert (create + update)', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ id: 1 });
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler(
        {
          model: 'usersProfile',
          operation: 'upsert',
          args: {
            where: { email: 'x' },
            create: { name: 'New' },
            update: { name: 'Updated' },
          },
          query,
        },
        undefined
      );

      expect(crypto.encrypt).toHaveBeenCalledWith('New');
      expect(crypto.encrypt).toHaveBeenCalledWith('Updated');
    });

    it('NÃO encripta campos não-string (defesa contra undefined)', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({});
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler(
        {
          model: 'usersProfile',
          operation: 'create',
          args: { data: { name: 12345 as unknown as string } },
          query,
        },
        undefined
      );

      // Como name é number, NÃO deve chamar encrypt (apenas encripta strings).
      expect(crypto.encrypt).not.toHaveBeenCalled();
    });

    it('NÃO encripta campo ausente no data (preserva omit)', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({});
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler(
        {
          model: 'usersProfile',
          operation: 'create',
          args: { data: { email: 'j@x.com' } }, // sem name
          query,
        },
        undefined
      );

      expect(crypto.encrypt).not.toHaveBeenCalled();
    });

    it('decripta campos PII em findMany retornando array', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue([
        { id: '1', name: 'ENC(A)' },
        { id: '2', name: 'ENC(B)' },
      ]);
      const handler = ext.query!.$allModels!.$allOperations!;

      const result = await handler(
        { model: 'usersProfile', operation: 'findMany', args: {}, query },
        undefined
      );

      expect(crypto.decrypt).toHaveBeenCalledWith('ENC(A)');
      expect(crypto.decrypt).toHaveBeenCalledWith('ENC(B)');
      expect(result).toEqual([
        { id: '1', name: 'DEC(ENC(A))' },
        { id: '2', name: 'DEC(ENC(B))' },
      ]);
    });

    it('decripta campos PII em findUnique retornando objeto único', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ id: '1', name: 'ENC(A)' });
      const handler = ext.query!.$allModels!.$allOperations!;

      const result = await handler(
        { model: 'usersProfile', operation: 'findUnique', args: { where: { id: '1' } }, query },
        undefined
      );

      expect(result).toEqual({ id: '1', name: 'DEC(ENC(A))' });
    });

    it('decripta campos PII em findFirstOrThrow', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ id: '1', name: 'ENC(A)' });
      const handler = ext.query!.$allModels!.$allOperations!;

      const result = await handler(
        { model: 'usersProfile', operation: 'findFirstOrThrow', args: {}, query },
        undefined
      );

      expect(crypto.decrypt).toHaveBeenCalledWith('ENC(A)');
      expect(result).toEqual({ id: '1', name: 'DEC(ENC(A))' });
    });

    it('preserva null em findMany (não explode)', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue(null);
      const handler = ext.query!.$allModels!.$allOperations!;

      const result = await handler(
        { model: 'usersProfile', operation: 'findUnique', args: {}, query },
        undefined
      );

      expect(result).toBeNull();
      expect(crypto.decrypt).not.toHaveBeenCalled();
    });

    it('NÃO decripta campos que não são PII (preserva email, etc.)', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ id: '1', name: 'ENC(A)', email: 'plain@x.com' });
      const handler = ext.query!.$allModels!.$allOperations!;

      const result = await handler(
        { model: 'usersProfile', operation: 'findUnique', args: {}, query },
        undefined
      );

      // Apenas name foi processado; email permanece como está.
      expect(result).toEqual({ id: '1', name: 'DEC(ENC(A))', email: 'plain@x.com' });
    });

    it('update (objeto único) encripta e propaga result sem decriptar', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ id: '1', name: 'ENC(updated)' });
      const handler = ext.query!.$allModels!.$allOperations!;

      const result = await handler(
        {
          model: 'usersProfile',
          operation: 'update',
          args: { where: { id: '1' }, data: { name: 'updated' } },
          query,
        },
        undefined
      );

      expect(crypto.encrypt).toHaveBeenCalledWith('updated');
      // update é write → não decripta (resultado do DB já está encriptado).
      expect(crypto.decrypt).not.toHaveBeenCalled();
      expect(result).toEqual({ id: '1', name: 'ENC(updated)' });
    });

    it('updateMany preserva estrutura (encripta o único objeto data)', async () => {
      const ext = materializeExtension(crypto);
      const query = vi.fn().mockResolvedValue({ count: 5 });
      const handler = ext.query!.$allModels!.$allOperations!;

      await handler(
        {
          model: 'usersProfile',
          operation: 'updateMany',
          args: { where: { id: '1' }, data: { name: 'bulk' } },
          query,
        },
        undefined
      );

      expect(crypto.encrypt).toHaveBeenCalledWith('bulk');
    });
  });
});
