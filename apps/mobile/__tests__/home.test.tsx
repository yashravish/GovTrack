import { fireEvent, render } from '@testing-library/react-native';

import HomeScreen from '../app/(tabs)/index';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockUseCategories = jest.fn();
const mockUseFeedHealth = jest.fn();

jest.mock('../src/api/hooks', () => ({
  useCategories: () => mockUseCategories(),
  useFeedHealth: () => mockUseFeedHealth(),
}));

describe('HomeScreen', () => {
  it('loading -> success renders 4 category cards as buttons', () => {
    mockUseFeedHealth.mockReturnValue({ isLoading: false, isError: false, data: [] });
    mockUseCategories.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      refetch: jest.fn(),
    });

    const { getByLabelText, rerender } = render(<HomeScreen />);
    expect(getByLabelText('Loading state')).toBeTruthy();

    mockUseCategories.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { category: 'healthcare', count: 1 },
        { category: 'transportation', count: 1 },
        { category: 'environment', count: 1 },
        { category: 'agency_reports', count: 1 },
      ],
      refetch: jest.fn(),
    });

    rerender(<HomeScreen />);

    // Each CategoryCard sets Card accessibilityRole="button"
    expect(getByLabelText('Category healthcare, 1 datasets')).toBeTruthy();
    expect(getByLabelText('Category transportation, 1 datasets')).toBeTruthy();
    expect(getByLabelText('Category environment, 1 datasets')).toBeTruthy();
    expect(getByLabelText('Category agency_reports, 1 datasets')).toBeTruthy();
  });

  it('error state shows retry button and calls refetch', () => {
    const refetch = jest.fn();
    mockUseFeedHealth.mockReturnValue({ isLoading: false, isError: false, data: [] });
    mockUseCategories.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      refetch,
    });

    const { getByLabelText } = render(<HomeScreen />);
    fireEvent.press(getByLabelText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
