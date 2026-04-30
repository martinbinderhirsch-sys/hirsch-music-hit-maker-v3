import type { HirschAPI } from '../../preload/preload';

declare global {
  interface Window {
    hirsch: HirschAPI;
  }
}

export {};
