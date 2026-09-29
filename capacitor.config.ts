import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.souq.store',
  appName: 'سوق',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
