package server

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
)

type Options struct {
	APITargetURL string
	StaticDir    string
}

func New(options Options) (http.Handler, error) {
	apiTarget, err := url.Parse(options.APITargetURL)
	if err != nil {
		return nil, err
	}

	mux := http.NewServeMux()
	proxy := httputil.NewSingleHostReverseProxy(apiTarget)
	mux.Handle("/api/", proxy)
	mux.Handle("/health", proxy)
	mux.Handle("/", spaHandler{staticDir: options.StaticDir})
	return mux, nil
}

type spaHandler struct {
	staticDir string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	requestPath := path.Clean("/" + r.URL.Path)
	localPath := filepath.Join(h.staticDir, filepath.FromSlash(strings.TrimPrefix(requestPath, "/")))
	if info, err := os.Stat(localPath); err == nil && !info.IsDir() {
		http.ServeFile(w, r, localPath)
		return
	}

	indexPath := filepath.Join(h.staticDir, "index.html")
	if _, err := os.Stat(indexPath); err != nil {
		http.Error(w, "web ui is not built", http.StatusServiceUnavailable)
		return
	}

	http.ServeFile(w, r, indexPath)
}
