import { router, type Href } from 'expo-router';

/** Close a screen without leaving deep links or widget launches at a dead end. */
export function goBackOr(fallback: Href) {
  if (typeof router.canGoBack === 'function' && router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
