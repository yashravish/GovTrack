/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 180000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk',
      build:
        'npx expo prebuild --platform android --no-install && cd android && gradlew.bat assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/mobile.app',
      build:
        'npx expo prebuild --platform ios --no-install && cd ios && xcodebuild -workspace mobile.xcworkspace -scheme mobile -configuration Debug -sdk iphonesimulator -derivedDataPath build',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_34' },
    },
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
      artifacts: {
        rootDir: 'artifacts',
        plugins: {
          log: { enabled: true },
          screenshot: { enabled: true },
          video: { enabled: true },
        },
      },
    },
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
      artifacts: {
        rootDir: 'artifacts',
        plugins: {
          log: { enabled: true },
          screenshot: { enabled: true },
          video: { enabled: true },
        },
      },
    },
  },
};
