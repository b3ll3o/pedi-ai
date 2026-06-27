/**
 * Public API of @pedi-ai/feature-flags.
 *
 * Re-exports types, client and provider. The provider is React-only;
 * importing the full entry from a server component will fail because
 * `'use client'` in `FeatureFlagProvider.tsx` requires the bundler to
 * treat it as a client boundary. For server-safe access to the client
 * class alone, use the `./client` subpath.
 */
export * from './types';
export { FeatureFlagClient } from './FeatureFlagClient';
export {
  FeatureFlagProvider,
  useFeatureFlag,
  useFeatureFlags,
  useFeatureFlagClient,
  useFeatureFlagSnapshot,
} from './FeatureFlagProvider';
