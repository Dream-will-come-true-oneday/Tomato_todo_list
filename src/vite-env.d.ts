/// <reference types="vite/client" />

import type { DesktopBridge } from './desktopBridge';

declare global {
  interface Window {
    desktopBridge?: DesktopBridge;
  }
}
