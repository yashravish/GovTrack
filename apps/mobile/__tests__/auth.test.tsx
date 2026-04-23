import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ProfileScreen from '../app/(tabs)/profile';
import RootLayout from '../app/_layout';

const mockRequestLink = jest.fn(async () => {});
const mockVerifyToken = jest.fn(async () => {});
const mockSignOut = jest.fn(async () => {});

let mockAuthState: {
  isAuthenticated: boolean;
  email: string | null;
  userId: string | null;
} = { isAuthenticated: false, email: null, userId: null };

jest.mock('../src/providers/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    ...mockAuthState,
    requestLink: mockRequestLink,
    verifyToken: mockVerifyToken,
    signOut: mockSignOut,
  }),
}));

const mockRemoveListener = { remove: jest.fn() };
let mockUrlHandler: ((e: { url: string }) => void) | null = null;

jest.mock('expo-linking', () => ({
  parse: (url: string) => {
    const q = url.split('?')[1] ?? '';
    const params = new URLSearchParams(q);
    return { queryParams: { token: params.get('token') } };
  },
  getInitialURL: jest.fn(async () => null),
  addEventListener: (_: string, cb: any) => {
    mockUrlHandler = cb;
    return mockRemoveListener;
  },
}));

jest.mock('expo-router', () => ({
  Stack: () => null,
}));

describe('auth + deep link', () => {
  beforeEach(() => {
    mockRequestLink.mockClear();
    mockVerifyToken.mockClear();
    mockSignOut.mockClear();
    mockRemoveListener.remove.mockClear();
    mockUrlHandler = null;
    mockAuthState = { isAuthenticated: false, email: null, userId: null };
  });

  it('unauthenticated Profile shows form and submit calls requestLink', async () => {
    const qc = new QueryClient();
    const { getByLabelText, getByText } = render(
      <QueryClientProvider client={qc}>
        <ProfileScreen />
      </QueryClientProvider>,
    );

    fireEvent.changeText(getByLabelText('Email'), 'user@example.com');
    fireEvent.press(getByText('Send magic link'));

    await waitFor(() => expect(mockRequestLink).toHaveBeenCalledWith('user@example.com'));
    expect(getByText('Check your email.')).toBeTruthy();
  });

  it('deep link triggers verifyToken', async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <RootLayout />
      </QueryClientProvider>,
    );

    expect(mockUrlHandler).toBeTruthy();
    mockUrlHandler?.({ url: 'govtrack://auth?token=abc123' });
    await waitFor(() => expect(mockVerifyToken).toHaveBeenCalledWith('abc123'));
  });
});
