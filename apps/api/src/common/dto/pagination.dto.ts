import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * DTO genérico de paginação **cursor-based** (mais eficiente que offset
 * em tabelas grandes — evita `OFFSET` que precisa varrer registros pulados).
 *
 * Padrão de uso:
 * - Cliente faz 1ª chamada sem `cursor` → recebe até `limit` itens + `nextCursor`
 * - Para próxima página, envia `?cursor=<nextCursor>` + mesmo `limit`
 * - Quando `nextCursor` é `null`, não há mais páginas
 *
 * `limit` tem **default 20** e **máximo 100** para prevenir DoS acidental.
 *
 * Auditoria origem: A1 (sem paginação em listagens).
 */
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export class PageQueryDto {
  @ApiProperty({
    description: `Cursor opaco da última página (retornado em \`nextCursor\`). Ausente = primeira página.`,
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: 'Tamanho da página (default 20, máximo 100)',
    example: 20,
    default: PAGINATION_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PAGINATION_MAX_LIMIT,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser inteiro' })
  @Min(1, { message: 'limit mínimo é 1' })
  @Max(PAGINATION_MAX_LIMIT, { message: `limit máximo é ${PAGINATION_MAX_LIMIT}` })
  limit?: number = PAGINATION_DEFAULT_LIMIT;
}

/**
 * Resposta padrão de listagem paginada.
 *
 * Type generic `T` é o tipo do item. `nextCursor` é `null` quando não há
 * mais páginas.
 */
export class PageDto<T> {
  @ApiProperty({ description: 'Itens da página atual', isArray: true })
  data!: T[];

  @ApiProperty({
    description: 'Cursor para a próxima página (null se for a última)',
    nullable: true,
  })
  nextCursor!: string | null;

  @ApiProperty({ description: 'Tamanho efetivo da página retornada', example: 20 })
  count!: number;

  static create<T>(data: T[], nextCursor: string | null, count: number): PageDto<T> {
    return { data, nextCursor, count };
  }
}
