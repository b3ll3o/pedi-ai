import { test, expect, clearClientState } from '../shared/fixtures'
import { LandingPage } from '../../pages/LandingPage'

test.describe('Landing Page', () => {
  let landingPage: LandingPage

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
    await landingPage.goto()
  })

  test.afterEach(async ({ page }) => {
    await clearClientState(page)
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

  test.describe('SEO', () => {
    test('deve ter todos os meta tags de SEO requeridos no head', async ({ page }) => {
      const expectedMetaTags = [
        { name: 'title', key: 'title' },
        { name: 'description', key: 'description' },
        { name: 'robots', key: 'robots' },
        { name: 'og:title', key: 'property', value: 'og:title' },
        { name: 'og:description', key: 'property', value: 'og:description' },
        { name: 'og:image', key: 'property', value: 'og:image' },
        { name: 'og:url', key: 'property', value: 'og:url' },
        { name: 'og:type', key: 'property', value: 'og:type' },
        { name: 'twitter:card', key: 'name', value: 'twitter:card' },
        { name: 'twitter:title', key: 'name', value: 'twitter:title' },
        { name: 'twitter:description', key: 'name', value: 'twitter:description' },
        { name: 'twitter:image', key: 'name', value: 'twitter:image' },
      ]

      for (const tag of expectedMetaTags) {
        let meta: string | null = null
        if (tag.key === 'title') {
          meta = await page.title()
        } else if (tag.key === 'property') {
          meta = await page.$eval(`meta[property="${tag.value}"]`, el => el.getAttribute('content'))
        } else {
          meta = await page.$eval(`meta[name="${tag.name}"]`, el => el.getAttribute('content'))
        }
        expect(meta, `Meta tag ${tag.name} deve estar presente`).not.toBeNull()
        expect(meta?.trim().length, `Meta tag ${tag.name} não pode estar vazia`).toBeGreaterThan(0)
      }
    })

    test('deve ter canonical URL válido', async ({ page }) => {
      const canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href'))
      expect(canonical).not.toBeNull()
      expect(canonical).toContain('pedi-ai')
    })

    test('deve ter scripts JSON-LD válidos e parseáveis', async ({ page }) => {
      const jsonLdScripts = await page.$$('script[type="application/ld+json"]')
      expect(jsonLdScripts.length, 'Deve ter pelo menos um script JSON-LD').toBeGreaterThan(0)

      for (const script of jsonLdScripts) {
        const content = await script.textContent()
        expect(content, 'JSON-LD script não pode estar vazio').not.toBeNull()
        expect(content?.trim().length, 'JSON-LD script não pode estar vazio').toBeGreaterThan(0)

        // Verifica que o JSON é parseável
        expect(() => JSON.parse(content!), 'JSON-LD deve ser JSON válido').not.toThrow()
      }
    })

    test('deve ter schema Organization e WebSite', async ({ page }) => {
      const jsonLdScripts = await page.$$('script[type="application/ld+json"]')
      const allContent = await Promise.all(
        jsonLdScripts.map(script => script.textContent())
      )

      const combinedContent = allContent.join('')
      const parsedSchemas = JSON.parse(combinedContent)
      const schemasArray = Array.isArray(parsedSchemas) ? parsedSchemas : [parsedSchemas]

      const schemaTypes = schemasArray.map((s: Record<string, unknown>) => s['@type'])
      expect(schemaTypes, 'Deve conter schema Organization ou WebSite').toContain('Organization')
      expect(schemaTypes, 'Deve conter schema Organization ou WebSite').toContain('WebSite')
    })
  })
})
