import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import IdScannerScreen from '@/app/id-scanner';
import * as api from '@/lib/api';
import { useCameraPermissions } from 'expo-camera';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    firebaseUser: { getIdToken: jest.fn(() => Promise.resolve('tok')) },
  }),
}));

jest.mock('@/lib/api', () => ({
  getVenues: jest.fn(),
  createPatronLog: jest.fn(),
}));

jest.mock('aamva-parser', () => ({
  parse: jest.fn(() => ({
    firstName: 'Jane',
    lastName: 'Doe',
    middleName: 'Q',
    driversLicenseId: 'DL-1',
    dateOfBirth: new Date('1990-01-02'),
    expirationDate: new Date('2030-01-02'),
    state: 'FL',
    streetAddress: '1 Main',
    city: 'Miami',
    postalCode: '33101',
    gender: 'F',
    eyeColor: 'BRN',
  })),
  isExpired: jest.fn(() => false),
  isUnder21: jest.fn(() => false),
  getAge: jest.fn(() => 35),
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  function CameraView(props: { onBarcodeScanned?: (e: { data: string }) => void }) {
    (globalThis as unknown as { __ngBarcode?: typeof props.onBarcodeScanned }).__ngBarcode =
      props.onBarcodeScanned;
    return React.createElement(View, { testID: 'camera-mock' });
  }
  CameraView.isModernBarcodeScannerAvailable = false;
  CameraView.launchScanner = jest.fn();
  CameraView.dismissScanner = jest.fn();
  CameraView.onModernBarcodeScanned = jest.fn(() => ({ remove: jest.fn() }));
  const useCameraPermissions = jest.fn(() => [{ granted: true, canAskAgain: true }, jest.fn()]);
  return {
    CameraView,
    useCameraPermissions,
  };
});

const mockGetVenues = api.getVenues as jest.MockedFunction<typeof api.getVenues>;
const mockCreatePatronLog = api.createPatronLog as jest.MockedFunction<typeof api.createPatronLog>;

describe('IdScannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true, canAskAgain: true }, jest.fn()]);
    mockGetVenues.mockResolvedValue([{ id: 'venue-1', name: 'Club' }]);
    mockCreatePatronLog.mockResolvedValue({});
  });

  it('requests camera permission on mount when access is not granted', () => {
    const requestPermission = jest.fn();
    (useCameraPermissions as jest.Mock).mockReturnValueOnce([
      { granted: false, canAskAgain: true },
      requestPermission,
    ]);

    render(<IdScannerScreen />);
    expect(screen.getByText('Camera Access Needed')).toBeTruthy();
    fireEvent.press(screen.getByText('Grant Permission'));
    expect(requestPermission).toHaveBeenCalled();
  });

  it('shows parsed license data after a successful barcode scan', async () => {
    render(<IdScannerScreen />);
    fireEvent.press(screen.getByText('Start Scanning'));

    const handler = (globalThis as unknown as { __ngBarcode?: (e: { data: string }) => void }).__ngBarcode;
    expect(handler).toEqual(expect.any(Function));
    await act(async () => {
      handler!({ data: 'RAW_PDF417' });
    });

    await waitFor(() => {
      expect(screen.getByText('Scanned License')).toBeTruthy();
    });
    expect(screen.getByText('Jane Q Doe')).toBeTruthy();
  });

  it('submits ADMITTED decision via API', async () => {
    render(<IdScannerScreen />);
    fireEvent.press(screen.getByText('Start Scanning'));
    const handler = (globalThis as unknown as { __ngBarcode?: (e: { data: string }) => void }).__ngBarcode!;
    await act(async () => {
      handler({ data: 'RAW_PDF417' });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Admit patron')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Admit patron'));

    await waitFor(() => {
      expect(mockCreatePatronLog).toHaveBeenCalledWith(
        'tok',
        'venue-1',
        expect.objectContaining({ decision: 'ADMITTED', firstName: 'Jane', lastName: 'Doe' }),
      );
    });
  });

  it('submits DENIED decision via API', async () => {
    render(<IdScannerScreen />);
    fireEvent.press(screen.getByText('Start Scanning'));
    await act(async () => {
      (globalThis as unknown as { __ngBarcode: (e: { data: string }) => void }).__ngBarcode({ data: 'RAW' });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Deny patron')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Deny patron'));

    await waitFor(() => {
      expect(mockCreatePatronLog).toHaveBeenCalledWith(
        'tok',
        'venue-1',
        expect.objectContaining({ decision: 'DENIED' }),
      );
    });
  });

  it('resets scanner state from Scan Again', async () => {
    render(<IdScannerScreen />);
    fireEvent.press(screen.getByText('Start Scanning'));
    await act(async () => {
      (globalThis as unknown as { __ngBarcode: (e: { data: string }) => void }).__ngBarcode({ data: 'RAW' });
    });

    await waitFor(() => {
      expect(screen.getByText('Scan Again')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Scan Again'));

    await waitFor(() => {
      expect(screen.getByText('Ready to Scan')).toBeTruthy();
    });
  });
});
