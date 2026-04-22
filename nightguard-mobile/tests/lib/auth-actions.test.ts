import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

import { signInWithEmailPassword, signUpWithEmailPassword } from '@/lib/auth-actions';

jest.mock('@/lib/firebase', () => ({ auth: {} }));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve()),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve()),
}));

const mockSignIn = signInWithEmailAndPassword as jest.MockedFunction<typeof signInWithEmailAndPassword>;
const mockCreate = createUserWithEmailAndPassword as jest.MockedFunction<typeof createUserWithEmailAndPassword>;

describe('auth-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signInWithEmailPassword trims email and calls Firebase sign-in', async () => {
    await signInWithEmailPassword('  user@test.com  ', 'secret');

    expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), 'user@test.com', 'secret');
  });

  it('signUpWithEmailPassword trims email and calls Firebase registration', async () => {
    await signUpWithEmailPassword('  new@test.com ', 'password123');

    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), 'new@test.com', 'password123');
  });
});
