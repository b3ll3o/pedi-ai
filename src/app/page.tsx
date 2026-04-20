import type { Metadata } from 'next';
import styles from "./page.module.css";
import {
  Smartphone,
  WifiOff,
  QrCode,
  Zap,
  Monitor,
  TrendingUp,
  ShieldCheck,
  Clock,
  Star,
  HelpCircle,
  Check,
  ArrowRight,
  UtensilsCrossed,
  ShoppingCart,
  Bell,
  CreditCard,
  Sparkles,
  PackageSearch,
  ChefHat,
  BellRing,
  BarChart3,
  Utensils,
  AlertCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: 'Cardápio Digital Restaurantes | Pedi-AI - Funciona Offline',
  description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa, Kitchen Display e muito mais. Teste grátis 14 dias.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Cardápio Digital Restaurantes | Pedi-AI',
    description: 'Cardápio digital que funciona offline para restaurantes. Teste grátis 14 dias.',
    url: '/',
    type: 'website',
  },
};

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <div className={styles.logo}>
            <UtensilsCrossed size={28} className={styles.logoIcon} />
            <span className={styles.logoText}>Pedi-AI</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#pricing" className={styles.navLink}>Preços</a>
          </div>
          <a href="/register" aria-label="Criar conta gratuita no Pedi-AI" className={styles.navCta}>
            Começar Agora
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.heroBlob1} />
          <div className={styles.heroBlob2} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} />
            <span>Teste grátis por 14 dias</span>
          </div>
          <h1 className={styles.heroTitle}>
            Nunca mais perca um pedido<br />
            <span className={styles.heroTitleAccent}>nem offline</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Cardápio digital que funciona sem internet, com pedidos em tempo real para cozinha e gerenciamento completo do seu restaurante.
          </p>
          <div className={styles.heroTags}>
            <span className={styles.heroTag}>
              <CreditCard size={14} />
              Sem cartão de crédito
            </span>
            <span className={styles.heroTag}>
              <WifiOff size={14} />
              Funciona offline
            </span>
          </div>
          <div className={styles.heroCtas}>
            <a href="/register" aria-label="Criar conta gratuita no Pedi-AI" className={styles.ctaPrimary}>
              Começar Gratuitamente
              <ArrowRight size={18} />
            </a>
            <a href="#how-it-works" aria-label="Ver como funciona o Pedi-AI" className={styles.ctaSecondary}>
              Ver Como Funciona
            </a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>+500</span>
              <span className={styles.statLabel}>Restaurantes</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>4.9</span>
              <span className={styles.statLabel}>
                <Star size={12} fill="currentColor" /> Avaliação média
              </span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>99.9%</span>
              <span className={styles.statLabel}>Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className={styles.socialProof}>
        <div className={styles.container}>
          <p className={styles.socialProofLabel}>Mais de 500 restaurantes já aumentaram suas vendas</p>
          <div className={styles.socialProofLogos}>
            <div className={styles.socialProofLogo}>
              <UtensilsCrossed size={24} />
              <span>Lanches do Bairro</span>
            </div>
            <div className={styles.socialProofLogo}>
              <ChefHat size={24} />
              <span>Pizza Express</span>
            </div>
            <div className={styles.socialProofLogo}>
              <UtensilsCrossed size={24} />
              <span>Espetinho & Cia</span>
            </div>
              <div className={styles.socialProofLogo}>
                <Utensils size={24} />
                <span>Café Central</span>
              </div>
            <div className={styles.socialProofLogo}>
              <UtensilsCrossed size={24} />
              <span>Bistrô Gourmet</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <Zap size={14} />
            <span>Como Funciona</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Comece em 3 passos simples
          </h2>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepIcon}>
                <QrCode size={32} />
              </div>
              <h3 className={styles.stepTitle}>Cadastre seu cardápio</h3>
              <p className={styles.stepText}>
                Adicione fotos, preços e descrições dos seus pratos em minutos. Sem complicação.
              </p>
            </div>
            <div className={styles.stepConnector} />
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepIcon}>
                <PackageSearch size={32} />
              </div>
              <h3 className={styles.stepTitle}>Gere os QR Codes</h3>
              <p className={styles.stepText}>
                Imprima e distribua nas mesas. Cada QR Code redireciona para o cardápio digital.
              </p>
            </div>
            <div className={styles.stepConnector} />
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepIcon}>
                <BellRing size={32} />
              </div>
              <h3 className={styles.stepTitle}>Receba pedidos</h3>
              <p className={styles.stepText}>
                Instantaneamente no Kitchen Display. Mesmo sem internet, os pedidos são salvos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className={styles.problems}>
        <div className={styles.container}>
            <div className={styles.sectionBadge}>
              <AlertCircle size={14} />
              <span>Problemas Comuns</span>
            </div>
          <h2 className={styles.sectionTitle}>
            Você já conhece esses problemas
          </h2>
          <div className={styles.problemsGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <WifiOff size={24} />
              </div>
              <h3 className={styles.problemTitle}>Pedido perdido offline</h3>
              <p className={styles.problemText}>
                Quando a internet cai, seu sistema de pedidos para. Você perde vendas e precisa explicar para o cliente.
              </p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <Clock size={24} />
              </div>
              <h3 className={styles.problemTitle}>Atraso na cozinha</h3>
              <p className={styles.problemText}>
                Comandas impressas se perdem, pedidos demoram para chegar e clientes ficam esperando.
              </p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <BarChart3 size={24} />
              </div>
              <h3 className={styles.problemTitle}>Sem dados de vendas</h3>
              <p className={styles.problemText}>
                Você não sabe o que vende mais, nem consegue prever demanda. Decisões no escuro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <Star size={14} />
            <span>Funcionalidades</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Tudo que você precisa para vender mais
          </h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <WifiOff size={24} />
              </div>
              <h3 className={styles.featureTitle}>Funciona Offline</h3>
              <p className={styles.featureText}>
                Pedidos salvos localmente e sincronizados quando a conexão voltar.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <QrCode size={24} />
              </div>
              <h3 className={styles.featureTitle}>QR Code por Mesa</h3>
              <p className={styles.featureText}>
                Clientes escaneiam e já veem o cardápio com identificação da mesa.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Zap size={24} />
              </div>
              <h3 className={styles.featureTitle}>Pedidos em Tempo Real</h3>
              <p className={styles.featureText}>
                Cozinha recebe pedidos instantaneamente. Sem demora, sem perdas.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Bell size={24} />
              </div>
              <h3 className={styles.featureTitle}>Notificações</h3>
              <p className={styles.featureText}>
                Alertas sonoros e visuais quando novos pedidos chegam.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Smartphone size={24} />
              </div>
              <h3 className={styles.featureTitle}>Mobile-First</h3>
              <p className={styles.featureText}>
                Interface otimizada para touch em qualquer celular ou tablet.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Monitor size={24} />
              </div>
              <h3 className={styles.featureTitle}>Kitchen Display</h3>
              <p className={styles.featureText}>
                Visualização de pedidos na cozinha por ordem de chegada.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <ShoppingCart size={24} />
              </div>
              <h3 className={styles.featureTitle}>Carrinho Offline</h3>
              <p className={styles.featureText}>
                Cliente monta o pedido mesmo sem internet.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <TrendingUp size={24} />
              </div>
              <h3 className={styles.featureTitle}>Relatórios</h3>
              <p className={styles.featureText}>
                Vendas por período, itens mais vendidos, ticket médio.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <ShieldCheck size={24} />
              </div>
              <h3 className={styles.featureTitle}>100% Seguro</h3>
              <p className={styles.featureText}>
                Dados criptografados, backups automáticos e compliance LGPD.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={styles.testimonials}>
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <Star size={14} />
            <span>Depoimentos</span>
          </div>
          <h2 className={styles.sectionTitle}>
            O que nossos clientes dizem
          </h2>
          <div className={styles.testimonialsGrid}>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={styles.testimonialStars}>
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <span className={styles.testimonialBadge}>Básico</span>
              </div>
              <p className={styles.testimonialText}>
                &ldquo;Finalmente um sistema que funciona quando a internet cai. Já perdi muitos pedidos antes, agora isso não acontece mais.&rdquo;
              </p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>MF</div>
                <div>
                  <span className={styles.testimonialName}>Marcos Ferreira</span>
                  <span className={styles.testimonialRole}>Dono, Lanches do Bairro</span>
                </div>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={styles.testimonialStars}>
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <span className={`${styles.testimonialBadge} ${styles.testimonialBadgePopular}`}>Mais Popular</span>
              </div>
              <p className={styles.testimonialText}>
                &ldquo;Minha equipe adorou o Kitchen Display. Antes perdíamos comandas, agora tudo chega direto na tela.&rdquo;
              </p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>AC</div>
                <div>
                  <span className={styles.testimonialName}>Ana Carolina</span>
                  <span className={styles.testimonialRole}>Gerente, Pizza Express</span>
                </div>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={styles.testimonialStars}>
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <span className={styles.testimonialBadge}>Profissional</span>
              </div>
              <p className={styles.testimonialText}>
                &ldquo;Os relatórios me ajudaram a identificar quais itens vender mais. Consegui aumentar o ticket médio em 23%.&rdquo;
              </p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>RS</div>
                <div>
                  <span className={styles.testimonialName}>Roberto Silva</span>
                  <span className={styles.testimonialRole}>Dono, Espetinho & Cia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <CreditCard size={14} />
            <span>Planos</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Planos simples e transparentes
          </h2>
          <p className={styles.pricingSubtitle}>
            Comece grátis e cresça conforme seu negócio. Sem surpresas.
          </p>
          <div className={styles.pricingGrid}>
            <div className={styles.pricingCard}>
              <div className={styles.pricingCardHeader}>
                <h3 className={styles.pricingCardTitle}>Básico</h3>
                <p className={styles.pricingCardDescription}>
                  Ideal para iniciar no digital
                </p>
              </div>
              <div className={styles.pricingCardPrice}>
                <span className={styles.pricingCurrency}>R$</span>
                <span className={styles.pricingValue}>59</span>
                <span className={styles.pricingPeriod}>/mês</span>
              </div>
              <p className={styles.pricingCardNote}>Por restaurante</p>
              <ul className={styles.pricingFeatures}>
                <li><Check size={16} /> Cardápio digital completo</li>
                <li><Check size={16} /> QR Codes por mesa</li>
                <li><Check size={16} /> Pedidos em tempo real</li>
                <li><Check size={16} /> Kitchen Display</li>
                <li><Check size={16} /> Modo offline</li>
                <li><Check size={16} /> Suporte por chat</li>
              </ul>
              <a href="/register" className={styles.pricingCta}>
                Começar Grátis
              </a>
            </div>
            <div className={`${styles.pricingCard} ${styles.pricingCardHighlight}`}>
              <div className={styles.pricingBadge}>Mais Popular</div>
              <div className={styles.pricingCardHeader}>
                <h3 className={styles.pricingCardTitle}>Profissional</h3>
                <p className={styles.pricingCardDescription}>
                  Para restaurantes que querem crescer
                </p>
              </div>
              <div className={styles.pricingCardPrice}>
                <span className={styles.pricingCurrency}>R$</span>
                <span className={styles.pricingValue}>56</span>
                <span className={styles.pricingPeriod}>/mês</span>
              </div>
              <p className={styles.pricingCardNote}>Por restaurante (5+ unidades)</p>
              <ul className={styles.pricingFeatures}>
                <li><Check size={16} /> Tudo do Básico</li>
                <li><Check size={16} /> Relatórios avançados</li>
                <li><Check size={16} /> Múltiplos usuários</li>
                <li><Check size={16} /> Integração com delivery</li>
                <li><Check size={16} /> API de automação</li>
                <li><Check size={16} /> Suporte prioritário</li>
              </ul>
              <a href="/register" className={styles.pricingCta}>
                Começar Grátis
              </a>
            </div>
            <div className={styles.pricingCard}>
              <div className={styles.pricingCardHeader}>
                <h3 className={styles.pricingCardTitle}>Enterprise</h3>
                <p className={styles.pricingCardDescription}>
                  Para redes com 10+ restaurantes
                </p>
              </div>
              <div className={styles.pricingCardPrice}>
                <span className={styles.pricingCurrency}>R$</span>
                <span className={styles.pricingValue}>53</span>
                <span className={styles.pricingPeriod}>/mês</span>
              </div>
              <p className={styles.pricingCardNote}>Por restaurante (10+ unidades)</p>
              <ul className={styles.pricingFeatures}>
                <li><Check size={16} /> Tudo do Profissional</li>
                <li><Check size={16} /> Dashboard personalizado</li>
                <li><Check size={16} /> Gerente de conta</li>
                <li><Check size={16} /> SLA garantido</li>
                <li><Check size={16} /> Treinamento da equipe</li>
                <li><Check size={16} /> Implementação dedicada</li>
              </ul>
              <a href="/register" className={styles.pricingCta}>
                Falar com Vendas
              </a>
            </div>
          </div>
          <p className={styles.pricingDisclaimer}>
            <ShieldCheck size={14} />
            Cancelar a qualquer momento. Sem burocracia. Sem multas.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faq}>
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <HelpCircle size={14} />
            <span>Perguntas Frequentes</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Perguntas Frequentes
          </h2>
          <div className={styles.faqList}>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                <HelpCircle size={20} />
                <span>Preciso de internet para usar?</span>
              </h3>
              <p className={styles.faqAnswer}>
                Não! O Pedi-AI funciona completamente offline. O cliente pode navegar pelo cardápio e fazer o pedido mesmo sem internet. Quando a conexão voltar, tudo é sincronizado automaticamente.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                <HelpCircle size={20} />
                <span>Como os pedidos chegam na cozinha?</span>
              </h3>
              <p className={styles.faqAnswer}>
                Os pedidos aparecem em tempo real no Kitchen Display, uma tela que pode ser usada em tablet ou TV. Você também recebe notificações sonoras para cada novo pedido.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                <HelpCircle size={20} />
                <span>Posso personalizar o cardápio?</span>
              </h3>
              <p className={styles.faqAnswer}>
                Sim! Você pode adicionar fotos, descrições, valores, opções de personalização (como adicionais e removidos), e organizar por categorias. Tudo pelo painel admin.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                <HelpCircle size={20} />
                <span>Funciona com meu sistema de delivery?</span>
              </h3>
              <p className={styles.faqAnswer}>
                No plano Profissional e Enterprise, oferecemos integração com as principais plataformas de delivery. Também temos API para automações personalizadas.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                <HelpCircle size={20} />
                <span>Como funciona o suporte?</span>
              </h3>
              <p className={styles.faqAnswer}>
                Oferecemos suporte por chat em todos os planos. O plano Profissional tem suporte prioritário, e o Enterprise conta com gerente de conta dedicado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaBackground}>
          <div className={styles.finalCtaBlob1} />
          <div className={styles.finalCtaBlob2} />
        </div>
        <div className={styles.container}>
          <div className={styles.finalCtaContent}>
            <h2 className={styles.finalCtaTitle}>
              Pronto para nunca mais perder um pedido?
            </h2>
            <p className={styles.finalCtaText}>
              Comece grátis hoje e veja a diferença em 30 dias. Sem cartão de crédito.
            </p>
            <div className={styles.finalCtaTags}>
              <span className={styles.finalCtaTag}>
                <CreditCard size={14} />
                Sem cartão de crédito
              </span>
              <span className={styles.finalCtaTag}>
                <Zap size={14} />
                Teste grátis 14 dias
              </span>
            </div>
            <a href="/register" className={styles.ctaPrimary}>
              Criar Conta Grátis
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <div className={styles.logo}>
                <UtensilsCrossed size={24} className={styles.logoIcon} />
                <span className={styles.logoText}>Pedi-AI</span>
              </div>
              <p className={styles.footerTagline}>
                Cardápio digital para restaurantes modernos
              </p>
            </div>
            <div className={styles.footerLinks}>
              <a href="/register" className={styles.footerLink}>Começar</a>
              <a href="#features" className={styles.footerLink}>Features</a>
              <a href="#pricing" className={styles.footerLink}>Preços</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2026 Pedi-AI. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
