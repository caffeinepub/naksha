import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.suryansh.naksha',
  appName: 'Naksha',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1db954',
      sound: 'beep.wav',
    },
    Filesystem: {},
    Preferences: {},
  },
};

export default config;
