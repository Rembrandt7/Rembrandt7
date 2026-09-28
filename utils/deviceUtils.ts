/**
 * Device detection utility to distinguish between desktop computers (compu)
 * and mobile cell phones (cel - Android, iPhone, Galaxy Z Fold, etc.)
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // 1. User Agent regex for mobile devices
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);

  // 2. Touch support & mobile screen size check (e.g. Galaxy Z Fold folded or unfolded)
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isNarrowScreen = window.innerWidth < 1024;

  return isMobileUA || (hasTouch && isNarrowScreen);
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}
