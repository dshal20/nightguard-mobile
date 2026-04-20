import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';

describe('ProfileCompletionModal', () => {
  it('updates first and last name inputs', () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    render(<ProfileCompletionModal visible onSubmit={onSubmit} />);

    const first = screen.getByPlaceholderText('First name');
    const last = screen.getByPlaceholderText('Last name');
    fireEvent.changeText(first, 'Taylor');
    fireEvent.changeText(last, 'Nguyen');

    expect(first.props.value).toBe('Taylor');
    expect(last.props.value).toBe('Nguyen');
  });

  it('submits profile data via onSubmit when Continue is pressed', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    render(<ProfileCompletionModal visible onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('First name'), '  Taylor ');
    fireEvent.changeText(screen.getByPlaceholderText('Last name'), ' Nguyen ');

    fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('  Taylor ', ' Nguyen ');
    });
  });
});
