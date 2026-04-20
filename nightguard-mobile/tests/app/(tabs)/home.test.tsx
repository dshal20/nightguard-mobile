import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/home';
import * as api from '@/lib/api';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, []);
    },
  };
});

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    firebaseUser: { getIdToken: jest.fn(() => Promise.resolve('tok')) },
  }),
}));

jest.mock('@/lib/api', () => ({
  getVenues: jest.fn(),
  getIncidents: jest.fn(),
  getCapacity: jest.fn(),
  getHeadcounts: jest.fn(),
  getNotificationActivity: jest.fn(),
}));

const mockGetVenues = api.getVenues as jest.MockedFunction<typeof api.getVenues>;
const mockGetIncidents = api.getIncidents as jest.MockedFunction<typeof api.getIncidents>;
const mockGetCapacity = api.getCapacity as jest.MockedFunction<typeof api.getCapacity>;
const mockGetHeadcounts = api.getHeadcounts as jest.MockedFunction<typeof api.getHeadcounts>;
const mockGetNotificationActivity = api.getNotificationActivity as jest.MockedFunction<
  typeof api.getNotificationActivity
>;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockGetVenues.mockResolvedValue([{ id: 'venue-1', name: 'Main' }]);
    mockGetIncidents.mockResolvedValue([
      { id: '1', status: 'ACTIVE', createdAt: new Date().toISOString(), description: 'Test' },
    ]);
    mockGetCapacity.mockResolvedValue({ capacity: 100 });
    mockGetHeadcounts.mockResolvedValue([{ headcount: 12, createdAt: new Date().toISOString() }]);
    mockGetNotificationActivity.mockResolvedValue([
      { id: 'a1', type: 'MEDICAL', createdAt: new Date().toISOString(), fromVenueName: 'North' },
    ]);
  });

  it('loads dashboard metrics and renders stat labels', async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(mockGetVenues).toHaveBeenCalled();
    });
    expect(await screen.findByText('Tonight’s Operations')).toBeTruthy();
    expect(screen.getByText('ACTIVE INCIDENTS')).toBeTruthy();
    expect(screen.getByText('NETWORK ALERTS')).toBeTruthy();
  });

  it('opens the new report modal from the header action', async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(mockGetVenues).toHaveBeenCalled();
    });
    const newReportButtons = screen.getAllByLabelText('New report');
    fireEvent.press(newReportButtons[0]!);
    expect(await screen.findByText('Create New Incident Report')).toBeTruthy();
  });

  it(
    'refreshes dashboard data on the polling interval',
    async () => {
      jest.useRealTimers();
      render(<HomeScreen />);
      await waitFor(() => {
        expect(mockGetVenues).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 30050));
      });

      await waitFor(() => {
        expect(mockGetVenues).toHaveBeenCalledTimes(2);
      });
    },
    35000,
  );
});
