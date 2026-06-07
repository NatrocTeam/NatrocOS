package server

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"natrocos/internal/natrocos"
	"natrocos/internal/userstore"
)

const serviceName = "natrocos-user"

type Options struct {
	DataRoot string
}

type Provider struct {
	store userstore.Store
}

func New(options Options) http.Handler {
	provider := NewProvider(options)

	mux := http.NewServeMux()
	mux.HandleFunc(natrocos.RouteHealth, handleHealth(provider))
	mux.HandleFunc(natrocos.RouteSetupStatus, handleSetupStatus(provider))
	mux.HandleFunc(natrocos.RouteSetupOwner, handleSetupOwner(provider))
	mux.HandleFunc(natrocos.RouteAuthLogin, handleAuthLogin(provider))
	mux.HandleFunc(natrocos.RouteAuthRefresh, handleAuthRefresh(provider))
	mux.HandleFunc(natrocos.RouteAuthLogout, handleAuthLogout(provider))
	mux.HandleFunc(natrocos.RouteUsers, handleUsers(provider))
	mux.HandleFunc(natrocos.RouteCurrentUser, handleCurrentUser(provider))
	return mux
}

func NewProvider(options Options) Provider {
	return Provider{
		store: userstore.New(userstore.Options{DataRoot: options.DataRoot}),
	}
}

func (p Provider) Health() natrocos.HealthResponse {
	return natrocos.HealthResponse{
		Service:  serviceName,
		Status:   "ok",
		DataRoot: p.store.DataRoot(),
	}
}

func handleHealth(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		writeJSON(w, http.StatusOK, provider.Health())
	}
}

func handleSetupStatus(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.store.SetupStatus()
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	}
}

func handleSetupOwner(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodPost) {
			return
		}

		var request natrocos.CreateOwnerRequest
		if !readRequestJSON(w, r, &request) {
			return
		}

		payload, err := provider.store.CreateOwner(request)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, payload)
	}
}

func handleAuthLogin(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodPost) {
			return
		}

		var request natrocos.LoginRequest
		if !readRequestJSON(w, r, &request) {
			return
		}

		payload, err := provider.store.AuthLogin(request)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	}
}

func handleAuthRefresh(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodPost) {
			return
		}

		payload, err := provider.store.AuthRefresh(bearerToken(r))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	}
}

func handleAuthLogout(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodPost) {
			return
		}

		if err := provider.store.AuthLogout(bearerToken(r)); err != nil {
			writeError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func handleCurrentUser(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.store.CurrentUser(bearerToken(r))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	}
}

func handleUsers(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			payload, err := provider.store.Users(bearerToken(r))
			if err != nil {
				writeError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, payload)
		case http.MethodPost:
			var request natrocos.CreateUserRequest
			if !readRequestJSON(w, r, &request) {
				return
			}

			payload, err := provider.store.CreateUser(bearerToken(r), request)
			if err != nil {
				writeError(w, err)
				return
			}
			writeJSON(w, http.StatusCreated, payload)
		default:
			w.Header().Set("Allow", "GET, POST")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func allowMethod(w http.ResponseWriter, r *http.Request, method string) bool {
	if r.Method == method {
		return true
	}

	w.Header().Set("Allow", method)
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	return false
}

func readRequestJSON(w http.ResponseWriter, r *http.Request, out any) bool {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(out); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "invalid json request",
		})
		return false
	}
	return true
}

func bearerToken(r *http.Request) string {
	value := r.Header.Get("Authorization")
	token, ok := strings.CutPrefix(value, "Bearer ")
	if !ok {
		return ""
	}
	return strings.TrimSpace(token)
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, userstore.ErrUnauthorized):
		status = http.StatusUnauthorized
	case errors.Is(err, userstore.ErrForbidden):
		status = http.StatusForbidden
	case errors.Is(err, userstore.ErrConflict):
		status = http.StatusConflict
	case errors.Is(err, userstore.ErrValidation):
		status = http.StatusUnprocessableEntity
	}

	writeJSON(w, status, map[string]string{
		"error": err.Error(),
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write json response: %v", err)
	}
}

func ListenAndServe(addr string, options Options) error {
	server := &http.Server{
		Addr:              addr,
		Handler:           New(options),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("%s listening on http://%s", serviceName, addr)
	return server.ListenAndServe()
}

func DefaultAddr() string {
	return "127.0.0.1:8082"
}

func DataRootFromEnv() string {
	return os.Getenv("NATROCOS_DATA_ROOT")
}
