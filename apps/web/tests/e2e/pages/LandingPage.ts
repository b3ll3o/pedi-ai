import { Page, Locator } from '@playwright/test'

export class LandingPage {
  readonly page: Page

  // Navbar
  readonly navbar: Locator
  readonly navLinks: Locator
  readonly funcionalidadesLink: Locator
  readonly precosLink: Locator
  readonly ctaButton: Locator
  readonly hamburgerButton: Locator
  readonly mobileMenu: Locator
  readonly mobileNavLinks: Locator

  // Hero
  readonly heroSection: Locator
  readonly heroTitle: Locator

  // Sections
  readonly socialProofSection: Locator
  readonly howItWorksSection: Locator
  readonly featuresSection: Locator
  readonly pricingSection: Locator
  readonly pricingCards: Locator
  readonly faqSection: Locator
  readonly footer: Locator

  constructor(page: Page) {
    this.page = page

    // Navbar
    this.navbar = page.locator('nav[aria-label="Navegação principal"]')
    this.navLinks = page.locator('nav[aria-label="Navegação principal"] ul li a')
    this.funcionalidadesLink = page.locator('nav[aria-label="Navegação principal"] a[href="#features"]').first()
    this.precosLink = page.locator('nav[aria-label="Navegação principal"] a[href="#pricing"]').first()
    this.ctaButton = page.locator('nav[aria-label="Navegação principal"] a[href="/register"]:has-text("Começar Agora")').first()
    this.hamburgerButton = page.locator('nav[aria-label="Navegação principal"] button[aria-label]')
    this.mobileMenu = page.locator('#mobile-menu')
    this.mobileNavLinks = page.locator('#mobile-menu a')

    // Hero
    this.heroSection = page.locator('section[aria-labelledby="hero-title"]')
    this.heroTitle = page.locator('h1#hero-title')

    // Sections
    this.socialProofSection = page.locator('section[aria-labelledby="social-proof-title"]')
    this.howItWorksSection = page.locator('section[aria-labelledby="how-it-works-title"]')
    this.featuresSection = page.locator('section[id="features"]')
    this.pricingSection = page.locator('section[id="pricing"]')
    this.pricingCards = page.locator('#pricing > div > div > div')
    this.faqSection = page.locator('section[aria-labelledby="faq-title"]')
    this.footer = page.getByRole('contentinfo').first()
  }

  async goto(): Promise<void> {
    await this.page.goto('/')
  }

  async scrollToSection(sectionId: string): Promise<void> {
    await this.page.evaluate((id) => {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'instant' })
      }
    }, sectionId)
    // Wait for intersection observer to update active state
    await this.page.waitForTimeout(200)
  }

  async openMobileMenu(): Promise<void> {
    await this.hamburgerButton.click()
    await this.page.waitForTimeout(100)
  }

  async closeMobileMenu(): Promise<void> {
    await this.hamburgerButton.click()
    await this.page.waitForTimeout(100)
  }

  async clickOutsideToClose(): Promise<void> {
    await this.page.mouse.click(10, 10)
    await this.page.waitForTimeout(100)
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(100)
  }

  async getLinkHref(linkText: string): Promise<string | null> {
    return this.page.locator(`nav[aria-label="Navegação principal"] a:has-text("${linkText}")`).getAttribute('href')
  }

  async isLinkActive(link: Locator): Promise<boolean> {
    const attr = await link.getAttribute('aria-current')
    return attr === 'true'
  }
}
