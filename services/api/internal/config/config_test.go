package config

import "testing"

func TestLoad(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(t *testing.T)
		wantErr   bool
		assertCfg func(t *testing.T, cfg *Config)
	}{
		{
			name: "missing DATABASE_URL returns error",
			setup: func(t *testing.T) {
				t.Setenv("DATABASE_URL", "")
				t.Setenv("JWT_SIGNING_KEY", "dev-only-change-me-32chars-minimum")
				t.Setenv("PORT", "")
				t.Setenv("ALLOWED_ORIGINS", "")
			},
			wantErr: true,
		},
		{
			name: "valid env returns populated struct",
			setup: func(t *testing.T) {
				t.Setenv("DATABASE_URL", "postgres://govtrack:govtrack@localhost:5432/govtrack?sslmode=disable")
				t.Setenv("JWT_SIGNING_KEY", "dev-only-change-me-32chars-minimum")
				t.Setenv("PORT", "9090")
				t.Setenv("RESEND_API_KEY", "rk_test_123")
				t.Setenv("MAGIC_LINK_BASE_URL", "govtrack://auth")
				t.Setenv("CDC_FEED_URL", "https://example.com/feed")
				t.Setenv("ALLOWED_ORIGINS", "http://localhost:19006,http://localhost:5173")
			},
			wantErr: false,
			assertCfg: func(t *testing.T, cfg *Config) {
				if cfg.DatabaseURL == "" || cfg.JWTSigningKey == "" {
					t.Fatalf("expected required fields populated: %+v", cfg)
				}
				if cfg.Port != "9090" {
					t.Fatalf("expected port 9090, got %q", cfg.Port)
				}
				if cfg.ResendAPIKey != "rk_test_123" {
					t.Fatalf("expected resend key, got %q", cfg.ResendAPIKey)
				}
			},
		},
		{
			name: "ALLOWED_ORIGINS splits on comma",
			setup: func(t *testing.T) {
				t.Setenv("DATABASE_URL", "postgres://govtrack:govtrack@localhost:5432/govtrack?sslmode=disable")
				t.Setenv("JWT_SIGNING_KEY", "dev-only-change-me-32chars-minimum")
				t.Setenv("ALLOWED_ORIGINS", "http://a.test, http://b.test,,")
			},
			wantErr: false,
			assertCfg: func(t *testing.T, cfg *Config) {
				if len(cfg.AllowedOrigins) != 2 {
					t.Fatalf("expected 2 origins, got %v", cfg.AllowedOrigins)
				}
				if cfg.AllowedOrigins[0] != "http://a.test" || cfg.AllowedOrigins[1] != "http://b.test" {
					t.Fatalf("unexpected origins: %v", cfg.AllowedOrigins)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.setup != nil {
				tt.setup(t)
			}
			cfg, err := Load()
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.assertCfg != nil {
				tt.assertCfg(t, cfg)
			}
		})
	}
}

