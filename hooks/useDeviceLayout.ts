import { useState, useEffect } from 'react';

export type FoldMode = 'desktop' | 'fold-cover' | 'fold-unfolded';

export interface DeviceLayoutInfo {
  isMobile: boolean;           // true if width < 1024 or touch device on mobile size
  isDesktop: boolean;          // true if width >= 1024
  isFoldCover: boolean;        // true if narrow screen (< 580px) like Fold 7 cover screen
  isFoldUnfolded: boolean;     // true if square-ish foldable inner screen (580px - 1024px)
  foldMode: FoldMode;
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
}

export function useDeviceLayout(): DeviceLayoutInfo {
  const getLayout = (): DeviceLayoutInfo => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isDesktop: true,
        isFoldCover: false,
        isFoldUnfolded: false,
        foldMode: 'desktop',
        screenWidth: 1200,
        screenHeight: 800,
        aspectRatio: 1.5,
        orientation: 'landscape'
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / (height || 1);
    const orientation = width >= height ? 'landscape' : 'portrait';

    const isDesktop = width >= 1024;
    const isMobile = !isDesktop;

    // Detection for Galaxy Fold:
    // When folded: Cover screen width is narrow (< 580px, typically 380px - 440px)
    // When unfolded: Inner screen width is 580px - 1023px, and aspect ratio is square-ish (0.7 to 1.35)
    let isFoldCover = false;
    let isFoldUnfolded = false;
    let foldMode: FoldMode = 'desktop';

    if (isDesktop) {
      foldMode = 'desktop';
    } else if (width < 580) {
      isFoldCover = true;
      foldMode = 'fold-cover';
    } else {
      isFoldUnfolded = true;
      foldMode = 'fold-unfolded';
    }

    return {
      isMobile,
      isDesktop,
      isFoldCover,
      isFoldUnfolded,
      foldMode,
      screenWidth: width,
      screenHeight: height,
      aspectRatio,
      orientation
    };
  };

  const [layout, setLayout] = useState<DeviceLayoutInfo>(getLayout);

  useEffect(() => {
    let timeoutId: any = null;

    const handleResize = () => {
      // Small debounce to smoothly handle fold/unfold animation
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setLayout(getLayout());
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return layout;
}
