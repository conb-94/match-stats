/** What the hint needs to know about the browser. */
export interface BrowserInfo { userAgent: string; platform: string; maxTouchPoints: number; standalone?: boolean }

/**
 * True when the app is open in a browser tab on an iPhone or iPad. There, data saved in the tab is kept
 * apart from the Home Screen app, so coaches should add it to the Home Screen before setting up.
 */
export function needsHomeScreenHint(info: BrowserInfo, displayStandalone: boolean): boolean {
  const ios = /iPhone|iPad|iPod/.test(info.userAgent) || (info.platform === 'MacIntel' && info.maxTouchPoints > 1);
  const installed = info.standalone === true || displayStandalone;
  return ios && !installed;
}
