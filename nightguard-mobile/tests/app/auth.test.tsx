import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AuthScreen from '@/app/auth';
import * as authActions from '@/lib/auth-actions';

jest.mock('@/lib/auth-actions', () => ({
  signInWithEmailPassword: jest.fn(() => Promise.resolve()),
  signUpWithEmailPassword: jest.fn(() => Promise.resolve()),
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<AuthScreen />);
    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(screen.getByText('Use your work email and password.')).toBeTruthy();
    expect(screen.getByLabelText('Log in')).toBeTruthy();
  });

  it('switches between login and signup modes', () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText('Sign up'));
    expect(screen.getByText(/use this to sign in on this device/i)).toBeTruthy();
    expect(screen.getByLabelText('Create account')).toBeTruthy();

    fireEvent.press(screen.getByText('Log in'));
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('updates login email and password fields', () => {
    render(<AuthScreen />);
    const email = screen.getAllByPlaceholderText('you@venue.com')[0]!;
    const password = screen.getByPlaceholderText('••••••••');
    fireEvent.changeText(email, 'guard@venue.com');
    fireEvent.changeText(password, 'hunter2!');
    expect(email.props.value).toBe('guard@venue.com');
    expect(password.props.value).toBe('hunter2!');
  });

  it('submits login via signInWithEmailPassword', async () => {
    render(<AuthScreen />);
    const email = screen.getAllByPlaceholderText('you@venue.com')[0]!;
    const password = screen.getByPlaceholderText('••••••••');
    fireEvent.changeText(email, 'a@b.com');
    fireEvent.changeText(password, 'password1');
    fireEvent.press(screen.getByLabelText('Log in'));

    await waitFor(() => {
      expect(authActions.signInWithEmailPassword).toHaveBeenCalledWith('a@b.com', 'password1');
    });
  });

  it('validates signup confirm password', async () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText('Sign up'));

    fireEvent.changeText(screen.getByPlaceholderText('Alex Rivera'), 'Pat Example');
    fireEvent.changeText(screen.getAllByPlaceholderText('you@venue.com')[0]!, 'pat@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'password12');
    fireEvent.changeText(screen.getByPlaceholderText('Repeat password'), 'different!');
    fireEvent.press(screen.getByLabelText('Create account'));

    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
    expect(authActions.signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it('submits signup when passwords match', async () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText('Sign up'));

    fireEvent.changeText(screen.getByPlaceholderText('Alex Rivera'), 'Pat Example');
    fireEvent.changeText(screen.getAllByPlaceholderText('you@venue.com')[0]!, 'pat@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'password12');
    fireEvent.changeText(screen.getByPlaceholderText('Repeat password'), 'password12');
    fireEvent.press(screen.getByLabelText('Create account'));

    await waitFor(() => {
      expect(authActions.signUpWithEmailPassword).toHaveBeenCalledWith('pat@example.com', 'password12');
    });
  });
});
