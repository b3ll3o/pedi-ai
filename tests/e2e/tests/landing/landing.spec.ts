import { test, expect } from '../shared/fixtures'
import { LandingPage } from '../../pages/LandingPage'

test.describe('Landing Page', () => {
  let landingPage: LandingPage

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
    await landingPage.goto()
  })

  test.describe('Navbar', () => {
    test('deve ter aria-label correto na navegação', async () => {
      await expect(landingPage.navbar).toBeVisible()
      await expect(landingPage.navbar).toHaveAttribute('aria-label', 'Navegação principal')
    })

    test('deve ter link Funcionalidades com href correto', async () => {
      await expect(landingPage.funcionalidadesLink).toBeVisible()
      const href = await landingPage.funcionalidadesLink.getAttribute('href')
      expect(href).toBe('#features')
    })

    test('deve ter link Preços com href correto', async () => {
      await expect(landingPage.precosLink).toBeVisible()
      const href = await landingPage.precosLink.getAttribute('href')
      expect(href).toBe('#pricing')
    })

    test('CTA Começar Agora deve linkar para /register', async () => {
      await expect(landingPage.ctaButton).toBeVisible()
      const href = await landingPage.ctaButton.getAttribute('href')
      expect(href).toBe('/register')
    })
  })

  test.describe('Scroll e Active State', () => {
    test('scroll para #features deve ativar link Funcionalidades', async () => {
      await landingPage.scrollToSection('features')
      const isActive = await landingPage.isLinkActive(landingPage.funcionalidadesLink)
      expect(isActive).toBe(true)
    })

    test('scroll para #pricing deve ativar link Preços', async () => {
      await landingPage.scrollToSection('pricing')
      const isActive = await landingPage.isLinkActive(landingPage.precosLink)
      expect(isActive).toBe(true)
    })
  })

  test.describe('Seções da Landing Page', () => {
    test('hero section deve estar visível com título', async () => {
      await expect(landingPage.heroSection).toBeVisible()
      await expect(landingPage.heroTitle).toBeVisible()
    })

    test('social proof bar deve estar visível', async () => {
      await expect(landingPage.socialProofSection).toBeVisible()
    })

    test('seção Como Funciona deve estar visível', async () => {
      await expect(landingPage.howItWorksSection).toBeVisible()
    })

    test('seção Funcionalidades deve estar visível', async () => {
      await expect(landingPage.featuresSection).toBeVisible()
    })

    test('seção Preços deve estar visível com 3 cards', async () => {
      await expect(landingPage.pricingSection).toBeVisible()
      await expect(landingPage.pricingCards).toHaveCount(3)
    })

    test('seção FAQ deve estar visível', async () => {
      await expect(landingPage.faqSection).toBeVisible()
    })

    test('footer deve estar visível', async () => {
      await expect(landingPage.footer).toBeVisible()
    })
  })

  test.describe('Responsividade', () => {
    test('em desktop, hamburger menu não deve estar visível', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await expect(landingPage.hamburgerButton).not.toBeVisible()
    })

    test('em mobile, hamburger menu deve aparecer', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(landingPage.hamburgerButton).toBeVisible()
    })

    test('em mobile, menu deve expandir ao clicar no hamburger', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await landingPage.openMobileMenu()
      await expect(landingPage.mobileMenu).toHaveAttribute('aria-hidden', 'false')
    })

    test('em mobile, menu deve fechar ao clicar fora', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await landingPage.openMobileMenu()
      await expect(landingPage.mobileMenu).toHaveAttribute('aria-hidden', 'false')
      await landingPage.clickOutsideToClose()
      await expect(landingPage.mobileMenu).toHaveAttribute('aria-hidden', 'true')
    })

    test('em mobile, menu deve fechar ao pressionar ESC', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await landingPage.openMobileMenu()
      await expect(landingPage.mobileMenu).toHaveAttribute('aria-hidden', 'false')
      await landingPage.pressEscape()
      await expect(landingPage.mobileMenu).toHaveAttribute('aria-hidden', 'true')
    })
  })

  test.describe('Acessibilidade', () => {
    test('todos os links da navbar devem ter texto descritivo', async () => {
      const links = await landingPage.navLinks.all()
      for (const link of links) {
        const text = await link.textContent()
        expect(text?.trim().length).toBeGreaterThan(0)
      }
    })
  })
})
