package db

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func Connect(ctx context.Context, dsn string) (*sqlx.DB, error) {
	db, err := sqlx.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := Ping(ctx, db); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}

func Ping(ctx context.Context, db *sqlx.DB) error {
	cctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return db.PingContext(cctx)
}

