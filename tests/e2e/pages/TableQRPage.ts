import { Page, Locator } from '@playwright/test'

export class TableQRPage {
  readonly page: Page
  readonly tableCodeInput: Locator
  readonly validateButton: Locator
  readonly qrCodeImage: Locator
  readonly tableInfo: Locator
  readonly menuLink: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.tableCodeInput = page.locator('[data-testid="table-code-input"]')
    this.validateButton = page.locator('[data-testid="validate-table-button"]')
    this.qrCodeImage = page.locator('[data-testid="table-qr-code"]')
    this.tableInfo = page.locator('[data-testid="table-info"]')
    this.menuLink = page.locator('[data-testid="menu-link"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
    this.successMessage = page.locator('[data-testid="success-message"]')
  }

  async goto(tableCode?: string): Promise<void> {
    if (tableCode) {
      await this.page.goto(`/table/${tableCode}`)
    } else {
      await this.page.goto('/table')
    }
  }

  async validateTable(tableCode: string): Promise<void> {
    await this.tableCodeInput.fill(tableCode)
    await this.validateButton.click()
    await this.successMessage.waitFor({ state: 'visible' })
  }

  async getTableInfo(): Promise<{ code: string; name: string }> {
    const info = await this.tableInfo.textContent() ?? ''
    // Parse table info from text
    const codeMatch = info.match(/code[:\s]*([A-Z0-9-]+)/i)
    const nameMatch = info.match(/name[:\s]*(.+)/i)
    return {
      code: codeMatch ? codeMatch[1] : '',
      name: nameMatch ? nameMatch[1] : '',
    }
  }

  async proceedToMenu(): Promise<void> {
    await this.menuLink.click()
    await this.page.waitForURL('/menu')
  }

  async getError(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? ''
  }

  async getQRCodeValue(): Promise<string> {
    const src = await this.qrCodeImage.getAttribute('src')
    return src ?? ''
  }

  async downloadQRCode(): Promise<void> {
    await this.qrCodeImage.click()
    // Handle download
  }
}
