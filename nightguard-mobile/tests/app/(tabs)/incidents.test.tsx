import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FlatList } from 'react-native';

import IncidentsScreen from '@/app/(tabs)/incidents';
import * as api from '@/lib/api';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        cb();
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
}));

const mockGetVenues = api.getVenues as jest.MockedFunction<typeof api.getVenues>;
const mockGetIncidents = api.getIncidents as jest.MockedFunction<typeof api.getIncidents>;

describe('IncidentsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVenues.mockResolvedValue([{ id: 'v1', name: 'Downtown' }]);
    mockGetIncidents.mockResolvedValue([
      {
        id: 'inc-1',
        type: 'THEFT',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Missing bag',
        createdAt: '2026-04-20T18:00:00.000Z',
      },
    ]);
  });

  it('fetches incidents and renders list content', async () => {
    render(<IncidentsScreen />);
    await waitFor(() => {
      expect(mockGetIncidents).toHaveBeenCalledWith('v1', 'tok');
    });
    expect(await screen.findByText('Theft')).toBeTruthy();
    expect(screen.getByText('Missing bag')).toBeTruthy();
  });

  it('pull-to-refresh reloads incidents', async () => {
    const { UNSAFE_getByType } = render(<IncidentsScreen />);
    await waitFor(() => {
      expect(mockGetIncidents).toHaveBeenCalled();
    });
    const callsBefore = mockGetIncidents.mock.calls.length;

    const list = UNSAFE_getByType(FlatList);
    const onRefresh = list.props.refreshControl.props.onRefresh;

    await act(async () => {
      onRefresh();
    });

    await waitFor(() => {
      expect(mockGetIncidents.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
