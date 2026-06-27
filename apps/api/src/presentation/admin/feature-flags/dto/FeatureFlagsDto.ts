/**
 * @spec(RF-ADM-FF-01..09)
 *
 * DTOs do feature-flags module.
 *
 * Padrão de validação: Zod schema + `validar<T>(schema, input)` helper.
 * Lançamos `BadRequestException` quando a validação falha.
 */
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';

import { FlagKey } from '../../../../domain/admin/feature-flags/value-objects/FlagKey';
import { FlagValue } from '../../../../domain/admin/feature-flags/value-objects/FlagValue';

const FlagKeySchema = z.string().regex(/^[a-z0-9_]{3,64}$/, {
  message:
    'key deve estar em snake_case com 3-64 caracteres (apenas letras minúsculas, dígitos e underscore)',
});

const FlagValueTypeSchema = z.enum(['BOOLEAN', 'STRING', 'NUMBER', 'JSON']);

const OptionalDescription = z.string().max(500).optional();

export const CriarFeatureFlagDtoSchema = z
  .object({
    key: FlagKeySchema,
    description: OptionalDescription,
    valueType: FlagValueTypeSchema,
    defaultValue: z.unknown(),
  })
  .refine(
    (d) => {
      try {
        FlagValue.criar(d.valueType as 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON', d.defaultValue);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'defaultValue incompatível com valueType', path: ['defaultValue'] }
  );

export type CriarFeatureFlagDto = z.infer<typeof CriarFeatureFlagDtoSchema>;

export const AtualizarFeatureFlagDtoSchema = z
  .object({
    description: OptionalDescription,
    defaultValue: z.unknown().optional(),
    enabled: z.boolean().optional(),
  })
  .refine((d) => !('key' in d) || d.key === undefined, { message: 'key é imutável', path: ['key'] })
  .refine((d) => !('valueType' in d) || d.valueType === undefined, {
    message: 'valueType é imutável',
    path: ['valueType'],
  });

export type AtualizarFeatureFlagDto = z.infer<typeof AtualizarFeatureFlagDtoSchema>;

export const AdicionarOverrideDtoSchema = z
  .object({
    scope: z.enum(['GLOBAL', 'RESTAURANT', 'USER']),
    scopeId: z.string().nullable().optional(),
    value: z.unknown(),
    rolloutPct: z.number().int().min(0).max(100).optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .refine(
    (d) => {
      if (d.scope === 'GLOBAL') return d.scopeId == null;
      return d.scopeId != null && (d.scopeId as string).length > 0;
    },
    { message: 'scopeId obrigatório exceto para GLOBAL', path: ['scopeId'] }
  );

export type AdicionarOverrideDto = z.infer<typeof AdicionarOverrideDtoSchema>;

export const AvaliacaoContextoDtoSchema = z.object({
  keys: z
    .string()
    .min(1, 'keys obrigatório')
    .max(2048, 'keys excede tamanho máximo')
    .refine(
      (s) => {
        const parts = s
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        return parts.length >= 1 && parts.length <= 32;
      },
      { message: 'keys excede o máximo 32 chaves por request' }
    ),
  restaurantId: z.string().optional(),
  userId: z.string().optional(),
});

export type AvaliacaoContextoDto = z.infer<typeof AvaliacaoContextoDtoSchema>;

export const ListarQueryDtoSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListarQueryDto = z.infer<typeof ListarQueryDtoSchema>;

/**
 * Helper de validação — chama `schema.parse(input)` e mapeia erro Zod
 * para `BadRequestException` com mensagem utilizável pelo cliente.
 */
export function validar<T>(schema: z.ZodType<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
        : (err as Error).message;
    throw new BadRequestException(message);
  }
}

export { FlagKeySchema };
