import { act, fireEvent, render } from '@testing-library/react-native';

import CategoriesScreen from '../app/(tabs)/categories';

jest.useFakeTimers();

const mockUseCategories = jest.fn();
const mockUseInfiniteDatasets = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('../src/api/hooks', () => ({
  useCategories: () => mockUseCategories(),
  useInfiniteDatasets: (args: any) => mockUseInfiniteDatasets(args),
}));

describe('CategoriesScreen', () => {
  it('search input exists and debounces query', () => {
    mockUseCategories.mockReturnValue({
      data: [{ category: 'healthcare', count: 1 }],
      isLoading: false,
    });
    mockUseInfiniteDatasets.mockReturnValue({
      data: { pages: [{ data: [], page: 1, page_size: 20, total: 0 }] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      isRefetching: false,
    });

    const { getByLabelText, rerender } = render(<CategoriesScreen />);
    const input = getByLabelText('Search datasets');
    fireEvent.changeText(input, 'asthma');

    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Still not debounced (q not yet updated), but rerender will call hook again.
    rerender(<CategoriesScreen />);

    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender(<CategoriesScreen />);

    expect(mockUseInfiniteDatasets).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'asthma' }),
    );
  });

  it('empty state renders when no datasets', () => {
    mockUseCategories.mockReturnValue({ data: [], isLoading: false });
    mockUseInfiniteDatasets.mockReturnValue({
      data: { pages: [{ data: [], page: 1, page_size: 20, total: 0 }] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<CategoriesScreen />);
    expect(getByText('No datasets match')).toBeTruthy();
  });

  it('error state renders retry button and calls refetch', () => {
    const refetch = jest.fn();
    mockUseCategories.mockReturnValue({ data: [], isLoading: false });
    mockUseInfiniteDatasets.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      isRefetching: false,
    });

    const { getByLabelText } = render(<CategoriesScreen />);
    fireEvent.press(getByLabelText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
