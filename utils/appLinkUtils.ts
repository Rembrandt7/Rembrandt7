import { isMobileDevice, isAndroid } from './deviceUtils';

export interface SmartLinkTarget {
  href: string;
  target: string;
  isAppScheme: boolean;
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
      isAppScheme: false
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
      href: 'whatsapp://',
      target: '_self',
      isAppScheme: true
    };
  }

  // 2. Facebook -> opens native Facebook app
  if (
    urlLower.includes('facebook.com') ||
    urlLower.includes('fb.com') ||
    nameLower.includes('facebook')
  ) {
    if (android) {
      return {
        href: 'intent://facebook.com/#Intent;package=com.facebook.katana;scheme=https;S.browser_fallback_url=https%3A%2F%2Fwww.facebook.com;end',
        target: '_self',
        isAppScheme: true
      };
    }
    return {
      href: 'fb://feed',
      target: '_self',
      isAppScheme: true
    };
  }

  // 3. Mercado Libre -> opens native Mercado Libre app
  if (
    urlLower.includes('mercadolibre') ||
    nameLower.includes('mercado libre') ||
    nameLower.includes('mercadolibre')
  ) {
    if (android) {
      return {
        href: 'intent://#Intent;package=com.mercadolibre;scheme=meli;S.browser_fallback_url=https%3A%2F%2Fwww.mercadolibre.com.mx;end',
        target: '_self',
        isAppScheme: true
      };
    }
    return {
      href: 'meli://home',
      target: '_self',
      isAppScheme: true
    };
  }

  // 4. YouTube -> opens native YouTube app
  if (
    urlLower.includes('youtube.com') ||
    urlLower.includes('youtu.be') ||
    nameLower.includes('youtube')
  ) {
    if (android) {
      return {
        href: 'intent://www.youtube.com/#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=https%3A%2F%2Fwww.youtube.com;end',
        target: '_self',
        isAppScheme: true
      };
    }
    return {
      href: 'vnd.youtube://',
      target: '_self',
      isAppScheme: true
    };
  }

  // 5. Pinterest -> opens native Pinterest app
  if (
    urlLower.includes('pinterest') ||
    nameLower.includes('pinterest')
  ) {
    if (urlLower.includes('rembrandtro/pines-creados')) {
      if (android) {
        return {
          href: 'intent://www.pinterest.com/Rembrandtro/pines-creados/#Intent;package=com.pinterest;scheme=https;S.browser_fallback_url=https%3A%2F%2Fwww.pinterest.com.mx%2FRembrandtro%2Fpines-creados%2F;end',
          target: '_self',
          isAppScheme: true
        };
      }
      return {
        href: 'pinterest://user/Rembrandtro',
        target: '_self',
        isAppScheme: true
      };
    }
    if (android) {
      return {
        href: 'intent://#Intent;package=com.pinterest;scheme=pinterest;S.browser_fallback_url=https%3A%2F%2Fwww.pinterest.com;end',
        target: '_self',
        isAppScheme: true
      };
    }
    return {
      href: 'pinterest://',
      target: '_self',
      isAppScheme: true
    };
  }

  // 6. X (Twitter) -> opens native X app
  if (
    urlLower.includes('x.com') ||
    urlLower.includes('twitter.com') ||
    nameLower === 'x' ||
    nameLower.includes('twitter')
  ) {
    if (android) {
      return {
        href: 'intent://#Intent;package=com.twitter.android;scheme=twitter;S.browser_fallback_url=https%3A%2F%2Fx.com;end',
        target: '_self',
        isAppScheme: true
      };
    }
    return {
      href: 'twitter://timeline',
      target: '_self',
      isAppScheme: true
    };
  }

  // 7. Instagram -> opens native Instagram app
  if (
    urlLower.includes('instagram.com') ||
    nameLower.includes('instagram')
  ) {
    if (android) {
      return {
        href: 'intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=https%3A%2F%2Fwww.instagram.com;end',
        target: '_self',
        isAppScheme: true
      };
    }
    return {
      href: 'instagram://app',
      target: '_self',
      isAppScheme: true
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
        isAppScheme: true
      };
    }
    return {
      href: 'https://clubjaver.com/',
      target: '_blank',
      isAppScheme: false
    };
  }

  // Fallback for other standard links
  return {
    href: originalHref,
    target: '_blank',
    isAppScheme: false
  };
}
