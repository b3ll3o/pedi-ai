import type { Metadata } from 'next';
import styles from "./page.module.css";
import Navbar from './components/Navbar';
import Logo from './components/Logo';
import FAQItem from './components/FAQItem';
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

const faqData = [
  {
    question: 'Preciso de internet para usar?',
    answer: 'Não! O Pedi-AI funciona completamente offline. O cliente pode navegar pelo cardápio e fazer o pedido mesmo sem internet. Quando a conexão voltar, tudo é sincronizado automaticamente.',
  },
  {
    question: 'Como os pedidos chegam na cozinha?',
    answer: 'Os pedidos aparecem em tempo real no Kitchen Display, uma tela que pode ser usada em tablet ou TV. Você também recebe notificações sonoras para cada novo pedido.',
  },
  {
    question: 'Posso personalizar o cardápio?',
    answer: 'Sim! Você pode adicionar fotos, descrições, valores, opções de personalização (como adicionais e removidos), e organizar por categorias. Tudo pelo painel admin.',
  },
  {
    question: 'Funciona com meu sistema de delivery?',
    answer: 'No plano Profissional e Enterprise, oferecemos integração com as principais plataformas de delivery. Também temos API para automações personalizadas.',
  },
  {
    question: 'Como funciona o suporte?',
    answer: 'Oferecemos suporte por chat em todos os planos. O plano Profissional tem suporte prioritário, e o Enterprise conta com gerente de conta dedicado.',
  },
];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pedi-ai.com';

export const metadata: Metadata = {
  title: 'Cardápio Digital para Restaurantes | Pedi-AI - Funciona Offline',
  description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa, Kitchen Display e muito mais. Teste grátis 14 dias.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Cardápio Digital para Restaurantes | Pedi-AI',
    description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa. Teste grátis 14 dias.',
    url: BASE_URL,
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PediAI - Cardápio Digital',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cardápio Digital para Restaurantes | Pedi-AI - Funciona Offline',
    description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa. Teste grátis 14 dias.',
    images: ['/og-image.png'],
  },
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            url: BASE_URL,
            name: 'PediAI - Cardápio Digital para Restaurantes',
            description: 'Cardápio digital que funciona offline para restaurantes. Pedidos em tempo real, QR Codes por mesa.',
            publisher: {
              '@id': `${BASE_URL}/#organization`,
            },
          },
          {
            '@type': 'Organization',
            '@id': `${BASE_URL}/#organization`,
            name: 'PediAI',
            url: BASE_URL,
            logo: {
              '@type': 'ImageObject',
              url: `${BASE_URL}/logo.png`,
            },
            sameAs: [
              'https://twitter.com/pediai',
              'https://instagram.com/pediai',
            ],
          },
          {
            '@type': 'FAQPage',
            '@id': `${BASE_URL}/#faq`,
            mainEntity: faqData.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          },
        ],
      }),
    },
  ],
};

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section aria-labelledby="hero-title" className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.heroBlob1} />
          <div className={styles.heroBlob2} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} aria-hidden="true" />
            <span>Teste grátis por 14 dias</span>
          </div>
          <h1 id="hero-title" className={styles.heroTitle}>
            Nunca mais perca um pedido
            <em className={styles.heroTitleAccent}>nem offline</em>
          </h1>
          <p className={styles.heroSubtitle}>
            Cardápio digital que funciona sem internet, com pedidos em tempo real para cozinha e gerenciamento completo do seu restaurante.
          </p>
          <div className={styles.heroTags}>
            <span className={styles.heroTag}>
              <CreditCard size={14} aria-hidden="true" />
              Sem cartão de crédito
            </span>
            <span className={styles.heroTag}>
              <WifiOff size={14} aria-hidden="true" />
              Funciona offline
            </span>
          </div>
          <div className={styles.heroCtas}>
            <a href="/register" className={styles.ctaPrimary}>
              Começar Gratuitamente
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="#how-it-works" className={styles.ctaSecondary}>
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
                <Star size={12} fill="currentColor" aria-hidden="true" /> Avaliação média
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
      <section aria-labelledby="social-proof-title" className={styles.socialProof}>
        <div className={styles.container}>
          <p id="social-proof-title" className={styles.socialProofLabel}>Mais de 500 restaurantes já aumentaram suas vendas</p>
          <div className={styles.socialProofLogos}>
            <div className={styles.socialProofLogo}>
              <UtensilsCrossed aria-hidden="true" size={24} />
              <span>Lanches do Bairro</span>
            </div>
            <div className={styles.socialProofLogo}>
              <ChefHat aria-hidden="true" size={24} />
              <span>Pizza Express</span>
            </div>
            <div className={styles.socialProofLogo}>
              <UtensilsCrossed aria-hidden="true" size={24} />
              <span>Espetinho & Cia</span>
            </div>
              <div className={styles.socialProofLogo}>
                <Utensils aria-hidden="true" size={24} />
                <span>Café Central</span>
              </div>
            <div className={styles.socialProofLogo}>
              <UtensilsCrossed aria-hidden="true" size={24} />
              <span>Bistrô Gourmet</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section aria-labelledby="how-it-works-title" className={styles.howItWorks} id="how-it-works">
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <Zap aria-hidden="true" size={14} />
            <span>Como Funciona</span>
          </div>
          <h2 id="how-it-works-title" className={styles.sectionTitle}>
            Comece em 3 passos simples
          </h2>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepIcon}>
                <QrCode aria-hidden="true" size={32} />
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
                <PackageSearch aria-hidden="true" size={32} />
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
                <BellRing aria-hidden="true" size={32} />
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
      <section aria-labelledby="problems-title" className={styles.problems}>
        <div className={styles.container}>
            <div className={styles.sectionBadge}>
              <AlertCircle aria-hidden="true" size={14} />
              <span>Problemas Comuns</span>
            </div>
          <h2 id="problems-title" className={styles.sectionTitle}>
            Você já conhece esses problemas
          </h2>
          <div className={styles.problemsGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <WifiOff aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.problemTitle}>Pedido perdido offline</h3>
              <p className={styles.problemText}>
                Quando a internet cai, seu sistema de pedidos para. Você perde vendas e precisa explicar para o cliente.
              </p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <Clock aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.problemTitle}>Atraso na cozinha</h3>
              <p className={styles.problemText}>
                Comandas impressas se perdem, pedidos demoram para chegar e clientes ficam esperando.
              </p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <BarChart3 aria-hidden="true" size={24} />
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
      <section aria-labelledby="features-title" className={styles.features} id="features">
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <Star aria-hidden="true" size={14} />
            <span>Funcionalidades</span>
          </div>
          <h2 id="features-title" className={styles.sectionTitle}>
            Tudo que você precisa para vender mais
          </h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <WifiOff aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.featureTitle}>Funciona Offline</h3>
              <p className={styles.featureText}>
                Pedidos salvos localmente e sincronizados quando a conexão voltar.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <QrCode aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.featureTitle}>QR Code por Mesa</h3>
              <p className={styles.featureText}>
                Clientes escaneiam e já veem o cardápio com identificação da mesa.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Zap aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.featureTitle}>Pedidos em Tempo Real</h3>
              <p className={styles.featureText}>
                Cozinha recebe pedidos instantaneamente. Sem demora, sem perdas.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Bell aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.featureTitle}>Notificações</h3>
              <p className={styles.featureText}>
                Alertas sonoros e visuais quando novos pedidos chegam.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Smartphone aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.featureTitle}>Mobile-First</h3>
              <p className={styles.featureText}>
                Interface otimizada para touch em qualquer celular ou tablet.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Monitor aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.featureTitle}>Kitchen Display</h3>
              <p className={styles.featureText}>
                Visualização de pedidos na cozinha por ordem de chegada.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <ShoppingCart aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.featureTitle}>Carrinho Offline</h3>
              <p className={styles.featureText}>
                Cliente monta o pedido mesmo sem internet.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <TrendingUp aria-hidden="true" size={24} />
              </div>
              <h3 className={styles.featureTitle}>Relatórios</h3>
              <p className={styles.featureText}>
                Vendas por período, itens mais vendidos, ticket médio.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <ShieldCheck aria-hidden="true" size={24} />
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
      <section aria-labelledby="testimonials-title" className={styles.testimonials}>
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <Star aria-hidden="true" size={14} />
            <span>Depoimentos</span>
          </div>
          <h2 id="testimonials-title" className={styles.sectionTitle}>
            O que nossos clientes dizem
          </h2>
          <div className={styles.testimonialsGrid}>
            <article className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={styles.testimonialStars}>
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                </div>
                <span className={styles.testimonialBadge}>Básico</span>
              </div>
              <p className={styles.testimonialText}>
                &ldquo;Finalmente um sistema que funciona quando a internet cai. Já perdi muitos pedidos antes, agora isso não acontece mais.&rdquo;
              </p>
              <footer className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>MF</div>
                <div>
                  <span className={styles.testimonialName}>Marcos Ferreira</span>
                  <span className={styles.testimonialRole}>Dono, Lanches do Bairro</span>
                </div>
              </footer>
            </article>
            <article className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={styles.testimonialStars}>
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                </div>
                <span className={`${styles.testimonialBadge} ${styles.testimonialBadgePopular}`}>Mais Popular</span>
              </div>
              <p className={styles.testimonialText}>
                &ldquo;Minha equipe adorou o Kitchen Display. Antes perdíamos comandas, agora tudo chega direto na tela.&rdquo;
              </p>
              <footer className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>AC</div>
                <div>
                  <span className={styles.testimonialName}>Ana Carolina</span>
                  <span className={styles.testimonialRole}>Gerente, Pizza Express</span>
                </div>
              </footer>
            </article>
            <article className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={styles.testimonialStars}>
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                  <Star aria-hidden="true" size={16} fill="currentColor" />
                </div>
                <span className={styles.testimonialBadge}>Profissional</span>
              </div>
              <p className={styles.testimonialText}>
                &ldquo;Os relatórios me ajudaram a identificar quais itens vender mais. Consegui aumentar o ticket médio em 23%.&rdquo;
              </p>
              <footer className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>RS</div>
                <div>
                  <span className={styles.testimonialName}>Roberto Silva</span>
                  <span className={styles.testimonialRole}>Dono, Espetinho & Cia</span>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section aria-labelledby="pricing-title" className={styles.pricing} id="pricing">
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <CreditCard aria-hidden="true" size={14} />
            <span>Planos</span>
          </div>
          <h2 id="pricing-title" className={styles.sectionTitle}>
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
                <li><Check aria-hidden="true" size={16} /> Cardápio digital completo</li>
                <li><Check aria-hidden="true" size={16} /> QR Codes por mesa</li>
                <li><Check aria-hidden="true" size={16} /> Pedidos em tempo real</li>
                <li><Check aria-hidden="true" size={16} /> Kitchen Display</li>
                <li><Check aria-hidden="true" size={16} /> Modo offline</li>
                <li><Check aria-hidden="true" size={16} /> Suporte por chat</li>
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
                <li><Check aria-hidden="true" size={16} /> Tudo do Básico</li>
                <li><Check aria-hidden="true" size={16} /> Relatórios avançados</li>
                <li><Check aria-hidden="true" size={16} /> Múltiplos usuários</li>
                <li><Check aria-hidden="true" size={16} /> Integração com delivery</li>
                <li><Check aria-hidden="true" size={16} /> API de automação</li>
                <li><Check aria-hidden="true" size={16} /> Suporte prioritário</li>
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
                <li><Check aria-hidden="true" size={16} /> Tudo do Profissional</li>
                <li><Check aria-hidden="true" size={16} /> Dashboard personalizado</li>
                <li><Check aria-hidden="true" size={16} /> Gerente de conta</li>
                <li><Check aria-hidden="true" size={16} /> SLA garantido</li>
                <li><Check aria-hidden="true" size={16} /> Treinamento da equipe</li>
                <li><Check aria-hidden="true" size={16} /> Implementação dedicada</li>
              </ul>
              <a href="/register" className={styles.pricingCta}>
                Falar com Vendas
              </a>
            </div>
          </div>
          <p className={styles.pricingDisclaimer}>
            <ShieldCheck aria-hidden="true" size={14} />
            Cancelar a qualquer momento. Sem burocracia. Sem multas.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section aria-labelledby="faq-title" className={styles.faq}>
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <HelpCircle aria-hidden="true" size={14} />
            <span>Perguntas Frequentes</span>
          </div>
          <h2 id="faq-title" className={styles.sectionTitle}>
            Perguntas Frequentes
          </h2>
          <dl className={styles.faqList}>
            {faqData.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="final-cta-title" className={styles.finalCta}>
        <div className={styles.finalCtaBackground}>
          <div className={styles.finalCtaBlob1} />
          <div className={styles.finalCtaBlob2} />
        </div>
        <div className={styles.container}>
          <div className={styles.finalCtaContent}>
            <h2 id="final-cta-title" className={styles.finalCtaTitle}>
              Pronto para nunca mais perder um pedido?
            </h2>
            <p className={styles.finalCtaText}>
              Comece grátis hoje e veja a diferença em 30 dias. Sem cartão de crédito.
            </p>
            <div className={styles.finalCtaTags}>
              <span className={styles.finalCtaTag}>
                <CreditCard aria-hidden="true" size={14} />
                Sem cartão de crédito
              </span>
              <span className={styles.finalCtaTag}>
                <Zap aria-hidden="true" size={14} />
                Teste grátis 14 dias
              </span>
            </div>
            <a href="/register" className={styles.ctaPrimary}>
              Criar Conta Grátis
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <Logo size={24} className={styles.logo} />
              <p className={styles.footerTagline}>
                Cardápio digital para restaurantes modernos
              </p>
            </div>
            <nav aria-label="Links do footer" className={styles.footerLinks}>
              <a href="/register" className={styles.footerLink}>Começar</a>
              <a href="#features" className={styles.footerLink}>Funcionalidades</a>
              <a href="#pricing" className={styles.footerLink}>Preços</a>
            </nav>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2026 Pedi-AI. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
