import { isMobileDevice, isAndroid } from './deviceUtils';

export interface SmartLinkTarget {
  href: string;
  target: string;
  isAppScheme: boolean;
  fallbackUrl: string;
}

/**
 * Returns the native mobile app URI scheme or Android intent for known services
 * (WhatsApp, Facebook, Mercado Libre, YouTube, Pinterest, X, Instagram, Flow)
 * when on mobile/cell.
 * On desktop computers (compu), always returns the standard web URL opening in a new tab.
 */
export function getSmartLinkTarget(
  originalHref: string,
  name?: string,
  forceMobile?: boolean
): SmartLinkTarget {
  const isMobile = forceMobile !== undefined ? forceMobile : isMobileDevice();

  // On desktop computer (compu), keep original web link in new tab
  if (!isMobile) {
    return {
      href: originalHref,
      target: '_blank',
      isAppScheme: false,
      fallbackUrl: originalHref
    };
  }

  const urlLower = (originalHref || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  const android = isAndroid();

  // 1. WhatsApp -> opens native WhatsApp app
  if (
    urlLower.includes('whatsapp.com') ||
    urlLower.includes('wa.me') ||
    nameLower.includes('whatsapp')
  ) {
    return {
      href: 'whatsapp://send',
      target: '_self',
      isAppScheme: true,
      fallbackUrl: 'https://web.whatsapp.com/'
    };
  }

  // 2. Mercado Libre -> opens native Mercado Libre app
  if (
    urlLower.includes('mercadolibre') ||
    nameLower.includes('mercado libre') ||
    nameLower.includes('mercadolibre')
  ) {
    return {
      href: 'meli://home',
      target: '_self',
      isAppScheme: true,
      fallbackUrl: 'https://www.mercadolibre.com.mx/'
    };
  }

  // 3. Facebook -> opens native Facebook app
  if (
    urlLower.includes('facebook.com') ||
    urlLower.includes('fb.com') ||
    nameLower.includes('facebook')
  ) {
    return {
      href: 'fb://feed',
      target: '_self',
      isAppScheme: true,
      fallbackUrl: 'https://www.facebook.com/'
    };
  }

  // 4. YouTube -> opens native YouTube app
  if (
    urlLower.includes('youtube.com') ||
    urlLower.includes('youtu.be') ||
    nameLower.includes('youtube')
  ) {
    return {
      href: 'vnd.youtube://',
      target: '_self',
      isAppScheme: true,
      fallbackUrl: 'https://www.youtube.com/'
    };
  }

  // 5. Pinterest -> opens native Pinterest app
  if (
    urlLower.includes('pinterest') ||
    nameLower.includes('pinterest')
  ) {
    return {
      href: 'pinterest://user/Rembrandtro',
      target: '_self',
      isAppScheme: true,
      fallbackUrl: 'https://www.pinterest.com.mx/Rembrandtro/pines-creados/'
    };
  }

  // 6. X (Twitter) -> opens native X app
  if (
    urlLower.includes('x.com') ||
    urlLower.includes('twitter.com') ||
    nameLower === 'x' ||
    nameLower.includes('twitter')
  ) {
    return {
      href: 'twitter://timeline',
      target: '_self',
      isAppScheme: true,
      fallbackUrl: 'https://x.com/'
    };
  }

  // 7. Instagram -> opens native Instagram app
  if (
    urlLower.includes('instagram.com') ||
    nameLower.includes('instagram')
  ) {
    return {
      href: 'instagram://app',
      target: '_self',
      isAppScheme: true,
      fallbackUrl: 'https://www.instagram.com/'
    };
  }

  // 8. Flow (Club Javer) -> opens native Flow app / registered app handler
  if (
    urlLower.includes('clubjaver.com') ||
    nameLower === 'flow' ||
    nameLower.includes('clubjaver')
  ) {
    if (android) {
      return {
        href: 'intent://clubjaver.com/#Intent;scheme=https;S.browser_fallback_url=https%3A%2F%2Fclubjaver.com;end',
        target: '_self',
        isAppScheme: true,
        fallbackUrl: 'https://clubjaver.com/'
      };
    }
    return {
      href: 'https://clubjaver.com/',
      target: '_blank',
      isAppScheme: false,
      fallbackUrl: 'https://clubjaver.com/'
    };
  }

  // Fallback for other standard links
  return {
    href: originalHref,
    target: '_blank',
    isAppScheme: false,
    fallbackUrl: originalHref
  };
}

/**
 * Triggers native app opening on mobile with automatic web fallback
 * if the native app is not installed.
 */
export function openSmartMobileApp(appUri: string, fallbackUrl: string): void {
  const start = Date.now();
  window.location.href = appUri;

  // Fallback check: if app is not installed, the page will stay active
  setTimeout(() => {
    if (document.hasFocus() && Date.now() - start < 2000) {
      window.open(fallbackUrl, '_blank');
    }
  }, 1200);
}
