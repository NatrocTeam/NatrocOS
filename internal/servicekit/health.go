package servicekit

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"natrocos/internal/natrocos"
)

type Config struct {
	ServiceName string
	EnvAddr     string
	DefaultAddr string
}

func NewHealthHandler(serviceName string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(natrocos.RouteHealth, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		writeJSON(w, http.StatusOK, natrocos.HealthResponse{
			Service:  serviceName,
			Status:   "ok",
			DataRoot: natrocos.DataRoot,
		})
	})

	return mux
}

func ListenAndServe(config Config) error {
	addr := os.Getenv(config.EnvAddr)
	if addr == "" {
		addr = config.DefaultAddr
	}

	server := &http.Server{
		Addr:              addr,
		Handler:           NewHealthHandler(config.ServiceName),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("%s listening on http://%s", config.ServiceName, addr)
	return server.ListenAndServe()
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write json response: %v", err)
	}
}
