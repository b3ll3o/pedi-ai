import { Page, Locator } from '@playwright/test'

/**
 * Page Object para a página de Modificador Groups do Admin
 * URL: /admin/modifiers
 */
export class AdminModifierGroupsPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly modifierGroupsList: Locator
  readonly createButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  // Modal
  readonly modal: Locator
  readonly formTitle: Locator
  readonly nameInput: Locator
  readonly requiredToggle: Locator
  readonly minSelectionsInput: Locator
  readonly maxSelectionsInput: Locator
  readonly valuesSection: Locator
  readonly addValueButton: Locator
  readonly cancelButton: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page

    // Page elements
    this.pageTitle = page.locator('h1')
    this.modifierGroupsList = page.locator('[class*="item"]')
    this.createButton = page.locator('button', { hasText: '+ Novo Grupo' })
    this.successMessage = page.locator('[class*="success"]')
    this.errorMessage = page.locator('[class*="error"]')

    // Modal form
    this.modal = page.locator('[class*="modalContent"]')
    this.formTitle = page.locator('[class*="title"]')
    this.nameInput = page.locator('input[id="name"]')
    this.requiredToggle = page.locator('input[type="checkbox"]')
    this.minSelectionsInput = page.locator('input[id="minSelections"]')
    this.maxSelectionsInput = page.locator('input[id="maxSelections"]')
    this.valuesSection = page.locator('[class*="valuesList"]')
    this.addValueButton = page.locator('button', { hasText: '+ Adicionar Valor' })
    this.cancelButton = page.locator('button', { hasText: 'Cancelar' })
    this.submitButton = page.locator('button[type="submit"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/modifiers')
  }

  async getModifierGroupsCount(): Promise<number> {
    return this.modifierGroupsList.count()
  }

  /**
   * Abre o modal de criação de novo grupo
   */
  async openCreateModal(): Promise<void> {
    await this.createButton.click()
    await this.modal.waitFor({ state: 'visible' })
  }

  /**
   * Abre o modal de edição de um grupo existente pelo nome
   */
  async openEditModal(groupName: string): Promise<void> {
    const groupItem = this.modifierGroupsList.filter({ hasText: groupName })
    await groupItem.locator('button', { hasText: 'Editar' }).click()
    await this.modal.waitFor({ state: 'visible' })
  }

  /**
   * Cria um novo grupo de modificador com valores
   */
  async createModifierGroup(data: {
    name: string
    required?: boolean
    minSelections?: number
    maxSelections?: number
    values?: Array<{ name: string; priceAdjustment: number }>
  }): Promise<void> {
    await this.openCreateModal()

    await this.nameInput.fill(data.name)

    if (data.required !== undefined) {
      const isChecked = await this.requiredToggle.isChecked()
      if (data.required !== isChecked) {
        await this.requiredToggle.click()
      }
    }

    if (data.minSelections !== undefined) {
      await this.minSelectionsInput.fill(data.minSelections.toString())
    }

    if (data.maxSelections !== undefined) {
      await this.maxSelectionsInput.fill(data.maxSelections.toString())
    }

    if (data.values && data.values.length > 0) {
      for (const value of data.values) {
        await this.addValueButton.click()
        const valueRows = this.valuesSection.locator('[class*="valueRow"]')
        const lastRow = valueRows.last()
        await lastRow.locator('input[type="text"]').fill(value.name)
        await lastRow.locator('input[type="number"]').fill(value.priceAdjustment.toString())
      }
    }

    await this.submitButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  /**
   * Edita um grupo existente
   */
  async editModifierGroup(
    groupName: string,
    data: {
      name?: string
      required?: boolean
      minSelections?: number
      maxSelections?: number
    }
  ): Promise<void> {
    await this.openEditModal(groupName)

    if (data.name !== undefined) {
      await this.nameInput.clear()
      await this.nameInput.fill(data.name)
    }

    if (data.required !== undefined) {
      const isChecked = await this.requiredToggle.isChecked()
      if (data.required !== isChecked) {
        await this.requiredToggle.click()
      }
    }

    if (data.minSelections !== undefined) {
      await this.minSelectionsInput.fill(data.minSelections.toString())
    }

    if (data.maxSelections !== undefined) {
      await this.maxSelectionsInput.fill(data.maxSelections.toString())
    }

    await this.submitButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  /**
   * Exclui um grupo de modificador pelo nome
   */
  async deleteModifierGroup(groupName: string): Promise<void> {
    // Escuta pelo dialog antes de clicar
    this.page.once('dialog', dialog => dialog.accept())

    const groupItem = this.modifierGroupsList.filter({ hasText: groupName })
    await groupItem.locator('button', { hasText: 'Excluir' }).click()

    // Aguarda a operação completar
    await this.page.waitForTimeout(500)
  }

  /**
   * Adiciona um valor a um grupo existente
   */
  async addModifierValue(groupName: string, value: { name: string; priceAdjustment: number }): Promise<void> {
    await this.openEditModal(groupName)
    await this.addValueButton.click()

    const valueRows = this.valuesSection.locator('[class*="valueRow"]')
    const lastRow = valueRows.last()
    await lastRow.locator('input[type="text"]').fill(value.name)
    await lastRow.locator('input[type="number"]').fill(value.priceAdjustment.toString())

    await this.submitButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  /**
   * Edita o preço de um valor existente em um grupo
   */
  async editModifierValuePrice(
    groupName: string,
    valueName: string,
    newPriceAdjustment: number
  ): Promise<void> {
    await this.openEditModal(groupName)

    const valueRows = this.valuesSection.locator('[class*="valueRow"]')
    const targetRow = valueRows.filter({ hasText: valueName })
    await targetRow.locator('input[type="number"]').fill(newPriceAdjustment.toString())

    await this.submitButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  /**
   * Remove um valor de um grupo
   */
  async removeModifierValue(groupName: string, valueName: string): Promise<void> {
    await this.openEditModal(groupName)

    const valueRows = this.valuesSection.locator('[class*="valueRow"]')
    const targetRow = valueRows.filter({ hasText: valueName })
    await targetRow.locator('button[aria-label="Remover valor"]').click()

    await this.submitButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  /**
   * Fecha o modal
   */
  async closeModal(): Promise<void> {
    await this.cancelButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  /**
   * Retorna mensagem de erro atual
   */
  async getError(): Promise<string> {
    const errorText = await this.errorMessage.textContent()
    return errorText ?? ''
  }

  /**
   * Verifica se um grupo aparece na lista
   */
  async groupExists(name: string): Promise<boolean> {
    const count = await this.modifierGroupsList.filter({ hasText: name }).count()
    return count > 0
  }
}
