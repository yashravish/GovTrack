package feeds

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type FeedStatus struct {
	DatasetID    uuid.UUID `db:"dataset_id" json:"dataset_id"`
	Slug         string    `db:"slug" json:"slug"`
	LastChecked  time.Time `db:"last_checked" json:"last_checked"`
	Status       string    `db:"status" json:"status"`
	LatencyMs    int       `db:"latency_ms" json:"latency_ms"`
	ErrorMessage *string   `db:"error_message" json:"error_message,omitempty"`
}

type Tracker struct {
	db *sqlx.DB

	mu        sync.Mutex
	slowCount map[uuid.UUID]int
}

func NewTracker(db *sqlx.DB) *Tracker {
	return &Tracker{
		db:        db,
		slowCount: make(map[uuid.UUID]int),
	}
}

func (t *Tracker) RecordSuccess(ctx context.Context, datasetID uuid.UUID, latencyMs int) error {
	status := "healthy"

	t.mu.Lock()
	if latencyMs > 5000 {
		t.slowCount[datasetID]++
		if t.slowCount[datasetID] >= 3 {
			status = "degraded"
		}
	} else {
		t.slowCount[datasetID] = 0
	}
	t.mu.Unlock()

	_, err := t.db.ExecContext(ctx, `
		INSERT INTO feed_status (dataset_id, last_checked, status, latency_ms, error_message)
		VALUES ($1, NOW(), $2, $3, NULL)
		ON CONFLICT (dataset_id) DO UPDATE SET
			last_checked = NOW(),
			status = EXCLUDED.status,
			latency_ms = EXCLUDED.latency_ms,
			error_message = NULL
	`, datasetID, status, latencyMs)
	return err
}

func (t *Tracker) RecordFailure(ctx context.Context, datasetID uuid.UUID, latencyMs int, errMsg string) error {
	t.mu.Lock()
	t.slowCount[datasetID] = 0
	t.mu.Unlock()

	errMsg = strings.TrimSpace(errMsg)
	if len(errMsg) > 300 {
		errMsg = errMsg[:300]
	}

	_, err := t.db.ExecContext(ctx, `
		INSERT INTO feed_status (dataset_id, last_checked, status, latency_ms, error_message)
		VALUES ($1, NOW(), 'down', $2, $3)
		ON CONFLICT (dataset_id) DO UPDATE SET
			last_checked = NOW(),
			status = 'down',
			latency_ms = EXCLUDED.latency_ms,
			error_message = EXCLUDED.error_message
	`, datasetID, latencyMs, errMsg)
	return err
}

func (t *Tracker) ListHealth(ctx context.Context) ([]FeedStatus, error) {
	var out []FeedStatus
	if err := t.db.SelectContext(ctx, &out, `
		SELECT fs.dataset_id, d.slug, fs.last_checked, fs.status, fs.latency_ms, fs.error_message
		FROM feed_status fs
		JOIN datasets d ON d.id = fs.dataset_id
		ORDER BY d.slug
	`); err != nil {
		return nil, err
	}
	return out, nil
}

