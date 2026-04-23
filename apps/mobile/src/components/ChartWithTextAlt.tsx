import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';

import { theme } from '../lib/theme';
import { AppText } from './AppText';

export type ChartPoint = { label: string; value: number; date?: string };

const hiddenStyle = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  overflow: 'hidden' as const,
};

export function ChartWithTextAlt({ points }: { points: ChartPoint[] }) {
  const summary = useMemo(() => summarize(points), [points]);

  if (!points.length) return null;

  const data = points.map((p, idx) => ({ x: idx, label: p.label, y: p.value }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      importantForAccessibility="yes"
      style={styles.wrap}
    >
      <CartesianChart
        data={data}
        xKey="x"
        yKeys={['y']}
        domainPadding={{ left: 12, right: 12, top: 10 }}
        axisOptions={{
          tickCount: { x: 4, y: 4 },
          labelColor: theme.colors.muted,
          lineColor: theme.colors.border,
          formatXLabel: (v) => data[Math.round(v)]?.label ?? '',
        }}
      >
        {({ points: pts, chartBounds }) => (
          <Bar
            points={pts.y}
            chartBounds={chartBounds}
            color={theme.colors.primary}
            roundedCorners={{ topLeft: 4, topRight: 4 }}
          />
        )}
      </CartesianChart>

      <View
        style={hiddenStyle}
        accessible
        accessibilityLabel={summary}
        importantForAccessibility="yes"
      >
        <AppText>{summary}</AppText>
      </View>
    </View>
  );
}

function summarize(points: ChartPoint[]) {
  const n = Math.min(points.length, 20);
  const slice = points.slice(0, n);
  const values = slice.map((p) => p.value);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const minIdx = values.findIndex((v) => v === min);
  const maxIdx = values.findIndex((v) => v === max);

  const nf = new Intl.NumberFormat();
  const dateFrom = slice[0]?.date ?? slice[0]?.label;
  const dateTo = slice[slice.length - 1]?.date ?? slice[slice.length - 1]?.label;

  const highestLabel = slice[maxIdx]?.label ?? 'unknown';
  const lowestLabel = slice[minIdx]?.label ?? 'unknown';

  return `Bar chart showing ${n} records from ${dateFrom} to ${dateTo}. Highest value ${nf.format(
    max,
  )} in ${highestLabel}. Lowest ${nf.format(min)} in ${lowestLabel}. Average ${nf.format(mean)}.`;
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    minHeight: 44,
  },
});
