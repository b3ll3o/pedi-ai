/**
 * Multi-tenant shared kernel — exports públicos do BC `shared`.
 *
 * Auditoria P0-01 (2026-07-29): helpers para garantir isolamento
 * multi-tenant em queries Prisma. Toda operação sobre model com
 * coluna `restaurantId` deve passar pelo `RestaurantScopedRepository`
 * para prevenir BOLA (OWASP API #1 — Broken Object Level Authorization).
 *
 * **Por que um BC dedicado?**
 * - Models multi-tenant (Product, Order, Category, ...) compartilham
 *   a mesma regra de "filtro WHERE por tenant". Centralizar a regra
 *   em um helper evita divergência entre services.
 * - Fail-closed por construção: o construtor lança `ForbiddenException`
 *   se o tenant não for fornecido — call sites que esquecem de passar
 *   `restaurantId` falham alto no boot/testes, não silenciosamente em
 *   produção.
 *
 * @see apps/api/src/shared/multi-tenant/scoped-repository.ts
 */

export { RestaurantScopedRepository, scopedRepository } from './scoped-repository';
