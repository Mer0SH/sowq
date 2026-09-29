export function setSystemBarsDark(dark: boolean) {
  const bridge = window as Window & { SouqSystemBars?: { setDark: (value: boolean) => void } };
  bridge.SouqSystemBars?.setDark(dark);
}
