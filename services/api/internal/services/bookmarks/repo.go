package bookmarks

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/govtrack-demo/govtrack/services/api/internal/middleware"
	"github.com/govtrack-demo/govtrack/services/api/internal/models"
)

type Repo struct {
	db *sqlx.DB
}

func NewRepo(db *sqlx.DB) *Repo {
	return &Repo{db: db}
}

func (r *Repo) Add(ctx context.Context, p middleware.Principal, datasetID uuid.UUID) error {
	if p.UserID != nil {
		_, err := r.db.ExecContext(ctx, `INSERT INTO bookmarks (user_id, dataset_id) VALUES ($1, $2)`, *p.UserID, datasetID)
		if isUniqueViolation(err) {
			return nil
		}
		return err
	}
	if p.DeviceID != nil {
		_, err := r.db.ExecContext(ctx, `INSERT INTO bookmarks (device_id, dataset_id) VALUES ($1, $2)`, *p.DeviceID, datasetID)
		if isUniqueViolation(err) {
			return nil
		}
		return err
	}
	return errors.New("missing principal")
}

func (r *Repo) Remove(ctx context.Context, p middleware.Principal, datasetID uuid.UUID) error {
	if p.UserID != nil {
		_, err := r.db.ExecContext(ctx, `DELETE FROM bookmarks WHERE user_id = $1 AND dataset_id = $2`, *p.UserID, datasetID)
		return err
	}
	if p.DeviceID != nil {
		_, err := r.db.ExecContext(ctx, `DELETE FROM bookmarks WHERE device_id = $1 AND dataset_id = $2`, *p.DeviceID, datasetID)
		return err
	}
	return errors.New("missing principal")
}

func (r *Repo) List(ctx context.Context, p middleware.Principal) ([]models.Dataset, error) {
	out := make([]models.Dataset, 0)
	if p.UserID != nil {
		err := r.db.SelectContext(ctx, &out, `
			SELECT d.id, d.slug, d.category, d.title, d.description, d.source_url, d.source_type, d.updated_at
			FROM bookmarks b
			JOIN datasets d ON d.id = b.dataset_id
			WHERE b.user_id = $1
			ORDER BY b.created_at DESC
		`, *p.UserID)
		return out, err
	}
	if p.DeviceID != nil {
		err := r.db.SelectContext(ctx, &out, `
			SELECT d.id, d.slug, d.category, d.title, d.description, d.source_url, d.source_type, d.updated_at
			FROM bookmarks b
			JOIN datasets d ON d.id = b.dataset_id
			WHERE b.device_id = $1
			ORDER BY b.created_at DESC
		`, *p.DeviceID)
		return out, err
	}
	return nil, errors.New("missing principal")
}

func (r *Repo) MigrateDeviceToUser(ctx context.Context, deviceID string, userID uuid.UUID) (migrated int, err error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var inserted int
	if err := tx.GetContext(ctx, &inserted, `
		WITH moved AS (
			SELECT dataset_id
			FROM bookmarks
			WHERE device_id = $1 AND user_id IS NULL
		),
		ins AS (
			INSERT INTO bookmarks (user_id, dataset_id)
			SELECT $2, dataset_id
			FROM moved
			ON CONFLICT DO NOTHING
			RETURNING 1
		)
		SELECT COUNT(*)::int FROM ins
	`, deviceID, userID); err != nil {
		return 0, err
	}

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM bookmarks
		WHERE device_id = $1 AND user_id IS NULL
	`, deviceID); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return inserted, nil
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

