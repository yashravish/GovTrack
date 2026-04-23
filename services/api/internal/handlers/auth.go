package handlers

import (
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/govtrack-demo/govtrack/services/api/internal/services/auth"
)

var emailRe = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

type rateLimiter struct {
	mu   sync.Mutex
	last map[string]time.Time
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{last: make(map[string]time.Time)}
}

func (rl *rateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	prev, ok := rl.last[key]
	if ok && now.Sub(prev) < time.Minute {
		return false
	}
	rl.last[key] = now
	return true
}

var authRequestLimiter = newRateLimiter()

func RequestMagicLink(svc *auth.Service) gin.HandlerFunc {
	type req struct {
		Email string `json:"email"`
	}

	return func(c *gin.Context) {
		var r req
		if err := c.ShouldBindJSON(&r); err != nil {
			c.JSON(http.StatusAccepted, gin.H{"status": "ok"})
			return
		}

		email := strings.TrimSpace(strings.ToLower(r.Email))
		if !emailRe.MatchString(email) {
			c.JSON(http.StatusAccepted, gin.H{"status": "ok"})
			return
		}

		if authRequestLimiter.Allow(email) {
			_ = svc.RequestMagicLink(c.Request.Context(), email)
		}

		c.JSON(http.StatusAccepted, gin.H{"status": "ok"})
	}
}

func VerifyMagicLink(svc *auth.Service) gin.HandlerFunc {
	type req struct {
		Token string `json:"token"`
	}

	return func(c *gin.Context) {
		var r req
		if err := c.ShouldBindJSON(&r); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			return
		}

		token := strings.TrimSpace(r.Token)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			return
		}

		jwtToken, expiresAt, _, err := svc.VerifyMagicLink(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token":      jwtToken,
			"expires_at": expiresAt.Format(time.RFC3339),
		})
	}
}

