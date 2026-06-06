package server

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"natrocos/internal/natrocos"
)

type Provider interface {
	AppAction(appID string, action string) (natrocos.AppActionResponse, error)
	Apps() ([]natrocos.AppInstance, error)
	AuthLogin(request natrocos.LoginRequest) (natrocos.UserSession, error)
	AuthLogout(token string) error
	AuthRefresh(token string) (natrocos.RefreshSessionResponse, error)
	CreateOwner(request natrocos.CreateOwnerRequest) (natrocos.UserSession, error)
	CurrentUser(token string) (natrocos.CurrentUser, error)
	Health() natrocos.HealthResponse
	SetupStatus() (natrocos.SetupStatus, error)
	StoragePools() ([]natrocos.StoragePool, error)
	StoreApps() ([]natrocos.StoreApp, error)
	StoreInstall(appID string) (natrocos.StoreInstallResponse, error)
	SystemSummary() (natrocos.SystemSummary, error)
}

var (
	ErrInvalidAction      = errors.New("invalid action")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrNotFound           = errors.New("resource not found")
	ErrConflict           = errors.New("resource conflict")
	ErrValidation         = errors.New("validation failed")
	ErrNotImplemented     = errors.New("not implemented")
	ErrRuntimeUnavailable = errors.New("runtime unavailable")
)

func New() http.Handler {
	return NewWithProvider(NewLiveProvider())
}

func NewWithProvider(provider Provider) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(natrocos.RouteHealth, handleHealth(provider))
	mux.HandleFunc(natrocos.RouteSystem, handleSystemSummary(provider))
	mux.HandleFunc(natrocos.RouteApps, handleApps(provider))
	mux.HandleFunc(natrocos.RouteAppAction, handleAppAction(provider))
	mux.HandleFunc(natrocos.RouteStore, handleStore(provider))
	mux.HandleFunc(natrocos.RouteStoreInstall, handleStoreInstall(provider))
	mux.HandleFunc(natrocos.RouteSetupStatus, handleSetupStatus(provider))
	mux.HandleFunc(natrocos.RouteSetupOwner, handleSetupOwner(provider))
	mux.HandleFunc(natrocos.RouteAuthLogin, handleAuthLogin(provider))
	mux.HandleFunc(natrocos.RouteAuthRefresh, handleAuthRefresh(provider))
	mux.HandleFunc(natrocos.RouteAuthLogout, handleAuthLogout(provider))
	mux.HandleFunc(natrocos.RouteCurrentUser, handleCurrentUser(provider))
	mux.HandleFunc(natrocos.RouteStoragePools, handleStoragePools(provider))
	return mux
}

func handleHealth(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		writeJSON(w, http.StatusOK, provider.Health())
	}
}

func handleSystemSummary(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.SystemSummary()
		if err != nil {
			writeError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, payload)
	}
}

func handleApps(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.Apps()
		if err != nil {
			writeError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, payload)
	}
}

func handleAppAction(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		appID := r.PathValue("id")
		action := r.PathValue("action")

		payload, err := provider.AppAction(appID, action)
		if err != nil {
			writeError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, payload)
	}
}

func handleStore(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.StoreApps()
		if err != nil {
			writeError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, payload)
	}
}

func handleStoreInstall(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		appID := r.PathValue("id")

		payload, err := provider.StoreInstall(appID)
		if err != nil {
			writeError(w, err)
			return
		}

		writeJSON(w, http.StatusAccepted, payload)
	}
}

func handleSetupStatus(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.SetupStatus()
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

		payload, err := provider.CreateOwner(request)
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

		payload, err := provider.AuthLogin(request)
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

		payload, err := provider.AuthRefresh(bearerToken(r))
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

		if err := provider.AuthLogout(bearerToken(r)); err != nil {
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

		payload, err := provider.CurrentUser(bearerToken(r))
		if err != nil {
			writeError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, payload)
	}
}

func handleStoragePools(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.StoragePools()
		if err != nil {
			writeError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, payload)
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
	case errors.Is(err, ErrInvalidAction):
		status = http.StatusBadRequest
	case errors.Is(err, ErrUnauthorized):
		status = http.StatusUnauthorized
	case errors.Is(err, ErrNotFound):
		status = http.StatusNotFound
	case errors.Is(err, ErrConflict):
		status = http.StatusConflict
	case errors.Is(err, ErrValidation):
		status = http.StatusUnprocessableEntity
	case errors.Is(err, ErrNotImplemented):
		status = http.StatusNotImplemented
	case errors.Is(err, ErrRuntimeUnavailable):
		status = http.StatusServiceUnavailable
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
