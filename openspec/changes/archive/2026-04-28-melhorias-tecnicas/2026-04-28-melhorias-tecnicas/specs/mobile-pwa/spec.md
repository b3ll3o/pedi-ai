# Delta for Mobile PWA

## ADDED Requirements

### Requirement: Viewport Fit for iOS Notch Support
The system SHALL properly support iOS notch devices by setting viewport-fit=cover.

#### Scenario: Viewport Meta Tag Includes viewport-fit
- GIVEN the application is loaded on an iOS device with notch
- WHEN the page renders
- THEN the viewport meta tag SHALL include `viewport-fit=cover`
- AND the page SHALL extend into the notch area

#### Scenario: Safe Area CSS Custom Properties Available
- GIVEN the application uses CSS for layout
- WHEN the CSS is loaded
- THEN the following custom properties SHALL be defined:
  - `--safe-area-top`
  - `--safe-area-right`
  - `--safe-area-bottom`
  - `--safe-area-left`
- AND the values SHALL use `env(safe-area-inset-*)`

#### Scenario: Safe Area Padding Applied to Layout Components
- GIVEN the application has a header/navigation component
- WHEN the component renders
- THEN it SHALL use `padding-top: max(var(--safe-area-top), 1rem)` or similar
- AND the safe area SHALL be respected on iOS notch devices

### Requirement: PWA Install Prompt Handling
The system SHALL provide a way to install the PWA via beforeinstallprompt event.

#### Scenario: BeforeInstallPromptEvent is Captured
- GIVEN the browser supports PWA installation
- WHEN the `beforeinstallprompt` event is fired
- THEN the application SHALL capture and store the event
- AND make it available for later triggering of the install prompt

#### Scenario: Install Prompt Can Be Triggered
- GIVEN a `beforeinstallprompt` event has been captured
- WHEN the user interacts with an install button
- THEN the application SHALL call `event.prompt()`
- AND the browser SHALL show the native install dialog
