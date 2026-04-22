import { fireEvent, render, screen } from '@testing-library/react-native';

import { DashboardBottomNav } from '@/components/dashboard-bottom-nav';

describe('DashboardBottomNav', () => {
  beforeEach(() => {
    globalThis.__TEST_ROUTER__!.push.mockClear();
  });

  it('navigates to dashboard routes when icons are pressed', () => {
    render(<DashboardBottomNav active="home" onNewReport={jest.fn()} />);

    fireEvent.press(screen.getByLabelText('Dashboard home'));
    expect(globalThis.__TEST_ROUTER__!.push).toHaveBeenCalledWith('/home');

    fireEvent.press(screen.getByLabelText('Incidents'));
    expect(globalThis.__TEST_ROUTER__!.push).toHaveBeenCalledWith('/incidents');

    fireEvent.press(screen.getByLabelText('Offenders'));
    expect(globalThis.__TEST_ROUTER__!.push).toHaveBeenCalledWith('/offenders');

    fireEvent.press(screen.getByLabelText('Settings'));
    expect(globalThis.__TEST_ROUTER__!.push).toHaveBeenCalledWith('/settings');
  });

  it('invokes onNewReport for the center action', () => {
    const onNewReport = jest.fn();
    render(<DashboardBottomNav active="incidents" onNewReport={onNewReport} />);
    fireEvent.press(screen.getByLabelText('New report'));
    expect(onNewReport).toHaveBeenCalled();
  });
});
