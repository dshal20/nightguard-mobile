jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

const testRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

(globalThis as unknown as { __TEST_ROUTER__: typeof testRouter }).__TEST_ROUTER__ = testRouter;

jest.mock('expo-router', () => ({
  useRouter: () => (globalThis as unknown as { __TEST_ROUTER__: typeof testRouter }).__TEST_ROUTER__,
  usePathname: jest.fn(() => '/home'),
  Link: 'Link',
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, bottom: 12, left: 0, right: 0 }),
  };
});
