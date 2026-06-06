package natrocos

const DataRoot = "/NatrocOS"

const (
	RouteHealth       = "/health"
	RouteSystem       = "/api/system/summary"
	RouteApps         = "/api/apps"
	RouteAppAction    = "POST /api/apps/{id}/{action}"
	RouteStore        = "/api/store"
	RouteStoreInstall = "POST /api/store/{id}/install"
	RouteSetupStatus  = "/api/setup/status"
	RouteSetupOwner   = "POST /api/setup/owner"
	RouteAuthLogin    = "POST /api/auth/login"
	RouteAuthRefresh  = "POST /api/auth/refresh"
	RouteAuthLogout   = "POST /api/auth/logout"
	RouteCurrentUser  = "/api/users/me"
	RouteStoragePools = "/api/storage/pools"
)

type HealthResponse struct {
	Service  string `json:"service"`
	Status   string `json:"status"`
	DataRoot string `json:"dataRoot,omitempty"`
}

type ServiceStatus struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Detail string `json:"detail,omitempty"`
}

type SystemMetric struct {
	Key    string `json:"key"`
	Value  string `json:"value"`
	Series []int  `json:"series"`
}

type StoragePool struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	MountPath string `json:"mountPath"`
	Used      string `json:"used"`
	Total     string `json:"total"`
}

type SystemSummary struct {
	NodeName     string         `json:"nodeName"`
	Uptime       string         `json:"uptime"`
	DataRoot     string         `json:"dataRoot"`
	Metrics      []SystemMetric `json:"metrics"`
	Apps         []AppInstance  `json:"apps"`
	StoragePools []StoragePool  `json:"storagePools"`
}

type AppInstance struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Status    string   `json:"status"`
	Image     string   `json:"image"`
	Ports     []string `json:"ports"`
	CPU       float64  `json:"cpu"`
	Memory    string   `json:"memory"`
	UpdatedAt string   `json:"updatedAt"`
}

type AppActionRequest struct {
	Action string `json:"action"`
}

type AppActionResponse struct {
	App  AppInstance   `json:"app"`
	Apps []AppInstance `json:"apps"`
}

type StoreApp struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Description string   `json:"description"`
	Image       string   `json:"image"`
	Tags        []string `json:"tags"`
	Recommended bool     `json:"recommended"`
}

type StoreInstallRequest struct {
	AppID string `json:"appId"`
}

type StoreInstallResponse struct {
	AppID  string `json:"appId"`
	Status string `json:"status"`
}

type SetupStatus struct {
	HasOwner      bool `json:"hasOwner"`
	RequiresSetup bool `json:"requiresSetup"`
}

type CreateOwnerRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type UserSession struct {
	UserID      string `json:"userId"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
	AccessToken string `json:"accessToken"`
	ExpiresAt   string `json:"expiresAt"`
}

type CurrentUser struct {
	UserID      string `json:"userId"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

type RefreshSessionResponse struct {
	AccessToken string `json:"accessToken"`
	ExpiresAt   string `json:"expiresAt"`
}
