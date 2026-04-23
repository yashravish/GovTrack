package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/govtrack-demo/govtrack/services/api/internal/config"
)

type Service struct {
	db     *sqlx.DB
	mailer Mailer
	cfg    *config.Config
}

func NewService(db *sqlx.DB, mailer Mailer, cfg *config.Config) *Service {
	return &Service{db: db, mailer: mailer, cfg: cfg}
}

func (s *Service) RequestMagicLink(ctx context.Context, email string) error {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var userID uuid.UUID
	if err := tx.GetContext(ctx, &userID, `
		INSERT INTO users (email)
		VALUES ($1)
		ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
		RETURNING id
	`, email); err != nil {
		return err
	}

	token, err := GenerateMagicToken()
	if err != nil {
		return err
	}

	// Used only by the test-only E2E helper endpoint.
	MaybeSetLastMagicToken(token)

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO magic_tokens (token, user_id, expires_at)
		VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
	`, token, userID); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	link := fmt.Sprintf("%s?token=%s", s.cfg.MagicLinkBaseURL, token)
	subject := "Your GovTrack magic link"
	html := fmt.Sprintf(`<p>Click to sign in:</p><p><a href="%s">%s</a></p>`, link, link)

	return s.mailer.Send(ctx, email, subject, html)
}

func (s *Service) VerifyMagicLink(ctx context.Context, token string) (sessionJWT string, expiresAt time.Time, userID uuid.UUID, err error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return "", time.Time{}, uuid.Nil, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var row struct {
		UserID    uuid.UUID  `db:"user_id"`
		Email     string     `db:"email"`
		ExpiresAt time.Time  `db:"expires_at"`
		UsedAt    *time.Time `db:"used_at"`
	}

	if err := tx.GetContext(ctx, &row, `
		SELECT mt.user_id, u.email, mt.expires_at, mt.used_at
		FROM magic_tokens mt
		JOIN users u ON u.id = mt.user_id
		WHERE mt.token = $1
		FOR UPDATE
	`, token); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", time.Time{}, uuid.Nil, errors.New("invalid_token")
		}
		return "", time.Time{}, uuid.Nil, err
	}

	if row.UsedAt != nil || time.Now().After(row.ExpiresAt) {
		return "", time.Time{}, uuid.Nil, errors.New("invalid_token")
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE magic_tokens
		SET used_at = NOW()
		WHERE token = $1
	`, token); err != nil {
		return "", time.Time{}, uuid.Nil, err
	}

	tokenHash := HashToken(token)

	var sessionID uuid.UUID
	var sessionExpiresAt time.Time
	if err := tx.QueryRowxContext(ctx, `
		INSERT INTO sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, NOW() + INTERVAL '30 days')
		RETURNING id, expires_at
	`, row.UserID, tokenHash).Scan(&sessionID, &sessionExpiresAt); err != nil {
		return "", time.Time{}, uuid.Nil, err
	}

	if err := tx.Commit(); err != nil {
		return "", time.Time{}, uuid.Nil, err
	}

	claims := jwt.MapClaims{
		"sub": row.UserID.String(),
		"email": row.Email,
		"sid": sessionID.String(),
		"exp": sessionExpiresAt.Unix(),
	}
	j := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := j.SignedString([]byte(s.cfg.JWTSigningKey))
	if err != nil {
		return "", time.Time{}, uuid.Nil, err
	}

	return signed, sessionExpiresAt.UTC(), row.UserID, nil
}

