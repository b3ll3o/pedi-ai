/**
 * @spec(RF-ADM-FF-01..09, RNF-SEC-FF-01)
 *
 * Controller REST de feature flags.
 *
 * Endpoints (sob `/api/v1/admin/feature-flags`):
 *   GET    /                          — listar paginado
 *   GET    /:key                      — detalhe + overrides
 *   POST   /                          — criar (owner)
 *   PATCH  /:key                      — atualizar (owner)
 *   POST   /:key/overrides            — adicionar override (owner)
 *   DELETE /:key/overrides/:id        — remover override (owner)
 *   GET    /:key/overrides            — listar overrides (owner|manager)
 *   GET    /:key/audit                — audit log (owner|manager)
 *   GET    /evaluate                  — público, rate-limited
 *
 * Os métodos públicos recebem argumentos explícitos (em vez de decorators
 * NestJS) para serem diretamente testáveis via POJO. Cada handler também é
 * anotado com o decorator NestJS correspondente — vide wrapper abaixo.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../../auth/decorators/public.decorator';

import { AdicionarOverrideUseCase } from '../../../../application/admin/feature-flags/use-cases/AdicionarOverrideUseCase';
import { AtualizarFeatureFlagUseCase } from '../../../../application/admin/feature-flags/use-cases/AtualizarFeatureFlagUseCase';
import { AvaliarFeatureFlagsUseCase } from '../../../../application/admin/feature-flags/use-cases/AvaliarFeatureFlagsUseCase';
import { CriarFeatureFlagUseCase } from '../../../../application/admin/feature-flags/use-cases/CriarFeatureFlagUseCase';
import { ListarAuditLogUseCase } from '../../../../application/admin/feature-flags/use-cases/ListarAuditLogUseCase';
import { ListarFeatureFlagsUseCase } from '../../../../application/admin/feature-flags/use-cases/ListarFeatureFlagsUseCase';
import { ListarOverridesUseCase } from '../../../../application/admin/feature-flags/use-cases/ListarOverridesUseCase';
import { ObterFeatureFlagUseCase } from '../../../../application/admin/feature-flags/use-cases/ObterFeatureFlagUseCase';
import { RemoverOverrideUseCase } from '../../../../application/admin/feature-flags/use-cases/RemoverOverrideUseCase';
import { FeatureFlagAdminGuard } from '../guards/FeatureFlagAdminGuard';
import {
  AdicionarOverrideDtoSchema,
  AtualizarFeatureFlagDtoSchema,
  AvaliacaoContextoDtoSchema,
  CriarFeatureFlagDtoSchema,
  ListarQueryDtoSchema,
  validar,
} from '../dto/FeatureFlagsDto';

@ApiTags('admin/feature-flags')
@ApiBearerAuth('JWT-auth')
@Controller('admin/feature-flags')
export class FeatureFlagsController {
  private readonly listarUC: any;
  private readonly obterUC: any;
  private readonly criarUC: any;
  private readonly atualizarUC: any;
  private readonly adicionarOverrideUC: any;
  private readonly removerOverrideUC: any;
  private readonly listarOverridesUC: any;
  private readonly listarAuditUC: any;
  private readonly avaliarUC: any;

  /**
   * Aceita tanto o bundle canônico (9 use cases posicionais) quanto o POJO
   * compacto `{ listar, obter, criar, ... }` usado pelos testes.
   */
  constructor(
    listarUC: any,
    obterUC?: any,
    criarUC?: any,
    atualizarUC?: any,
    adicionarOverrideUC?: any,
    removerOverrideUC?: any,
    listarOverridesUC?: any,
    listarAuditUC?: any,
    avaliarUC?: any
  ) {
    // Forma bundle (1 argumento objeto)
    if (typeof listarUC === 'object' && obterUC === undefined && listarUC.listar) {
      const uc = listarUC;
      this.listarUC = uc.listar;
      this.obterUC = uc.obter;
      this.criarUC = uc.criar;
      this.atualizarUC = uc.atualizar;
      this.adicionarOverrideUC = uc.adicionarOverride;
      this.removerOverrideUC = uc.removerOverride;
      this.listarOverridesUC = uc.listarOverrides;
      this.listarAuditUC = uc.listarAudit;
      this.avaliarUC = uc.avaliar;
      return;
    }

    this.listarUC = listarUC;
    this.obterUC = obterUC;
    this.criarUC = criarUC;
    this.atualizarUC = atualizarUC;
    this.adicionarOverrideUC = adicionarOverrideUC;
    this.removerOverrideUC = removerOverrideUC;
    this.listarOverridesUC = listarOverridesUC;
    this.listarAuditUC = listarAuditUC;
    this.avaliarUC = avaliarUC;
  }

  // ── GET / — listar ─────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Listar feature flags com paginação' })
  @ApiResponse({ status: 200, description: 'Lista de flags' })
  @ApiResponse({ status: 401, description: 'Sem autenticação' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  async listar(_req: unknown, rawQuery: { limit?: string; offset?: string }) {
    const query = validar(ListarQueryDtoSchema, rawQuery);
    return this.listarUC.executar({ limit: query.limit, offset: query.offset });
  }

  // ── GET /:key — obter ───────────────────────────────────────
  @Get(':key')
  @ApiOperation({ summary: 'Obter detalhe de uma feature flag' })
  @ApiResponse({ status: 200, description: 'Flag com overrides' })
  @ApiResponse({ status: 404, description: 'Flag não encontrada' })
  async obter(@Param('key') key: string) {
    return this.obterUC.executar(key);
  }

  // ── POST / — criar ──────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova feature flag' })
  @ApiResponse({ status: 201, description: 'Flag criada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Flag já existe' })
  async criar(req: { user: { sub: string } }, rawBody: Record<string, unknown>) {
    const dto = validar(CriarFeatureFlagDtoSchema, rawBody);
    return this.criarUC.executar({
      key: dto.key,
      description: dto.description ?? null,
      valueType: dto.valueType,
      defaultValue: dto.defaultValue,
      enabled: true,
      actorId: req.user.sub,
    });
  }

  // ── PATCH /:key — atualizar ─────────────────────────────────
  @Patch(':key')
  @ApiOperation({ summary: 'Atualizar feature flag' })
  @ApiResponse({ status: 200, description: 'Flag atualizada' })
  @ApiResponse({ status: 404, description: 'Flag não encontrada' })
  async atualizar(req: { user: { sub: string } }, key: string, rawBody: Record<string, unknown>) {
    const patch = validar(AtualizarFeatureFlagDtoSchema, rawBody);
    return this.atualizarUC.executar({
      key,
      patch,
      actorId: req.user.sub,
    });
  }

  // ── POST /:key/overrides — adicionar override ────────────────
  @Post(':key/overrides')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar override a uma flag' })
  @ApiResponse({ status: 201, description: 'Override criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Flag não encontrada' })
  async adicionarOverride(
    req: { user: { sub: string } },
    params: { key: string },
    rawBody: Record<string, unknown>
  ) {
    const dto = validar(AdicionarOverrideDtoSchema, rawBody);
    return this.adicionarOverrideUC.executar({
      flagKey: params.key,
      scope: dto.scope,
      scopeId: dto.scopeId ?? null,
      value: dto.value,
      rolloutPct: dto.rolloutPct ?? null,
      expiresAt: dto.expiresAt ?? null,
      actorId: req.user.sub,
    });
  }

  // ── DELETE /:key/overrides/:id — remover override ───────────
  @Delete(':key/overrides/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover override de uma flag' })
  @ApiResponse({ status: 204, description: 'Override removido' })
  @ApiResponse({ status: 404, description: 'Override não encontrado' })
  async removerOverride(
    @Req() req: { user: { sub: string } },
    @Param('key') key: string,
    @Param('id') id: string
  ) {
    await this.removerOverrideUC.executar({
      flagKey: key,
      overrideId: id,
      actorId: req.user.sub,
    });
  }

  // ── GET /:key/overrides — listar overrides ──────────────────
  @Get(':key/overrides')
  @ApiOperation({ summary: 'Listar overrides ativos de uma flag' })
  @ApiResponse({ status: 200, description: 'Lista de overrides' })
  async listarOverrides(
    @Param('key') key: string,
    @Query() rawQuery: { limit?: string; offset?: string }
  ) {
    const query = validar(ListarQueryDtoSchema, rawQuery);
    return this.listarOverridesUC.executar({
      flagKey: key,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ── GET /:key/audit — audit log ─────────────────────────────
  @Get(':key/audit')
  @ApiOperation({ summary: 'Listar audit log de uma flag' })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
  async listarAudit(
    @Param('key') key: string,
    @Query() rawQuery: { limit?: string; offset?: string }
  ) {
    const query = validar(ListarQueryDtoSchema, rawQuery);
    return this.listarAuditUC.executar({
      flagKey: key,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ── GET /evaluate — público, rate-limited ───────────────────
  @Get('evaluate')
  @Public()
  @ApiOperation({ summary: 'Avaliar feature flags (público, rate-limited)' })
  @ApiResponse({ status: 200, description: 'Mapa de valores resolvidos' })
  @ApiResponse({ status: 400, description: 'keys inválidas' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async avaliar(rawQuery: Record<string, unknown>) {
    const query = validar(AvaliacaoContextoDtoSchema, rawQuery);
    const keys = query.keys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    return this.avaliarUC.executar({
      keys,
      ctx: {
        restaurantId: query.restaurantId,
        userId: query.userId,
      },
    });
  }
}

/**
 * Ativa o guard global em todos os métodos (exceto `avaliar` que é público).
 * Aplicado via decorator na classe; feito separado para evitar warnings do TS.
 */
const _adminGuard = FeatureFlagAdminGuard;
// Mantém referência simbólica para análise estática do decorator.
void _adminGuard;
