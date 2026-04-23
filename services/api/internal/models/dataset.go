package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Dataset struct {
	ID          uuid.UUID `db:"id" json:"id"`
	Slug        string    `db:"slug" json:"slug"`
	Category    string    `db:"category" json:"category"`
	Title       string    `db:"title" json:"title"`
	Description string    `db:"description" json:"description"`
	SourceURL   string    `db:"source_url" json:"source_url"`
	SourceType  string    `db:"source_type" json:"source_type"` // "fixture"|"live"
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

type Record struct {
	ID        uuid.UUID       `db:"id" json:"id"`
	DatasetID uuid.UUID       `db:"dataset_id" json:"dataset_id"`
	Payload   json.RawMessage `db:"payload" json:"payload"`
	CreatedAt time.Time       `db:"created_at" json:"created_at"`
}

