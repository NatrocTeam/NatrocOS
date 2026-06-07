package natrocos

const DataRoot = "/NatrocOS"

const (
	RoleOwner = "owner"
	RoleUser  = "user"
)

const (
	RouteHealth                    = "/health"
	RouteSystem                    = "/api/system/summary"
	RouteApps                      = "/api/apps"
	RouteAppAction                 = "POST /api/apps/{id}/{action}"
	RouteStore                     = "/api/store"
	RouteStoreInstall              = "POST /api/store/{id}/install"
	RouteSetupStatus               = "/api/setup/status"
	RouteSetupOwner                = "POST /api/setup/owner"
	RouteAuthLogin                 = "POST /api/auth/login"
	RouteAuthRefresh               = "POST /api/auth/refresh"
	RouteAuthLogout                = "POST /api/auth/logout"
	RouteUsers                     = "/api/users"
	RouteCurrentUser               = "/api/users/me"
	RouteStoragePools              = "/api/storage/pools"
	RouteAppManagementInstallQueue = "/api/app-management/install-queue"
	RouteAppManagementProcessQueue = "POST /api/app-management/install-queue/process"
	RouteAppManagementDeployJob    = "POST /api/app-management/install-queue/{id}/deploy"
)

const (
	AppInstallQueueRelativePath   = "app-management/install-queue"
	AppInstallQueueFilePermission = 0o600
)

const (
	StoreInstallJobQueued   = "queued"
	StoreInstallJobReady    = "ready"
	StoreInstallJobFailed   = "failed"
	StoreInstallJobDeployed = "deployed"
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
	AppID    string `json:"appId"`
	JobID    string `json:"jobId"`
	QueuedAt string `json:"queuedAt"`
	Status   string `json:"status"`
}

type StoreInstallJob struct {
	JobID       string           `json:"jobId"`
	App         StoreApp         `json:"app"`
	Status      string           `json:"status"`
	QueuedAt    string           `json:"queuedAt"`
	StartedAt   string           `json:"startedAt,omitempty"`
	CompletedAt string           `json:"completedAt,omitempty"`
	Error       string           `json:"error,omitempty"`
	Plan        StoreInstallPlan `json:"plan"`
}

type StoreInstallPlan struct {
	DataPath    string   `json:"dataPath"`
	ComposePath string   `json:"composePath"`
	Image       string   `json:"image"`
	ServiceName string   `json:"serviceName"`
	Tags        []string `json:"tags"`
}

type StoreInstallQueueProcessResponse struct {
	Processed int               `json:"processed"`
	Ready     int               `json:"ready"`
	Failed    int               `json:"failed"`
	Jobs      []StoreInstallJob `json:"jobs"`
}

type StoreInstallDeployRequest struct {
	DryRun  bool `json:"dryRun"`
	Pull    bool `json:"pull"`
	Confirm bool `json:"confirm"`
}

type StoreInstallDeployResponse struct {
	Job     StoreInstallJob `json:"job"`
	DryRun  bool            `json:"dryRun"`
	Command []string        `json:"command"`
	Output  string          `json:"output,omitempty"`
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

type CreateUserRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type UserAccount struct {
	UserID      string `json:"userId"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
	CreatedAt   string `json:"createdAt,omitempty"`
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
