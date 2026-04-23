package datasets

import (
	"context"
	"encoding/json"
	"errors"
	"math"

	"github.com/google/uuid"

	"github.com/govtrack-demo/govtrack/services/api/internal/models"
)

type Service struct {
	repo *Repo
}

func NewService(repo *Repo) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListDatasets(ctx context.Context, category, q string, page, pageSize int) ([]models.Dataset, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	if q != "" {
		return s.repo.SearchDatasets(ctx, category, q, pageSize, offset)
	}
	return s.repo.ListDatasets(ctx, category, pageSize, offset)
}

func (s *Service) GetDatasetBySlug(ctx context.Context, slug string) (*models.Dataset, error) {
	return s.repo.GetDatasetBySlug(ctx, slug)
}

func (s *Service) ListRecordsBySlug(ctx context.Context, slug, q string, page, pageSize int) ([]models.Record, int, error) {
	ds, err := s.repo.GetDatasetBySlug(ctx, slug)
	if err != nil {
		return nil, 0, err
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize
	return s.repo.SearchRecords(ctx, ds.ID, q, pageSize, offset)
}

func (s *Service) DatasetStatsBySlug(ctx context.Context, slug string) (map[string]any, error) {
	ds, err := s.repo.GetDatasetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return s.SummaryStats(ctx, ds.ID)
}

func (s *Service) ListCategories(ctx context.Context) ([]CategoryCount, error) {
	return s.repo.ListCategories(ctx)
}

func (s *Service) SummaryStats(ctx context.Context, datasetID uuid.UUID) (map[string]any, error) {
	records, total, err := s.repo.SearchRecords(ctx, datasetID, "", 100, 0)
	if err != nil {
		return nil, err
	}
	if total == 0 || len(records) == 0 {
		return map[string]any{
			"count": 0,
			"min":   0.0,
			"max":   0.0,
			"mean":  0.0,
		}, nil
	}

	type payload struct {
		Value float64 `json:"value"`
	}

	minV := math.Inf(1)
	maxV := math.Inf(-1)
	sum := 0.0
	count := 0

	for _, rec := range records {
		var p payload
		if err := json.Unmarshal(rec.Payload, &p); err != nil {
			return nil, err
		}
		if math.IsNaN(p.Value) {
			return nil, errors.New("invalid value")
		}
		minV = math.Min(minV, p.Value)
		maxV = math.Max(maxV, p.Value)
		sum += p.Value
		count++
	}

	mean := 0.0
	if count > 0 {
		mean = sum / float64(count)
	}

	return map[string]any{
		"count": count,
		"min":   minV,
		"max":   maxV,
		"mean":  mean,
	}, nil
}

