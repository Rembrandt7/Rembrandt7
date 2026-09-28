/**
 * Device detection utility to distinguish between desktop computers (compu)
 * and mobile cell phones (cel - Android, iPhone, Galaxy Z Fold 7, etc.)
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  
  // 1. User Agent regex for mobile devices (including Samsung Galaxy Fold models SM-F)
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|samsung|sm-f/i.test(ua);

  // 2. Touch capability
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  
  // 3. Screen width (mobile / foldable screen)
  const isMobileScreen = window.innerWidth <= 1024;

  return isMobileUA || (hasTouch && isMobileScreen);
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent || '');
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}
