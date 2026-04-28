import { test, expect } from '../shared/fixtures'
import { AdminModifierGroupsPage } from '../../pages/AdminModifierGroupsPage'

test.describe('Admin Modifier Groups', () => {
  let modifierGroupsPage: AdminModifierGroupsPage
  const TEST_GROUP_PREFIX = `E2E_Test_Group_${Date.now()}`

  test.beforeEach(async ({ admin }) => {
    modifierGroupsPage = new AdminModifierGroupsPage(admin)
    await modifierGroupsPage.goto()
  })

  test.afterEach(async () => {
    // Cleanup: deleta grupos de teste criados
    const groupsToClean = [
      `${TEST_GROUP_PREFIX}_Create`,
      `${TEST_GROUP_PREFIX}_Create_Opcional`,
      `${TEST_GROUP_PREFIX}_Edit`,
      `${TEST_GROUP_PREFIX}_Edit_Updated`,
      `${TEST_GROUP_PREFIX}_Edit_Required`,
      `${TEST_GROUP_PREFIX}_Delete`,
      `${TEST_GROUP_PREFIX}_AddValue`,
      `${TEST_GROUP_PREFIX}_EditPrice`,
      `${TEST_GROUP_PREFIX}_RemoveValue`,
    ]

    for (const groupName of groupsToClean) {
      try {
        if (await modifierGroupsPage.groupExists(groupName)) {
          await modifierGroupsPage.deleteModifierGroup(groupName)
        }
      } catch {
        // Ignora erros de cleanup
      }
    }
  })

  test.describe('5.2.1 - Create modifier group', () => {
    test('should create modifier group with name, required flag, and values', async ({ admin: _admin }) => {
      const groupName = `${TEST_GROUP_PREFIX}_Create`

      await modifierGroupsPage.createModifierGroup({
        name: groupName,
        required: true,
        minSelections: 1,
        maxSelections: 3,
        values: [
          { name: 'Pequeno', priceAdjustment: 0 },
          { name: 'Médio', priceAdjustment: 3 },
          { name: 'Grande', priceAdjustment: 6 },
        ],
      })

      // Verifica que o grupo aparece na lista
      await expect(
        modifierGroupsPage.modifierGroupsList.filter({ hasText: groupName })
      ).toBeVisible()

      // Verifica que aparece como obrigatório
      await expect(
        modifierGroupsPage.modifierGroupsList.filter({ hasText: `${groupName}` }).filter({ hasText: 'Obrigatório' })
      ).toBeVisible()
    })

    test('should create optional modifier group', async ({ admin: _admin }) => {
      const groupName = `${TEST_GROUP_PREFIX}_Create_Opcional`

      await modifierGroupsPage.createModifierGroup({
        name: groupName,
        required: false,
        values: [{ name: 'Bacon', priceAdjustment: 5 }],
      })

      await expect(
        modifierGroupsPage.modifierGroupsList.filter({ hasText: groupName })
      ).toBeVisible()
    })
  })

  test.describe('5.2.2 - Edit modifier group', () => {
    test('should update modifier group name', async ({ admin: _admin }) => {
      const originalName = `${TEST_GROUP_PREFIX}_Edit`
      const newName = `${TEST_GROUP_PREFIX}_Edit_Updated`

      // Cria o grupo primeiro
      await modifierGroupsPage.createModifierGroup({
        name: originalName,
        required: false,
        values: [{ name: 'Valor1', priceAdjustment: 1 }],
      })

      // Edita o nome
      await modifierGroupsPage.editModifierGroup(originalName, { name: newName })

      // Verifica que o novo nome aparece
      await expect(
        modifierGroupsPage.modifierGroupsList.filter({ hasText: newName })
      ).toBeVisible()

      // Verifica que o nome antigo não aparece mais
      const oldGroupCount = await modifierGroupsPage.modifierGroupsList.filter({ hasText: originalName }).count()
      expect(oldGroupCount).toBe(0)
    })

    test('should update required flag', async ({ admin: _admin }) => {
      const groupName = `${TEST_GROUP_PREFIX}_Edit_Required`

      // Cria como opcional
      await modifierGroupsPage.createModifierGroup({
        name: groupName,
        required: false,
      })

      // Edita para obrigatório
      await modifierGroupsPage.editModifierGroup(groupName, { required: true })

      // Verifica que aparece como obrigatório
      await expect(
        modifierGroupsPage.modifierGroupsList.filter({ hasText: groupName }).filter({ hasText: 'Obrigatório' })
      ).toBeVisible()
    })
  })

  test.describe('5.2.3 - Delete modifier group', () => {
    test('should soft-delete modifier group', async ({ admin: _admin }) => {
      const groupName = `${TEST_GROUP_PREFIX}_Delete`

      // Cria o grupo primeiro
      await modifierGroupsPage.createModifierGroup({
        name: groupName,
        required: false,
      })

      // Verifica que existe
      await expect(
        modifierGroupsPage.modifierGroupsList.filter({ hasText: groupName })
      ).toBeVisible()

      // Deleta o grupo
      await modifierGroupsPage.deleteModifierGroup(groupName)

      // Aguarda atualização da lista
      await modifierGroupsPage.page.waitForTimeout(1000)

      // Verifica que o grupo não aparece mais na lista
      const count = await modifierGroupsPage.modifierGroupsList.filter({ hasText: groupName }).count()
      expect(count).toBe(0)
    })
  })

  test.describe('5.2.4 - Add modifier value to group', () => {
    test('should add new value with name and price adjustment', async ({ admin: _admin }) => {
      const groupName = `${TEST_GROUP_PREFIX}_AddValue`

      // Cria o grupo com um valor inicial
      await modifierGroupsPage.createModifierGroup({
        name: groupName,
        required: true,
        values: [{ name: 'Valor Inicial', priceAdjustment: 0 }],
      })

      // Adiciona um novo valor
      await modifierGroupsPage.addModifierValue(groupName, {
        name: 'Novo Valor',
        priceAdjustment: 4.5,
      })

      // Edita o grupo e verifica que o novo valor aparece
      await modifierGroupsPage.openEditModal(groupName)

      await expect(
        modifierGroupsPage.valuesSection.filter({ hasText: 'Novo Valor' })
      ).toBeVisible()

      await modifierGroupsPage.closeModal()
    })
  })

  test.describe('5.2.5 - Edit modifier value price', () => {
    test('should change price adjustment of modifier value', async ({ admin: _admin }) => {
      const groupName = `${TEST_GROUP_PREFIX}_EditPrice`

      // Cria o grupo com valores
      await modifierGroupsPage.createModifierGroup({
        name: groupName,
        required: false,
        values: [{ name: 'Valor Editavel', priceAdjustment: 5 }],
      })

      // Edita o preço do valor
      await modifierGroupsPage.editModifierValuePrice(groupName, 'Valor Editavel', 8.5)

      // Verifica a edição abrindo o grupo novamente
      await modifierGroupsPage.openEditModal(groupName)

      const valueRow = modifierGroupsPage.valuesSection.filter({ hasText: 'Valor Editavel' })
      const priceInput = valueRow.locator('input[type="number"]')
      const priceValue = await priceInput.inputValue()

      expect(parseFloat(priceValue)).toBe(8.5)

      await modifierGroupsPage.closeModal()
    })
  })

  test.describe('5.2.6 - Remove modifier value', () => {
    test('should soft-delete modifier value from group', async ({ admin: _admin }) => {
      const groupName = `${TEST_GROUP_PREFIX}_RemoveValue`

      // Cria o grupo com múltiplos valores
      await modifierGroupsPage.createModifierGroup({
        name: groupName,
        required: false,
        values: [
          { name: 'Valor 1', priceAdjustment: 1 },
          { name: 'Valor 2', priceAdjustment: 2 },
          { name: 'Valor para Remover', priceAdjustment: 3 },
        ],
      })

      // Remove o valor
      await modifierGroupsPage.removeModifierValue(groupName, 'Valor para Remover')

      // Verifica que o valor não aparece mais
      await modifierGroupsPage.openEditModal(groupName)

      const removedValueCount = await modifierGroupsPage.valuesSection.filter({ hasText: 'Valor para Remover' }).count()
      expect(removedValueCount).toBe(0)

      // Verifica que os outros valores ainda existem
      await expect(
        modifierGroupsPage.valuesSection.filter({ hasText: 'Valor 1' })
      ).toBeVisible()

      await modifierGroupsPage.closeModal()
    })
  })
})
