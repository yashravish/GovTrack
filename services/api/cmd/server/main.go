package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/govtrack-demo/govtrack/services/api/internal/config"
	"github.com/govtrack-demo/govtrack/services/api/internal/db"
	"github.com/govtrack-demo/govtrack/services/api/internal/handlers"
	"github.com/govtrack-demo/govtrack/services/api/internal/middleware"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/auth"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/bookmarks"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/feeds"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", slog.String("error", err.Error()))
		os.Exit(1)
	}

	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect db", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer func() {
		_ = database.Close()
	}()

	if os.Getenv("GIN_MODE") == gin.ReleaseMode {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "DELETE"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Device-ID"},
		AllowCredentials: true,
	}))

	r.GET("/health", handlers.Health(database))

	mailer := auth.NewMailer(cfg)
	authSvc := auth.NewService(database, mailer, cfg)

	authGroup := r.Group("/api/v1/auth")
	authGroup.POST("/request", handlers.RequestMagicLink(authSvc))
	authGroup.POST("/verify", handlers.VerifyMagicLink(authSvc))

	dsRepo := datasets.NewRepo(database)
	dsSvc := datasets.NewService(dsRepo)
	bRepo := bookmarks.NewRepo(database)

	feedClient := feeds.NewSocrataClient(cfg.CDCFeedURL)
	cdcAdapter := feeds.NewCDCAdapter(feedClient, dsRepo)
	feedTracker := feeds.NewTracker(database)
	feedScheduler := feeds.NewScheduler(cdcAdapter, feedTracker, cfg.FeedRefreshInterval)

	v1 := r.Group("/api/v1")
	{
		v1.POST("/_test/last_token", handlers.LastToken())

		v1.GET("/categories", handlers.ListCategories(dsSvc))
		feedsGroup := v1.Group("/feeds")
		feedsGroup.GET("/health", handlers.ListFeedHealth(feedTracker))
		ds := v1.Group("/datasets")
		ds.GET("", handlers.ListDatasets(dsSvc))
		ds.GET("/:slug", handlers.GetDataset(dsSvc))
		ds.GET("/:slug/records", handlers.ListRecords(dsSvc))
		ds.GET("/:slug/stats", handlers.DatasetStats(dsSvc))

		bm := v1.Group("/bookmarks", middleware.RequirePrincipal(database, cfg))
		bm.POST("", handlers.AddBookmark(bRepo, dsRepo))
		bm.DELETE("/:slug", handlers.RemoveBookmark(bRepo, dsRepo))
		bm.GET("", handlers.ListBookmarks(bRepo))

		bmAuth := v1.Group("/bookmarks", middleware.RequireAuth(database, cfg))
		bmAuth.POST("/migrate", handlers.MigrateBookmarks(bRepo))
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.ListenAndServe()
	}()

	feedCtx, feedCancel := context.WithCancel(context.Background())
	defer feedCancel()
	go feedScheduler.Run(feedCtx)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-stop:
		slog.Info("shutdown signal received", slog.String("signal", sig.String()))
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("http server error", slog.String("error", err.Error()))
		}
	}

	feedCancel()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

