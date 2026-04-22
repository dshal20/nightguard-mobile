import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { NewReportModal } from '@/components/new-report/NewReportModal';
import * as api from '@/lib/api';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    firebaseUser: { getIdToken: jest.fn(() => Promise.resolve('tok')) },
  }),
}));

jest.mock('@/lib/api', () => ({
  createIncident: jest.fn(() => Promise.resolve({ id: 'inc-1' })),
  getOffenders: jest.fn(() =>
    Promise.resolve([{ id: 'o1', firstName: 'Riley', lastName: 'Smith', physicalMarkers: '', currentStatus: '' }]),
  ),
  getVenues: jest.fn(() => Promise.resolve([{ id: 'venue-1', name: 'Hall' }])),
  uploadMediaFile: jest.fn(() => Promise.resolve('https://cdn.example/file.jpg')),
}));

jest.mock('@/components/new-report/AddOffenderSheet', () => ({
  AddOffenderSheet: () => null,
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file://x.jpg',
          mimeType: 'image/jpeg',
          fileName: 'x.jpg',
          type: 'image',
        },
      ],
    }),
  ),
  MediaTypeOptions: { All: 'All' },
}));

const mockCreateIncident = api.createIncident as jest.MockedFunction<typeof api.createIncident>;

describe('NewReportModal', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('updates description, severity, and incident type', async () => {
    render(<NewReportModal visible onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('Describe what happened…'), 'Patron shoved staff.');

    fireEvent.press(screen.getByText('HIGH'));
    fireEvent.press(screen.getByText('Select type...'));
    fireEvent.press(screen.getByText('Theft'));

    expect(screen.getByDisplayValue('Patron shoved staff.')).toBeTruthy();
    expect(screen.getAllByText('Theft').length).toBeGreaterThan(0);
  });

  it('adds a keyword via the Add button and removes it', async () => {
    render(<NewReportModal visible onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('Add keyword (e.g. harassment, intoxicated)'), 'blue jacket');
    fireEvent.press(screen.getByLabelText('Add keyword'));
    expect(await screen.findByText('blue jacket')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Remove keyword blue jacket'));
    expect(screen.queryByText('blue jacket')).toBeNull();
  });

  it('adds a keyword when pressing done on the keyword field', async () => {
    render(<NewReportModal visible onClose={jest.fn()} />);
    const input = screen.getByPlaceholderText('Add keyword (e.g. harassment, intoxicated)');
    fireEvent.changeText(input, 'vip');
    fireEvent(input, 'submitEditing');
    expect(await screen.findByText('vip')).toBeTruthy();
  });

  it('opens the offender picker when Attach Offender is pressed', async () => {
    render(<NewReportModal visible onClose={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Attach offender'));
    expect(await screen.findByPlaceholderText('Search offenders')).toBeTruthy();
  });

  it('attaches media from the library when Add Photo/Video is used', async () => {
    render(<NewReportModal visible onClose={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Add photo or video'));
    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeTruthy();
    });
  });

  it('submits a report with collected fields', async () => {
    render(<NewReportModal visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('Select type...'));
    fireEvent.press(screen.getByText('Threat'));
    fireEvent.press(screen.getByText('MEDIUM'));
    fireEvent.changeText(screen.getByPlaceholderText('Describe what happened…'), 'Verbal threat at door.');

    fireEvent.changeText(screen.getByPlaceholderText('Add keyword (e.g. harassment, intoxicated)'), 'door');
    fireEvent.press(screen.getByLabelText('Add keyword'));

    fireEvent.press(screen.getByLabelText('Attach offender'));
    await screen.findByText('Riley Smith');
    await act(async () => {
      fireEvent.press(screen.getByText('Riley Smith'));
    });
    const attachActions = screen.getAllByText('Attach');
    fireEvent.press(attachActions[attachActions.length - 1]!);

    fireEvent.press(screen.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(mockCreateIncident).toHaveBeenCalledWith(
        'tok',
        expect.objectContaining({
          venueId: 'venue-1',
          type: 'THREAT',
          severity: 'MEDIUM',
          description: 'Verbal threat at door.',
          keywords: ['door'],
          offenderIds: ['o1'],
        }),
      );
    });
  });
});
