import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AddOffenderSheet } from '@/components/new-report/AddOffenderSheet';

describe('AddOffenderSheet', () => {
  it('updates form fields', () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    render(<AddOffenderSheet visible onClose={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('First'), 'Jamie');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Fox');
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. tattoo on left arm, red jacket, 6ft tall'),
      'scar on cheek',
    );
    fireEvent.changeText(screen.getByPlaceholderText('Any additional context or history...'), 'banned last week');

    expect(screen.getByDisplayValue('Jamie')).toBeTruthy();
    expect(screen.getByDisplayValue('Fox')).toBeTruthy();
    expect(screen.getByDisplayValue('scar on cheek')).toBeTruthy();
    expect(screen.getByDisplayValue('banned last week')).toBeTruthy();
  });

  it('calls onSubmit with collected values when saving', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    render(<AddOffenderSheet visible onClose={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('First'), 'Jamie');
    fireEvent.changeText(screen.getByPlaceholderText('Last'), 'Fox');
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. tattoo on left arm, red jacket, 6ft tall'),
      ' tall ',
    );
    fireEvent.changeText(screen.getByPlaceholderText('Any additional context or history...'), ' notes ');

    fireEvent.press(screen.getByLabelText('Save offender'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        firstName: 'Jamie',
        lastName: 'Fox',
        physicalMarkers: 'tall',
        notes: 'notes',
      });
    });
  });
});
