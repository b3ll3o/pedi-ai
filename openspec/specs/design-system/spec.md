# Spec for Design System

## ADDED Requirements

### Requirement: Official Color Palette CSS Custom Properties
The system MUST define all color tokens as CSS Custom Properties in `src/app/globals.css` using the warm/food-inspired palette.

#### Scenario: Load Light Theme Colors
- GIVEN the user has opened the application in light mode
- WHEN the browser parses `globals.css`
- THEN the system MUST expose the following CSS Custom Properties:
  - `--color-primary` with value `#E85D04`
  - `--color-primary-light` with value `#F48C06`
  - `--color-primary-dark` with value `#D64804`
  - `--color-accent` with value `#DC2626`
  - `--color-secondary` with value `#588157`
  - `--color-success` with value `#16A34A`
  - `--color-background` with value `#FFFBF5`
  - `--color-surface` with value `#FFFFFF`
  - `--color-surface-elevated` with value `#FFF8F0`
  - `--color-text-primary` with value `#1C1917`
  - `--color-text-secondary` with value `#57534E`
  - `--color-error` with value `#DC2626`
  - `--color-warning` with value `#F59E0B`
  - `--color-info` with value `#0284C7`
  - `--color-border` with value `#E7E5E4`
  - `--color-focus-ring` with value `rgba(232, 93, 4, 0.4)`
  - `--gradient-primary` with value `linear-gradient(135deg, #E85D04 0%, #F48C06 100%)`

#### Scenario: Load Dark Theme Colors
- GIVEN the user has opened the application in dark mode
- WHEN the browser parses `globals.css`
- THEN the system MUST override CSS Custom Properties with dark theme values:
  - `--color-background` MUST be a warm dark tone
  - `--color-surface` MUST be a dark surface color
  - `--color-surface-elevated` MUST be slightly lighter than surface
  - `--color-text-primary` MUST be a warm off-white
  - `--color-text-secondary` MUST be a warm gray
  - `--color-border` MUST be a dark warm border color

#### Scenario: Primary Color Accessibility
- GIVEN the primary color `--color-primary` is `#E85D04`
- WHEN text uses `--color-primary` as background
- THEN the contrast ratio MUST meet WCAG AA (4.5:1) for normal text
- AND the contrast ratio MUST meet WCAG AAA (7:1) for large text

### Requirement: No Hardcoded Color Values
The system MUST NOT contain hardcoded hex color values in any `.module.css` files after migration.

#### Scenario: Verify No Hardcoded Colors in CSS Files
- GIVEN a developer runs a grep search for hex color patterns in `src/**/*.module.css`
- WHEN the search uses pattern `#[0-9A-Fa-f]{3,6}`
- THEN the search MUST return zero matches for hardcoded colors
- AND all color usage MUST reference CSS Custom Properties via `var(--color-*)`

#### Scenario: CSS Module File Uses Variables
- GIVEN a CSS Module file exists in the project
- WHEN styling any element that requires color
- THEN the file MUST use `var(--color-primary)`, `var(--color-secondary)`, `var(--color-surface)`, `var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-border)`, `var(--color-error)`, `var(--color-warning)`, `var(--color-success)`, or `var(--color-info)` instead of hex values

### Requirement: Focus Ring Accessibility
The system MUST provide visible focus indicators using the `--color-focus-ring` token.

#### Scenario: Focus Ring on Interactive Elements
- GIVEN the user navigates to an interactive element via keyboard
- WHEN the element receives focus
- THEN the element MUST display a focus ring using `--color-focus-ring`
- AND the focus ring MUST be clearly visible against both light and dark backgrounds

### Requirement: Gradient Token for Primary Actions
The system MUST provide a `--gradient-primary` token for use on primary CTA elements.

#### Scenario: Gradient Applied to Primary Buttons
- GIVEN a primary button component exists
- WHEN the button is rendered
- THEN the button MAY use `--gradient-primary` as its background
- AND the gradient MUST display from `--color-primary` to `--color-primary-light`

### Requirement: Semantic Color Usage
The system MUST use semantic color tokens for their intended purposes.

#### Scenario: Error States Use Error Token
- GIVEN a form validation error occurs
- WHEN the error message is displayed
- THEN the text color MUST use `--color-error`
- AND the border color (if applicable) MUST use `--color-error`

#### Scenario: Success States Use Success Token
- GIVEN a successful operation completes
- WHEN the success message is displayed
- THEN the text color MUST use `--color-success`
- AND any associated icon MUST use `--color-success`

#### Scenario: Warning States Use Warning Token
- GIVEN a warning condition exists
- WHEN the warning message is displayed
- THEN the text color MUST use `--color-warning`

#### Scenario: Info States Use Info Token
- GIVEN an informational message is displayed
- WHEN the info message is displayed
- THEN the text color MUST use `--color-info`

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.