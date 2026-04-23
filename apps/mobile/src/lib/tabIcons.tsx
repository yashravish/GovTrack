import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

export function DashboardIcon({ color, size }: { color: string; size: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Dashboard tab">
      <Ionicons name="home" size={size} color={color} />
    </View>
  );
}

export function CategoriesIcon({ color, size }: { color: string; size: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Categories tab">
      <Ionicons name="grid" size={size} color={color} />
    </View>
  );
}

export function SavedIcon({ color, size }: { color: string; size: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Saved tab">
      <Ionicons name="bookmark" size={size} color={color} />
    </View>
  );
}

export function ProfileIcon({ color, size }: { color: string; size: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Profile tab">
      <Ionicons name="person" size={size} color={color} />
    </View>
  );
}
