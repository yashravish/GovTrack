package testutil

import (
	"context"

	"github.com/jmoiron/sqlx"
)

// Global advisory lock key used to serialize DB-mutating tests across packages.
// This avoids cross-package TRUNCATE races when running `go test ./...` in parallel.
const GlobalTestLockKey int64 = 42424242

func AcquireGlobalDBLock(ctx context.Context, db *sqlx.DB) error {
	_, err := db.ExecContext(ctx, `SELECT pg_advisory_lock($1)`, GlobalTestLockKey)
	return err
}

func ReleaseGlobalDBLock(ctx context.Context, db *sqlx.DB) error {
	_, err := db.ExecContext(ctx, `SELECT pg_advisory_unlock($1)`, GlobalTestLockKey)
	return err
}

