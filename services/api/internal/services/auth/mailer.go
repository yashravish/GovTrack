package auth

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/resend/resend-go/v2"

	"github.com/govtrack-demo/govtrack/services/api/internal/config"
)

type Mailer interface {
	Send(ctx context.Context, to, subject, html string) error
}

type ResendMailer struct {
	client *resend.Client
	from   string
}

func (m *ResendMailer) Send(ctx context.Context, to, subject, html string) error {
	_, err := m.client.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
		From:    m.from,
		To:      []string{to},
		Subject: subject,
		Html:    html,
	})
	return err
}

type ConsoleMailer struct{}

func (m *ConsoleMailer) Send(ctx context.Context, to, subject, html string) error {
	_ = ctx
	fmt.Fprintln(os.Stdout, "=== GovTrack dev email ===")
	fmt.Fprintln(os.Stdout, "To:", to)
	fmt.Fprintln(os.Stdout, "Subject:", subject)
	fmt.Fprintln(os.Stdout, html)
	fmt.Fprintln(os.Stdout, "=== end email ===")
	return nil
}

func NewMailer(cfg *config.Config) Mailer {
	if cfg.ResendAPIKey == "" {
		slog.Info("RESEND_API_KEY empty; using ConsoleMailer")
		return &ConsoleMailer{}
	}

	return &ResendMailer{
		client: resend.NewClient(cfg.ResendAPIKey),
		from:   "GovTrack <no-reply@govtrack.local>",
	}
}

