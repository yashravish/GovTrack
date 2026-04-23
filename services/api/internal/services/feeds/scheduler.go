package feeds

import (
	"context"
	"log/slog"
	"time"
)

type Scheduler struct {
	adapter  *CDCAdapter
	tracker  *Tracker
	interval time.Duration
}

func NewScheduler(adapter *CDCAdapter, tracker *Tracker, interval time.Duration) *Scheduler {
	if interval <= 0 {
		interval = 10 * time.Minute
	}
	return &Scheduler{adapter: adapter, tracker: tracker, interval: interval}
}

func (s *Scheduler) Run(ctx context.Context) {
	runOnce := func() {
		start := time.Now()
		count, err := s.adapter.Refresh(ctx)
		latencyMs := int(time.Since(start).Milliseconds())

		ds, dserr := s.adapter.repo.GetDatasetBySlug(ctx, "cdc_respiratory_weekly")
		if dserr != nil {
			slog.Error("feed_refresh", slog.String("event", "feed_refresh"), slog.String("error", dserr.Error()), slog.Int("latency_ms", latencyMs))
			return
		}

		if err != nil {
			_ = s.tracker.RecordFailure(ctx, ds.ID, latencyMs, err.Error())
			slog.Error("feed_refresh", slog.String("event", "feed_refresh"), slog.String("error", err.Error()), slog.Int("latency_ms", latencyMs))
			return
		}

		_ = s.tracker.RecordSuccess(ctx, ds.ID, latencyMs)
		slog.Info("feed_refresh", slog.String("event", "feed_refresh"), slog.Int("count", count), slog.Int("latency_ms", latencyMs))
	}

	runOnce()

	t := time.NewTicker(s.interval)
	defer t.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			runOnce()
		}
	}
}

