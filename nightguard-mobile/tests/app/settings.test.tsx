import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import SettingsScreen from '@/app/settings';
import * as api from '@/lib/api';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

const mockUseAuth = jest.fn(() => ({
  firebaseUser: { getIdToken: jest.fn(() => Promise.resolve('tok')) },
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(),
  getVenues: jest.fn(),
  updateMeProfilePhoto: jest.fn(),
  uploadMediaFile: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg' }],
    }),
  ),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockGetMe = api.getMe as jest.MockedFunction<typeof api.getMe>;
const mockGetVenues = api.getVenues as jest.MockedFunction<typeof api.getVenues>;
const mockUpload = api.uploadMediaFile as jest.MockedFunction<typeof api.uploadMediaFile>;
const mockUpdatePhoto = api.updateMeProfilePhoto as jest.MockedFunction<typeof api.updateMeProfilePhoto>;

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.__TEST_ROUTER__!.push.mockClear();
    globalThis.__TEST_ROUTER__!.replace.mockClear();
    globalThis.__TEST_ROUTER__!.back.mockClear();
    mockUseAuth.mockReturnValue({
      firebaseUser: { getIdToken: jest.fn(() => Promise.resolve('tok')) },
      signOut: jest.fn(() => Promise.resolve()),
    });
    mockGetMe.mockResolvedValue({ firstName: 'Sam', lastName: 'Rivera', role: 'ADMIN' });
    mockGetVenues.mockResolvedValue([{ id: 'v1', name: 'Main Hall', city: 'Gainesville', state: 'FL' }]);
    mockUpload.mockResolvedValue('https://cdn.example/p.jpg');
    mockUpdatePhoto.mockResolvedValue({ profileUrl: 'https://cdn.example/p.jpg' });
  });

  it('loads profile details on mount', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalledWith('tok');
    });
    expect(await screen.findByText('Sam Rivera')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('navigates back when Back is pressed', async () => {
    render(<SettingsScreen />);
    await screen.findByText('Sam Rivera');
    fireEvent.press(screen.getByLabelText('Back'));
    expect(globalThis.__TEST_ROUTER__!.back).toHaveBeenCalled();
  });

  it('invokes camera flow when choosing Camera from the photo picker alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const camera = buttons?.find((b) => b.text === 'Camera');
      camera?.onPress?.();
    });

    render(<SettingsScreen />);
    await screen.findByText('Sam Rivera');
    fireEvent.press(screen.getByLabelText('Change profile photo'));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('invokes library flow when choosing Photo Library', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({ canceled: true, assets: [] });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://lib.jpg', mimeType: 'image/jpeg', fileName: 'b.jpg' }],
    });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const lib = buttons?.find((b) => b.text === 'Photo Library');
      lib?.onPress?.();
    });

    render(<SettingsScreen />);
    await screen.findByText('Sam Rivera');
    fireEvent.press(screen.getByLabelText('Change profile photo'));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('signs out and replaces route to auth', async () => {
    const signOut = jest.fn(() => Promise.resolve());
    mockUseAuth.mockReturnValue({
      firebaseUser: { getIdToken: jest.fn(() => Promise.resolve('tok')) },
      signOut,
    });
    mockGetMe.mockResolvedValue({ firstName: 'Sam', lastName: 'Rivera' });
    mockGetVenues.mockResolvedValue([]);

    render(<SettingsScreen />);
    await screen.findByText('Sam Rivera');
    fireEvent.press(screen.getByLabelText('Log out'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(globalThis.__TEST_ROUTER__!.replace).toHaveBeenCalledWith('/auth');
  });
});
