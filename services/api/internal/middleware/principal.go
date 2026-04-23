package middleware

import (
	"database/sql"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/govtrack-demo/govtrack/services/api/internal/config"
)

type Principal struct {
	UserID   *uuid.UUID
	DeviceID *string
}

const PrincipalKey = "principal"

var deviceIDRe = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

func ValidateDeviceID(deviceID string) bool {
	deviceID = strings.TrimSpace(deviceID)
	return deviceID != "" && len(deviceID) >= 8 && deviceIDRe.MatchString(deviceID)
}

func RequirePrincipal(db *sqlx.DB, cfg *config.Config) gin.HandlerFunc {
	key := []byte(cfg.JWTSigningKey)

	return func(c *gin.Context) {
		// Prefer Authorization principal when present and valid.
		if authz := strings.TrimSpace(c.GetHeader("Authorization")); authz != "" {
			p, ok := principalFromAuthHeader(c, db, key, authz)
			if ok {
				c.Set(PrincipalKey, p)
				c.Next()
				return
			}
		}

		// Fall back to device principal.
		deviceID := strings.TrimSpace(c.GetHeader("X-Device-ID"))
		if deviceID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		if !ValidateDeviceID(deviceID) {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation", "message": "invalid device id"}})
			c.Abort()
			return
		}

		p := Principal{DeviceID: &deviceID}
		c.Set(PrincipalKey, p)
		c.Next()
	}
}

func principalFromAuthHeader(c *gin.Context, db *sqlx.DB, key []byte, authz string) (Principal, bool) {
	raw := strings.TrimSpace(authz)
	if !strings.HasPrefix(strings.ToLower(raw), "bearer ") {
		return Principal{}, false
	}

	tokenStr := strings.TrimSpace(raw[len("bearer "):])
	if tokenStr == "" {
		return Principal{}, false
	}

	claims := jwt.MapClaims{}
	parsed, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return key, nil
	})
	if err != nil || parsed == nil || !parsed.Valid {
		return Principal{}, false
	}

	sub, _ := claims["sub"].(string)
	sid, _ := claims["sid"].(string)
	userID, err := uuid.Parse(sub)
	if err != nil {
		return Principal{}, false
	}
	sessionID, err := uuid.Parse(sid)
	if err != nil {
		return Principal{}, false
	}

	var expiresAt time.Time
	var sessionUser uuid.UUID
	if err := db.QueryRowxContext(c.Request.Context(), `
		SELECT user_id, expires_at
		FROM sessions
		WHERE id = $1
	`, sessionID).Scan(&sessionUser, &expiresAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Principal{}, false
		}
		return Principal{}, false
	}
	if sessionUser != userID || time.Now().After(expiresAt) {
		return Principal{}, false
	}

	return Principal{UserID: &userID}, true
}

