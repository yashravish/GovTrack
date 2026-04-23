jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'uuid-test-123',
}));

jest.mock('victory-native', () => ({
  CartesianChart: ({ children }) =>
    typeof children === 'function' ? children({ points: { y: [] }, chartBounds: {} }) : null,
  Bar: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children, ...props }) => React.createElement(View, props, children),
    Swipeable: ({ children, renderRightActions }) =>
      React.createElement(
        View,
        null,
        children,
        renderRightActions ? React.createElement(View, null, renderRightActions()) : null,
      ),
  };
});
