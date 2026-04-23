package feeds

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type SocrataClient struct {
	baseURL string
	http    *http.Client
}

func NewSocrataClient(baseURL string) *SocrataClient {
	return &SocrataClient{
		baseURL: baseURL,
		http: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *SocrataClient) BaseURL() string {
	return c.baseURL
}

func (c *SocrataClient) Fetch(ctx context.Context, params map[string]string) ([]map[string]any, error) {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return nil, err
	}
	q := u.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	try := func() ([]map[string]any, int, error) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if err != nil {
			return nil, 0, err
		}
		resp, err := c.http.Do(req)
		if err != nil {
			return nil, 0, err
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, resp.StatusCode, err
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return nil, resp.StatusCode, fmt.Errorf("socrata status %d", resp.StatusCode)
		}

		var out []map[string]any
		if err := json.Unmarshal(body, &out); err != nil {
			return nil, resp.StatusCode, err
		}
		return out, resp.StatusCode, nil
	}

	// Retries on 5xx (1s, 3s)
	rows, status, err := try()
	if err == nil {
		return rows, nil
	}
	if status >= 500 && status <= 599 {
		select {
		case <-time.After(1 * time.Second):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		rows, status, err = try()
		if err == nil {
			return rows, nil
		}
		if status >= 500 && status <= 599 {
			select {
			case <-time.After(3 * time.Second):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
			rows, _, err = try()
			return rows, err
		}
	}

	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return nil, err
	}
	return nil, err
}

