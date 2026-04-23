package datasets

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/govtrack-demo/govtrack/services/api/internal/models"
)

var ErrNotFound = errors.New("not_found")

type Repo struct {
	db *sqlx.DB
}

func NewRepo(db *sqlx.DB) *Repo {
	return &Repo{db: db}
}

type RecordInput struct {
	Payload      []byte
	IndexedText  string
	CreatedAt    time.Time
}

func clampLimit(limit int) int {
	if limit <= 0 {
		return 20
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func (r *Repo) ListDatasets(ctx context.Context, category string, limit, offset int) ([]models.Dataset, int, error) {
	limit = clampLimit(limit)
	if offset < 0 {
		offset = 0
	}

	args := []any{}
	where := ""
	if strings.TrimSpace(category) != "" {
		where = "WHERE category = $1"
		args = append(args, category)
	}

	var total int
	if err := r.db.GetContext(ctx, &total, "SELECT count(*) FROM datasets "+where, args...); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	query := `
		SELECT id, slug, category, title, description, source_url, source_type, updated_at
		FROM datasets
		` + where + `
		ORDER BY category, slug
		LIMIT $` + itoa(len(args)-1) + ` OFFSET $` + itoa(len(args)) + `
	`

	var out []models.Dataset
	if err := r.db.SelectContext(ctx, &out, query, args...); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

type CategoryCount struct {
	Category string `db:"category" json:"category"`
	Count    int    `db:"count" json:"count"`
}

func (r *Repo) ListCategories(ctx context.Context) ([]CategoryCount, error) {
	var out []CategoryCount
	if err := r.db.SelectContext(ctx, &out, `
		SELECT category, count(*)::int AS count
		FROM datasets
		GROUP BY category
		ORDER BY category
	`); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) SearchDatasets(ctx context.Context, category, q string, limit, offset int) ([]models.Dataset, int, error) {
	limit = clampLimit(limit)
	if offset < 0 {
		offset = 0
	}

	q = strings.TrimSpace(strings.ToLower(q))

	args := []any{}
	conds := []string{}
	if strings.TrimSpace(category) != "" {
		args = append(args, category)
		conds = append(conds, "category = $"+itoa(len(args)))
	}
	if q != "" {
		args = append(args, q)
		conds = append(conds, "(lower(title) ILIKE '%'||$"+itoa(len(args))+"||'%' OR lower(description) ILIKE '%'||$"+itoa(len(args))+"||'%' OR lower(slug) ILIKE '%'||$"+itoa(len(args))+"||'%')")
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	var total int
	if err := r.db.GetContext(ctx, &total, "SELECT count(*) FROM datasets "+where, args...); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	limitPos := len(args) - 1
	offsetPos := len(args)

	query := `
		SELECT id, slug, category, title, description, source_url, source_type, updated_at
		FROM datasets
		` + where + `
		ORDER BY category, slug
		LIMIT $` + itoa(limitPos) + ` OFFSET $` + itoa(offsetPos) + `
	`

	var out []models.Dataset
	if err := r.db.SelectContext(ctx, &out, query, args...); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repo) GetDatasetBySlug(ctx context.Context, slug string) (*models.Dataset, error) {
	var d models.Dataset
	err := r.db.GetContext(ctx, &d, `
		SELECT id, slug, category, title, description, source_url, source_type, updated_at
		FROM datasets
		WHERE slug = $1
	`, slug)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &d, nil
}

func (r *Repo) SearchRecords(ctx context.Context, datasetID uuid.UUID, q string, limit, offset int) ([]models.Record, int, error) {
	limit = clampLimit(limit)
	if offset < 0 {
		offset = 0
	}

	q = strings.TrimSpace(q)
	where := "WHERE dataset_id = $1"
	args := []any{datasetID}
	if q != "" {
		where += " AND indexed_text ILIKE '%'||$2||'%'"
		args = append(args, q)
	}

	var total int
	if err := r.db.GetContext(ctx, &total, "SELECT count(*) FROM records "+where, args...); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	limitPos := len(args) - 1
	offsetPos := len(args)

	query := `
		SELECT id, dataset_id, payload, created_at
		FROM records
		` + where + `
		ORDER BY created_at DESC, id
		LIMIT $` + itoa(limitPos) + ` OFFSET $` + itoa(offsetPos) + `
	`

	var out []models.Record
	if err := r.db.SelectContext(ctx, &out, query, args...); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repo) DeleteRecordsForDataset(ctx context.Context, datasetID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM records WHERE dataset_id = $1`, datasetID)
	return err
}

func (r *Repo) UpsertDataset(ctx context.Context, d models.Dataset) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO datasets (slug, category, title, description, source_url, source_type, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (slug) DO UPDATE SET
			category = EXCLUDED.category,
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			source_url = EXCLUDED.source_url,
			source_type = EXCLUDED.source_type,
			updated_at = NOW()
	`, d.Slug, d.Category, d.Title, d.Description, d.SourceURL, d.SourceType)
	return err
}

func (r *Repo) InsertRecords(ctx context.Context, datasetID uuid.UUID, rows []RecordInput) error {
	if len(rows) == 0 {
		return nil
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if err := insertRecordsTx(ctx, tx, datasetID, rows); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repo) ReplaceRecords(ctx context.Context, datasetID uuid.UUID, rows []RecordInput) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM records WHERE dataset_id = $1`, datasetID); err != nil {
		return err
	}
	if err := insertRecordsTx(ctx, tx, datasetID, rows); err != nil {
		return err
	}
	return tx.Commit()
}

func insertRecordsTx(ctx context.Context, tx *sqlx.Tx, datasetID uuid.UUID, rows []RecordInput) error {
	if len(rows) == 0 {
		return nil
	}

	stmt, err := tx.PreparexContext(ctx, `
		INSERT INTO records (dataset_id, payload, indexed_text)
		VALUES ($1, $2, $3)
	`)
	if err != nil {
		return err
	}
	defer func() { _ = stmt.Close() }()

	for _, row := range rows {
		indexed := strings.ToLower(strings.TrimSpace(row.IndexedText))
		if _, err := stmt.ExecContext(ctx, datasetID, row.Payload, indexed); err != nil {
			return err
		}
	}
	return nil
}

// tiny int->string helper without fmt allocations
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	var b [20]byte
	pos := len(b)
	for i > 0 {
		pos--
		b[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		b[pos] = '-'
	}
	return string(b[pos:])
}

