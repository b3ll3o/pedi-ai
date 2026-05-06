# Delta for SEO Testing

## ADDED Requirements

### Requirement: Landing Page Metadata Unit Tests
The system MUST have unit tests validating the landing page SEO metadata.

#### Scenario: Unit test for page title
- GIVEN the landing page renders
- WHEN the metadata is generated
- THEN the title SHALL be "Cardápio Digital para Restaurantes | Pedi-AI - Funciona Offline"
- AND the title length SHALL NOT exceed 60 characters

#### Scenario: Unit test for meta description
- GIVEN the landing page renders
- WHEN the metadata is generated
- THEN the meta description SHALL be between 120-160 characters
- AND it SHALL include USPs (offline, tempo real, QR codes)

#### Scenario: Unit test for Open Graph tags
- GIVEN the landing page renders
- WHEN the metadata is generated
- THEN og:title, og:description, og:image, og:url, og:type SHALL be present

#### Scenario: Unit test for Twitter Card tags
- GIVEN the landing page renders
- WHEN the metadata is generated
- THEN twitter:card, twitter:title, twitter:description, twitter:image SHALL be present

#### Scenario: Unit test for JSON-LD structured data
- GIVEN the landing page renders
- WHEN the metadata is generated
- THEN JSON-LD schema for Organization, WebSite, and FAQPage SHALL be present
- AND the schema SHALL be valid JSON

#### Scenario: Unit test for canonical URL
- GIVEN the landing page renders
- WHEN the metadata is generated
- THEN the canonical URL SHALL point to the main domain

### Requirement: E2E test for SEO implementation
The system MUST have E2E tests validating SEO implementation.

#### Scenario: E2E - Verify all SEO tags are rendered
- GIVEN a user accesses the landing page
- WHEN the page loads
- THEN all required meta tags SHALL be present in the HTML head
- AND the page SHALL be crawlable by search engines

#### Scenario: E2E - Verify structured data is valid
- GIVEN a user accesses the landing page
- WHEN the page loads
- THEN the JSON-LD scripts SHALL be valid and parseable
- AND they SHALL contain the required schema types
