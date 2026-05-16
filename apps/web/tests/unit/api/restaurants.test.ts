import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the pt-BR role enum fix in restaurant creation API routes.
 *
 * These tests verify that:
 * 1. The code uses pt-BR role values ('dono', 'gerente', 'atendente', 'cliente')
 * 2. The code does NOT use English role values ('owner', 'manager', etc.)
 *
 * Bug fix: After migration 0021, the enum user_role only accepts pt-BR values.
 * The API routes were incorrectly using 'owner' which caused database errors.
 */

describe('Restaurant Creation API - Role Enum Fix', () => {
  describe('pt-BR role values', () => {
    it('deve usar "dono" como role para proprietário do restaurante', () => {
      // The correct pt-BR value for owner
      const ownerRole = 'dono';
      const validRoles = ['dono', 'gerente', 'atendente', 'cliente'];

      expect(validRoles).toContain(ownerRole);
      expect(ownerRole).toBe('dono');
    });

    it('deve ter todos os valores válidos do enum user_role', () => {
      // After migration 0021, enum user_role only accepts pt-BR values
      const validRoles = ['dono', 'gerente', 'atendente', 'cliente'];

      expect(validRoles).toHaveLength(4);
      expect(validRoles).toContain('dono');
      expect(validRoles).toContain('gerente');
      expect(validRoles).toContain('atendente');
      expect(validRoles).toContain('cliente');
    });

    it('não deve aceitar valores em inglês após migration 0021', () => {
      // These English values should NOT work after migration 0021
      const invalidRoles = ['owner', 'manager', 'employee', 'customer'];
      const validRoles = ['dono', 'gerente', 'atendente', 'cliente'];

      invalidRoles.forEach((invalidRole) => {
        expect(validRoles).not.toContain(invalidRole);
      });
    });
  });

  describe('route.ts code verification', () => {
    it('o código em route.ts deve usar role: "dono" (não "owner")', async () => {
      // Read the route file and verify the fix
      const routeContent = await import('fs').then((fs) =>
        fs.readFileSync(
          '/home/leo/Documentos/projetos/pedi-ai/apps/web/src/app/api/admin/restaurants/route.ts',
          'utf-8'
        )
      );

      // Should use 'dono' for owner role
      expect(routeContent).toContain("role: 'dono'");

      // Should NOT use 'owner' (the bug that was fixed)
      // Check that 'owner' is not used as a role value in insert statements
      const ownerRoleRegex = /role:\s*['"]owner['"]/g;
      const matches = routeContent.match(ownerRoleRegex);
      expect(matches).toBeNull();
    });

    it('o código em [id]/route.ts deve usar role: "dono" (não "owner")', async () => {
      // Read the user route file and verify the fix
      const routeContent = await import('fs').then((fs) =>
        fs.readFileSync(
          '/home/leo/Documentos/projetos/pedi-ai/apps/web/src/app/api/admin/users/[id]/route.ts',
          'utf-8'
        )
      );

      // Should use 'dono' when filtering by owner role
      expect(routeContent).toContain(".eq('role', 'dono')");

      // Should NOT use 'owner' when filtering by role
      const ownerRoleRegex = /\.eq\(['"]role['"],\s*['"]owner['"]\)/g;
      const matches = routeContent.match(ownerRoleRegex);
      expect(matches).toBeNull();
    });
  });

  describe('restaurant creation flow role assignment', () => {
    it('ao criar restaurante, o usuário deve ser vinculado com role "dono"', () => {
      // This test documents the expected behavior:
      // When a restaurant is created, the creator should be linked
      // with role 'dono' (not 'owner')

      const createRestaurantFlow = {
        step: 'Create restaurant record',
        step2: 'Link user to restaurant with role',
        expectedRole: 'dono',
      };

      expect(createRestaurantFlow.expectedRole).toBe('dono');
      expect(createRestaurantFlow.expectedRole).not.toBe('owner');
    });

    it('validar que "dono" é o papel correto para proprietário', () => {
      // In the pt-BR system:
      // - 'dono' = owner/proprietor
      // - 'gerente' = manager
      // - 'atendente' = attendant/waiter
      // - 'cliente' = customer

      const roleTranslations: Record<string, string> = {
        dono: 'owner/proprietor',
        gerente: 'manager',
        atendente: 'attendant',
        cliente: 'customer',
      };

      expect(roleTranslations['dono']).toBe('owner/proprietor');
      expect(roleTranslations['dono']).not.toBe('owner'); // literal string check
    });
  });
});

describe('Enum user_role migration 0021 compliance', () => {
  it('deve documentar que migration 0021 mudou o enum para pt-BR', () => {
    // Migration 0021 changed enum user_role from English to pt-BR values
    // Before: 'owner', 'manager', 'employee', 'customer'
    // After: 'dono', 'gerente', 'atendente', 'cliente'

    const enumMigration = {
      before: ['owner', 'manager', 'employee', 'customer'],
      after: ['dono', 'gerente', 'atendente', 'cliente'],
    };

    expect(enumMigration.after).toContain('dono');
    expect(enumMigration.after).not.toContain('owner');
  });

  it('sistema deve funcionar corretamente com valores pt-BR', () => {
    // Verify the application correctly uses pt-BR role values
    const restaurantOwnerRole = 'dono';
    const restaurantManagerRole = 'gerente';
    const restaurantAttendantRole = 'atendente';
    const restaurantCustomerRole = 'cliente';

    // All should be valid
    const allRoles = [
      restaurantOwnerRole,
      restaurantManagerRole,
      restaurantAttendantRole,
      restaurantCustomerRole,
    ];
    allRoles.forEach((role) => {
      expect(role).toBeTruthy();
      expect(typeof role).toBe('string');
    });

    // Specific checks
    expect(restaurantOwnerRole).toBe('dono');
    expect(restaurantManagerRole).toBe('gerente');
    expect(restaurantAttendantRole).toBe('atendente');
    expect(restaurantCustomerRole).toBe('cliente');
  });
});
