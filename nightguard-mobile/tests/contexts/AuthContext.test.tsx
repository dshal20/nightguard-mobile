import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';

jest.mock('@/lib/firebase', () => ({
  auth: {},
}));

const mockOnAuthStateChanged = jest.fn();
const mockFirebaseSignOut = jest.fn(() => Promise.resolve());

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => mockOnAuthStateChanged(_auth, cb),
  signOut: () => mockFirebaseSignOut(),
}));

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(),
  updateMe: jest.fn(),
}));

const mockGetMe = api.getMe as jest.MockedFunction<typeof api.getMe>;

function Harness() {
  const auth = useAuth();
  return (
    <View>
      <Text testID="phase">{auth.phase}</Text>
      <Text testID="hasUser">{auth.firebaseUser ? 'yes' : 'no'}</Text>
      <Text testID="profile">{auth.profile ? `${auth.profile.firstName}|${auth.profile.lastName}` : 'null'}</Text>
      <Text testID="profileError">{auth.profileError ?? ''}</Text>
      <Pressable testID="retry" onPress={() => void auth.retryGetMe()}>
        <Text>retry</Text>
      </Pressable>
      <Pressable testID="signout" onPress={() => void auth.signOut()}>
        <Text>signout</Text>
      </Pressable>
    </View>
  );
}

function mockUser() {
  return {
    getIdToken: jest.fn(() => Promise.resolve('test-token')),
  };
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null);
      return jest.fn();
    });
    mockGetMe.mockReset();
  });

  it('starts unauthenticated with no user after auth listener fires with null', async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('phase').props.children).toBe('unauthenticated');
    });
    expect(screen.getByTestId('hasUser').props.children).toBe('no');
    expect(screen.getByTestId('profile').props.children).toBe('null');
  });

  it('loads profile and reaches ready when getMe succeeds with full name', async () => {
    const user = mockUser();
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(user);
      return jest.fn();
    });
    mockGetMe.mockResolvedValue({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@test.com' });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('phase').props.children).toBe('ready');
    });
    expect(mockGetMe).toHaveBeenCalledWith('test-token');
    expect(screen.getByTestId('hasUser').props.children).toBe('yes');
    expect(screen.getByTestId('profile').props.children).toBe('Ada|Lovelace');
  });

  it('enters profile_error when getMe fails while signed in', async () => {
    const user = mockUser();
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(user);
      return jest.fn();
    });
    mockGetMe.mockRejectedValue(new Error('GET /users/me 401 Unauthorized'));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('phase').props.children).toBe('profile_error');
    });
    expect(screen.getByTestId('profileError').props.children).toContain('401');
  });

  it('retryGetMe refetches profile after an error', async () => {
    const user = mockUser();
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(user);
      return jest.fn();
    });
    mockGetMe.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({
      firstName: 'Grace',
      lastName: 'Hopper',
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('phase').props.children).toBe('profile_error');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('retry'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('phase').props.children).toBe('ready');
    });
    expect(mockGetMe).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('profile').props.children).toBe('Grace|Hopper');
  });

  it('signOut clears profile and returns to unauthenticated', async () => {
    const user = mockUser();
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(user);
      return jest.fn();
    });
    mockGetMe.mockResolvedValue({ firstName: 'Ada', lastName: 'Lovelace' });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('phase').props.children).toBe('ready');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('signout'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('phase').props.children).toBe('unauthenticated');
    });
    expect(mockFirebaseSignOut).toHaveBeenCalled();
    expect(screen.getByTestId('hasUser').props.children).toBe('no');
    expect(screen.getByTestId('profile').props.children).toBe('null');
  });
});
