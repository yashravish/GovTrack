package middleware

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/govtrack-demo/govtrack/services/api/internal/config"
)

const UserIDKey = "user_id"

func RequireAuth(db *sqlx.DB, cfg *config.Config) gin.HandlerFunc {
	key := []byte(cfg.JWTSigningKey)

	return func(c *gin.Context) {
		authz := c.GetHeader("Authorization")
		raw := strings.TrimSpace(authz)
		if raw == "" || !strings.HasPrefix(strings.ToLower(raw), "bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimSpace(raw[len("bearer "):])
		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		claims := jwt.MapClaims{}
		parsed, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if t.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("unexpected signing method")
			}
			return key, nil
		})
		if err != nil || parsed == nil || !parsed.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		sub, _ := claims["sub"].(string)
		sid, _ := claims["sid"].(string)
		userID, err := uuid.Parse(sub)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		sessionID, err := uuid.Parse(sid)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		var expiresAt time.Time
		var sessionUser uuid.UUID
		if err := db.QueryRowxContext(c.Request.Context(), `
			SELECT user_id, expires_at
			FROM sessions
			WHERE id = $1
		`, sessionID).Scan(&sessionUser, &expiresAt); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
				c.Abort()
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		if sessionUser != userID || time.Now().After(expiresAt) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		c.Set(UserIDKey, userID)
		c.Next()
	}
}

