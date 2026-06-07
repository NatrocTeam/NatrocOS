package server

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"natrocos/internal/natrocos"
)

const (
	defaultAppManagementURL = "http://127.0.0.1:8081"
	defaultUserURL          = "http://127.0.0.1:8082"
	defaultStorageURL       = "http://127.0.0.1:8083"
)

type Provider interface {
	AppAction(appID string, action string) (natrocos.AppActionResponse, error)
	Apps() ([]natrocos.AppInstance, error)
	AuthLogin(request natrocos.LoginRequest) (natrocos.UserSession, error)
	AuthLogout(token string) error
	AuthRefresh(token string) (natrocos.RefreshSessionResponse, error)
	CreateOwner(request natrocos.CreateOwnerRequest) (natrocos.UserSession, error)
	CreateUser(token string, request natrocos.CreateUserRequest) (natrocos.UserAccount, error)
	CurrentUser(token string) (natrocos.CurrentUser, error)
	Health() natrocos.HealthResponse
	SetupStatus() (natrocos.SetupStatus, error)
	StoragePools() ([]natrocos.StoragePool, error)
	StoreApps() ([]natrocos.StoreApp, error)
	StoreInstall(appID string) (natrocos.StoreInstallResponse, error)
	SystemSummary() (natrocos.SystemSummary, error)
	Users(token string) ([]natrocos.UserAccount, error)
}

var (
	ErrInvalidAction      = errors.New("invalid action")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrNotFound           = errors.New("resource not found")
	ErrConflict           = errors.New("resource conflict")
	ErrForbidden          = errors.New("permission denied")
	ErrValidation         = errors.New("validation failed")
	ErrNotImplemented     = errors.New("not implemented")
	ErrRuntimeUnavailable = errors.New("runtime unavailable")
)

func New() http.Handler {
	return NewWithProviderAndOptions(NewLiveProvider(), Options{
		AppManagementURL: firstNonEmpty(os.Getenv("NATROCOS_APP_MANAGEMENT_INTERNAL_URL"), defaultAppManagementURL),
		UserURL:          firstNonEmpty(os.Getenv("NATROCOS_USER_INTERNAL_URL"), defaultUserURL),
		StorageURL:       firstNonEmpty(os.Getenv("NATROCOS_STORAGE_INTERNAL_URL"), defaultStorageURL),
	})
}

type Options struct {
	AppManagementURL string
	StorageURL       string
	UserURL          string
}

func NewWithProvider(provider Provider) http.Handler {
	return NewWithProviderAndOptions(provider, Options{})
}

func NewWithProviderAndOptions(provider Provider, options Options) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(natrocos.RouteHealth, handleHealth(provider))
	mux.HandleFunc(natrocos.RouteServices, handleServiceStatuses(provider, options))
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
	mux.HandleFunc(natrocos.RouteUsers, handleUsers(provider))
	mux.HandleFunc(natrocos.RouteCurrentUser, handleCurrentUser(provider))
	mux.HandleFunc(natrocos.RouteStoragePools, handleStoragePools(provider))
	if strings.TrimSpace(options.StorageURL) != "" {
		mux.Handle("/api/storage/", newServiceProxy(options.StorageURL, "storage"))
	}
	if strings.TrimSpace(options.AppManagementURL) != "" {
		mux.Handle("/api/app-management/", newServiceProxy(options.AppManagementURL, "app-management"))
	}
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

func handleServiceStatuses(provider Provider, options Options) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		writeJSON(w, http.StatusOK, serviceStatuses(provider, options))
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

func serviceStatuses(provider Provider, options Options) []natrocos.ServiceStatus {
	gatewayHealth := provider.Health()
	statuses := []natrocos.ServiceStatus{
		{
			Name:   "gateway",
			Status: firstNonEmpty(gatewayHealth.Status, "ok"),
			Detail: strings.TrimSpace(firstNonEmpty(
				gatewayHealth.DataRoot,
				"internal API gateway",
			)),
		},
	}

	probes := []struct {
		name      string
		targetURL string
	}{
		{name: "app-management", targetURL: options.AppManagementURL},
		{name: "user", targetURL: options.UserURL},
		{name: "storage", targetURL: options.StorageURL},
	}

	client := &http.Client{Timeout: 900 * time.Millisecond}
	for _, probe := range probes {
		statuses = append(statuses, probeServiceHealth(client, probe.name, probe.targetURL))
	}

	return statuses
}

func probeServiceHealth(client *http.Client, name string, targetURL string) natrocos.ServiceStatus {
	target, err := url.Parse(strings.TrimSpace(targetURL))
	if err != nil || target.Scheme == "" || target.Host == "" {
		return natrocos.ServiceStatus{
			Name:   name,
			Status: "misconfigured",
			Detail: "invalid upstream",
		}
	}

	target.Path = strings.TrimRight(target.Path, "/") + natrocos.RouteHealth
	target.RawQuery = ""
	request, err := http.NewRequest(http.MethodGet, target.String(), nil)
	if err != nil {
		return natrocos.ServiceStatus{
			Name:   name,
			Status: "misconfigured",
			Detail: err.Error(),
		}
	}

	response, err := client.Do(request)
	if err != nil {
		return natrocos.ServiceStatus{
			Name:   name,
			Status: "unavailable",
			Detail: compactDetail(err.Error()),
		}
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return natrocos.ServiceStatus{
			Name:   name,
			Status: "unavailable",
			Detail: response.Status,
		}
	}

	var health natrocos.HealthResponse
	if err := json.NewDecoder(response.Body).Decode(&health); err != nil {
		return natrocos.ServiceStatus{
			Name:   name,
			Status: "ok",
			Detail: response.Status,
		}
	}

	return natrocos.ServiceStatus{
		Name:   firstNonEmpty(strings.TrimPrefix(health.Service, "natrocos-"), name),
		Status: firstNonEmpty(health.Status, "ok"),
		Detail: firstNonEmpty(health.DataRoot, response.Status),
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

func handleUsers(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			payload, err := provider.Users(bearerToken(r))
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

			payload, err := provider.CreateUser(bearerToken(r), request)
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

func newServiceProxy(targetURL string, service string) http.Handler {
	target, err := url.Parse(targetURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			writeJSON(w, http.StatusBadGateway, map[string]string{
				"error": "invalid " + service + " upstream",
			})
		})
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": service + " upstream unavailable",
		})
	}
	return proxy
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
	case errors.Is(err, ErrForbidden):
		status = http.StatusForbidden
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

func compactDetail(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 140 {
		return value
	}
	return value[:137] + "..."
}
