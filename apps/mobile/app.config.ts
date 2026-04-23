import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'GovTrack',
  slug: 'govtrack-mobile',
  scheme: 'govtrack',
  plugins: ['expo-router'],
  ios: {
    bundleIdentifier: 'com.anonymous.govtrackmobile',
  },
  android: {
    package: 'com.anonymous.govtrackmobile',
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
};

export default config;
