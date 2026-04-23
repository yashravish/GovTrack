package auth

import (
	"context"
	"database/sql"
	"net/url"
	"regexp"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"

	"github.com/govtrack-demo/govtrack/services/api/internal/config"
	internaldb "github.com/govtrack-demo/govtrack/services/api/internal/db"
)

type captureMailer struct {
	lastHTML string
}

func (m *captureMailer) Send(ctx context.Context, to, subject, html string) error {
	_ = ctx
	_ = to
	_ = subject
	m.lastHTML = html
	return nil
}

func mustConnectTestDB(t *testing.T, cfg *config.Config) *sqlx.DB {
	t.Helper()
	db, err := internaldb.Connect(context.Background(), cfg.DatabaseURL)
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func truncateAuthTables(t *testing.T, db *sqlx.DB) {
	t.Helper()
	_, err := db.Exec(`TRUNCATE TABLE sessions, magic_tokens, users RESTART IDENTITY CASCADE;`)
	require.NoError(t, err)
}

func extractToken(t *testing.T, html string) string {
	t.Helper()

	// We only need the token value; don't depend on a specific URL scheme or HTML shape.
	re := regexp.MustCompile(`token=([A-Za-z0-9_-]+)`)
	m := re.FindStringSubmatch(html)
	require.GreaterOrEqual(t, len(m), 2, "expected magic link token in html")

	// Validate it round-trips as a URL query parameter.
	u, err := url.Parse("https://example.test/verify?" + m[0])
	require.NoError(t, err)
	token := u.Query().Get("token")
	require.NotEmpty(t, token)
	return token
}

func TestService_MagicLinkFlow(t *testing.T) {
	cfg := &config.Config{
		DatabaseURL:      "postgres://govtrack:govtrack@localhost:5432/govtrack?sslmode=disable",
		JWTSigningKey:    "dev-only-change-me-32chars-minimum",
		MagicLinkBaseURL: "govtrack://auth",
	}

	db := mustConnectTestDB(t, cfg)

	t.Run("request issues token and stores row", func(t *testing.T) {
		truncateAuthTables(t, db)

		mailer := &captureMailer{}
		svc := NewService(db, mailer, cfg)

		require.NoError(t, svc.RequestMagicLink(context.Background(), "you@example.com"))
		token := extractToken(t, mailer.lastHTML)

		var count int
		require.NoError(t, db.Get(&count, `SELECT count(*) FROM magic_tokens WHERE token = $1`, token))
		require.Equal(t, 1, count)
	})

	t.Run("verify consumes token, issues JWT, marks used", func(t *testing.T) {
		truncateAuthTables(t, db)

		mailer := &captureMailer{}
		svc := NewService(db, mailer, cfg)

		require.NoError(t, svc.RequestMagicLink(context.Background(), "you@example.com"))
		token := extractToken(t, mailer.lastHTML)

		jwtToken, expiresAt, userID, err := svc.VerifyMagicLink(context.Background(), token)
		require.NoError(t, err)
		require.NotEmpty(t, jwtToken)
		require.NotEqual(t, userID.String(), "")
		require.True(t, expiresAt.After(time.Now()))

		var usedAt sql.NullTime
		require.NoError(t, db.QueryRowx(`SELECT used_at FROM magic_tokens WHERE token = $1`, token).Scan(&usedAt))
		require.True(t, usedAt.Valid)

		var sessions int
		require.NoError(t, db.Get(&sessions, `SELECT count(*) FROM sessions WHERE user_id = $1`, userID))
		require.Equal(t, 1, sessions)
	})

	t.Run("double-verify fails", func(t *testing.T) {
		truncateAuthTables(t, db)

		mailer := &captureMailer{}
		svc := NewService(db, mailer, cfg)

		require.NoError(t, svc.RequestMagicLink(context.Background(), "you@example.com"))
		token := extractToken(t, mailer.lastHTML)

		_, _, _, err := svc.VerifyMagicLink(context.Background(), token)
		require.NoError(t, err)

		_, _, _, err = svc.VerifyMagicLink(context.Background(), token)
		require.Error(t, err)
	})

	t.Run("expired token fails", func(t *testing.T) {
		truncateAuthTables(t, db)

		mailer := &captureMailer{}
		svc := NewService(db, mailer, cfg)

		require.NoError(t, svc.RequestMagicLink(context.Background(), "you@example.com"))
		token := extractToken(t, mailer.lastHTML)

		_, err := db.Exec(`UPDATE magic_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE token = $1`, token)
		require.NoError(t, err)

		_, _, _, err = svc.VerifyMagicLink(context.Background(), token)
		require.Error(t, err)
	})
}

func TestHashToken(t *testing.T) {
	h1 := HashToken("abc")
	h2 := HashToken("abc")
	require.Equal(t, h1, h2)
	require.NotEqual(t, h1, HashToken("abcd"))
}

