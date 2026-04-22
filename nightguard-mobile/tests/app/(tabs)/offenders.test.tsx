import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FlatList } from 'react-native';

import OffendersScreen from '@/app/(tabs)/offenders';
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
  getOffenders: jest.fn(),
  createOffender: jest.fn(),
}));

jest.mock('@/components/new-report/AddOffenderSheet', () => ({
  AddOffenderSheet: () => null,
}));

jest.mock('@/components/new-report/NewReportModal', () => ({
  NewReportModal: () => null,
}));

const mockGetVenues = api.getVenues as jest.MockedFunction<typeof api.getVenues>;
const mockGetOffenders = api.getOffenders as jest.MockedFunction<typeof api.getOffenders>;

describe('OffendersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVenues.mockResolvedValue([{ id: 'v1', name: 'Warehouse' }]);
    mockGetOffenders.mockResolvedValue([
      { id: 'o1', firstName: 'Alex', lastName: 'Kim', physicalMarkers: 'red hat', riskScore: 10 },
      { id: 'o2', firstName: 'Jordan', lastName: 'Lee', physicalMarkers: 'tattoo', riskScore: 20 },
    ]);
  });

  it('loads offenders and shows names', async () => {
    render(<OffendersScreen />);
    await waitFor(() => {
      expect(mockGetOffenders).toHaveBeenCalledWith('v1', 'tok');
    });
    expect(await screen.findByText('Alex Kim')).toBeTruthy();
    expect(screen.getByText('Jordan Lee')).toBeTruthy();
  });

  it('filters the list when search text changes', async () => {
    const { UNSAFE_getByType } = render(<OffendersScreen />);
    await screen.findByText('Alex Kim');

    const search = screen.getByLabelText('Search offenders');
    fireEvent.changeText(search, 'jordan');

    await waitFor(() => {
      const list = UNSAFE_getByType(FlatList);
      expect(list.props.data).toHaveLength(1);
      expect(list.props.data[0]).toMatchObject({ firstName: 'Jordan', lastName: 'Lee' });
    });
  });

  it('pull-to-refresh reloads offenders', async () => {
    const { UNSAFE_getByType } = render(<OffendersScreen />);
    await waitFor(() => {
      expect(mockGetOffenders).toHaveBeenCalled();
    });
    const before = mockGetOffenders.mock.calls.length;

    const list = UNSAFE_getByType(FlatList);
    await act(async () => {
      list.props.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(mockGetOffenders.mock.calls.length).toBeGreaterThan(before);
    });
  });
});
