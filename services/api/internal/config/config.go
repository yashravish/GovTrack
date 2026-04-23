package config

import (
	"errors"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL       string
	Port              string
	ResendAPIKey      string
	MagicLinkBaseURL  string
	JWTSigningKey     string
	CDCFeedURL        string
	AllowedOrigins    []string
	FeedRefreshInterval time.Duration
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		DatabaseURL:      strings.TrimSpace(os.Getenv("DATABASE_URL")),
		Port:             strings.TrimSpace(os.Getenv("PORT")),
		ResendAPIKey:     strings.TrimSpace(os.Getenv("RESEND_API_KEY")),
		MagicLinkBaseURL: strings.TrimSpace(os.Getenv("MAGIC_LINK_BASE_URL")),
		JWTSigningKey:    strings.TrimSpace(os.Getenv("JWT_SIGNING_KEY")),
		CDCFeedURL:       strings.TrimSpace(os.Getenv("CDC_FEED_URL")),
		FeedRefreshInterval: 10 * time.Minute,
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	originsRaw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if originsRaw != "" {
		parts := strings.Split(originsRaw, ",")
		cfg.AllowedOrigins = make([]string, 0, len(parts))
		for _, p := range parts {
			o := strings.TrimSpace(p)
			if o == "" {
				continue
			}
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, o)
		}
	}

	if v := strings.TrimSpace(os.Getenv("FEED_REFRESH_INTERVAL")); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			return nil, errors.New("FEED_REFRESH_INTERVAL is invalid")
		}
		if d > 0 {
			cfg.FeedRefreshInterval = d
		}
	}

	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	if cfg.JWTSigningKey == "" {
		return nil, errors.New("JWT_SIGNING_KEY is required")
	}

	return cfg, nil
}

