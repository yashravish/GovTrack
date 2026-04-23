import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';

import HomeScreen from '../app/(tabs)/index';
import { CategoriesIcon, DashboardIcon, ProfileIcon, SavedIcon } from '../src/lib/tabIcons';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
}));

jest.mock('../src/api/hooks', () => ({
  useCategories: () => ({
    isLoading: false,
    isError: false,
    data: [] as any[],
    refetch: jest.fn(),
  }),
  useFeedHealth: () => ({
    isLoading: false,
    isError: false,
    data: [] as any[],
    refetch: jest.fn(),
  }),
}));

describe('tabs shell', () => {
  it('renders home header', () => {
    const qc = new QueryClient();
    const { getByRole } = render(
      <QueryClientProvider client={qc}>
        <HomeScreen />
      </QueryClientProvider>,
    );
    expect(getByRole('header')).toHaveTextContent('Explore public data');
  });

  it('tab icons have accessibility labels', () => {
    const { getByLabelText } = render(
      <>
        <DashboardIcon color="#000" size={20} />
        <CategoriesIcon color="#000" size={20} />
        <SavedIcon color="#000" size={20} />
        <ProfileIcon color="#000" size={20} />
      </>,
    );
    expect(getByLabelText('Dashboard tab')).toBeTruthy();
    expect(getByLabelText('Categories tab')).toBeTruthy();
    expect(getByLabelText('Saved tab')).toBeTruthy();
    expect(getByLabelText('Profile tab')).toBeTruthy();
  });
});
