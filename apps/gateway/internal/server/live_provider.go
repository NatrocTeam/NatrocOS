package server

import (
	"bufio"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"natrocos/internal/natrocos"
	"natrocos/internal/userstore"
)

const (
	defaultStoreDir = "/NatrocOS/store"
)

type CommandRunner interface {
	Run(name string, args ...string) ([]byte, error)
}

type execRunner struct{}

type LiveProvider struct {
	dataRoot string
	runner   CommandRunner
	storeDir string
}

type dockerContainer struct {
	ID         string
	Image      string
	Names      string
	Ports      string
	RunningFor string
	State      string
	Status     string
}

type dockerStats struct {
	ID       string
	CPUPerc  string
	MemUsage string
	Name     string
}

func NewLiveProvider() LiveProvider {
	dataRoot := os.Getenv("NATROCOS_DATA_ROOT")
	if dataRoot == "" {
		dataRoot = natrocos.DataRoot
	}

	storeDir := os.Getenv("NATROCOS_STORE_DIR")
	if storeDir == "" {
		storeDir = filepath.Join(dataRoot, "store")
	}

	return LiveProvider{
		dataRoot: dataRoot,
		runner:   execRunner{},
		storeDir: storeDir,
	}
}

func (execRunner) Run(name string, args ...string) ([]byte, error) {
	return exec.Command(name, args...).Output()
}

func (p LiveProvider) Health() natrocos.HealthResponse {
	return natrocos.HealthResponse{
		Service:  "natrocos-gateway",
		Status:   "ok",
		DataRoot: p.dataRoot,
	}
}

func (p LiveProvider) SystemSummary() (natrocos.SystemSummary, error) {
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}

	apps, err := p.Apps()
	if err != nil && !errors.Is(err, ErrRuntimeUnavailable) {
		return natrocos.SystemSummary{}, err
	}

	pools, err := p.StoragePools()
	if err != nil {
		return natrocos.SystemSummary{}, err
	}

	return natrocos.SystemSummary{
		NodeName:     hostname,
		Uptime:       readUptime(),
		DataRoot:     p.dataRoot,
		Metrics:      p.metrics(pools),
		Apps:         apps,
		StoragePools: pools,
	}, nil
}

func (p LiveProvider) Apps() ([]natrocos.AppInstance, error) {
	containers, err := p.dockerContainers()
	if err != nil {
		if commandUnavailable(err) {
			return []natrocos.AppInstance{}, nil
		}
		return nil, fmt.Errorf("%w: docker ps failed: %v", ErrRuntimeUnavailable, err)
	}

	stats := p.dockerStats()
	apps := make([]natrocos.AppInstance, 0, len(containers))
	for _, container := range containers {
		stat := stats[container.ID]
		if stat.ID == "" {
			stat = stats[container.Names]
		}

		apps = append(apps, natrocos.AppInstance{
			ID:        firstNonEmpty(container.Names, shortID(container.ID)),
			Name:      firstNonEmpty(container.Names, shortID(container.ID)),
			Status:    mapDockerState(container.State, container.Status),
			Image:     container.Image,
			Ports:     splitPorts(container.Ports),
			CPU:       parsePercent(stat.CPUPerc),
			Memory:    parseMemory(stat.MemUsage),
			UpdatedAt: firstNonEmpty(container.RunningFor, container.Status),
		})
	}

	return apps, nil
}

func (p LiveProvider) AppAction(appID string, action string) (natrocos.AppActionResponse, error) {
	if !validAppAction(action) {
		return natrocos.AppActionResponse{}, ErrInvalidAction
	}

	if action != "open" {
		if _, err := p.runner.Run("docker", action, appID); err != nil {
			if commandUnavailable(err) {
				return natrocos.AppActionResponse{}, fmt.Errorf("%w: docker command unavailable", ErrRuntimeUnavailable)
			}
			return natrocos.AppActionResponse{}, fmt.Errorf("%w: docker %s failed: %v", ErrRuntimeUnavailable, action, err)
		}
	}

	apps, err := p.Apps()
	if err != nil {
		return natrocos.AppActionResponse{}, err
	}
	for _, app := range apps {
		if app.ID == appID || app.Name == appID {
			return natrocos.AppActionResponse{
				App:  app,
				Apps: apps,
			}, nil
		}
	}

	return natrocos.AppActionResponse{}, ErrNotFound
}

func (p LiveProvider) StoreApps() ([]natrocos.StoreApp, error) {
	entries, err := os.ReadDir(p.storeDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []natrocos.StoreApp{}, nil
		}
		return nil, err
	}

	apps := make([]natrocos.StoreApp, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		content, err := os.ReadFile(filepath.Join(p.storeDir, entry.Name()))
		if err != nil {
			return nil, err
		}

		var app natrocos.StoreApp
		if err := json.Unmarshal(content, &app); err != nil {
			var list []natrocos.StoreApp
			if listErr := json.Unmarshal(content, &list); listErr != nil {
				return nil, err
			}
			for _, listApp := range list {
				listApp = normalizeStoreApp(listApp)
				if listApp.ID != "" {
					apps = append(apps, listApp)
				}
			}
			continue
		}

		app = normalizeStoreApp(app)
		if app.ID != "" {
			apps = append(apps, app)
		}
	}

	return apps, nil
}

func (p LiveProvider) StoreInstall(appID string) (natrocos.StoreInstallResponse, error) {
	appID = strings.TrimSpace(appID)
	apps, err := p.StoreApps()
	if err != nil {
		return natrocos.StoreInstallResponse{}, err
	}
	for _, app := range apps {
		if app.ID == appID {
			return p.queueStoreInstall(app)
		}
	}

	return natrocos.StoreInstallResponse{}, ErrNotFound
}

func normalizeStoreApp(app natrocos.StoreApp) natrocos.StoreApp {
	app.ID = strings.TrimSpace(app.ID)
	app.Name = strings.TrimSpace(app.Name)
	if app.Name == "" {
		app.Name = app.ID
	}
	app.Category = strings.TrimSpace(app.Category)
	app.Description = strings.TrimSpace(app.Description)
	app.Image = strings.TrimSpace(app.Image)
	if app.Tags == nil {
		app.Tags = []string{}
	}

	tags := make([]string, 0, len(app.Tags))
	for _, tag := range app.Tags {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			tags = append(tags, tag)
		}
	}
	app.Tags = tags

	return app
}

func (p LiveProvider) SetupStatus() (natrocos.SetupStatus, error) {
	status, err := p.userStore().SetupStatus()
	return status, mapUserStoreError(err)
}

func (p LiveProvider) CreateOwner(request natrocos.CreateOwnerRequest) (natrocos.UserSession, error) {
	session, err := p.userStore().CreateOwner(request)
	return session, mapUserStoreError(err)
}

func (p LiveProvider) Users(token string) ([]natrocos.UserAccount, error) {
	users, err := p.userStore().Users(token)
	return users, mapUserStoreError(err)
}

func (p LiveProvider) CreateUser(token string, request natrocos.CreateUserRequest) (natrocos.UserAccount, error) {
	account, err := p.userStore().CreateUser(token, request)
	return account, mapUserStoreError(err)
}

func (p LiveProvider) AuthLogin(request natrocos.LoginRequest) (natrocos.UserSession, error) {
	session, err := p.userStore().AuthLogin(request)
	return session, mapUserStoreError(err)
}

func (p LiveProvider) AuthRefresh(token string) (natrocos.RefreshSessionResponse, error) {
	session, err := p.userStore().AuthRefresh(token)
	return session, mapUserStoreError(err)
}

func (p LiveProvider) AuthLogout(token string) error {
	return mapUserStoreError(p.userStore().AuthLogout(token))
}

func (p LiveProvider) CurrentUser(token string) (natrocos.CurrentUser, error) {
	user, err := p.userStore().CurrentUser(token)
	return user, mapUserStoreError(err)
}

func (p LiveProvider) StoragePools() ([]natrocos.StoragePool, error) {
	used, total := diskUsage(p.dataRoot)
	return []natrocos.StoragePool{
		{
			ID:        "primary",
			Label:     "NatrocOS data root",
			MountPath: p.dataRoot,
			Used:      used,
			Total:     total,
		},
	}, nil
}

func (p LiveProvider) metrics(pools []natrocos.StoragePool) []natrocos.SystemMetric {
	return []natrocos.SystemMetric{
		{Key: "cpu", Value: cpuValue(), Series: []int{}},
		{Key: "memory", Value: memoryValue(), Series: []int{}},
		{Key: "storage", Value: storageValue(pools), Series: []int{}},
		{Key: "network", Value: networkValue(), Series: []int{}},
	}
}

func (p LiveProvider) userDatabasePath() string {
	return p.userStore().DatabasePath()
}

func (p LiveProvider) userStore() userstore.Store {
	return userstore.New(userstore.Options{DataRoot: p.dataRoot})
}

func mapUserStoreError(err error) error {
	if err == nil {
		return nil
	}

	switch {
	case errors.Is(err, userstore.ErrUnauthorized):
		return wrapProviderError(ErrUnauthorized, err)
	case errors.Is(err, userstore.ErrForbidden):
		return wrapProviderError(ErrForbidden, err)
	case errors.Is(err, userstore.ErrConflict):
		return wrapProviderError(ErrConflict, err)
	case errors.Is(err, userstore.ErrValidation):
		return wrapProviderError(ErrValidation, err)
	default:
		return err
	}
}

func wrapProviderError(providerError error, err error) error {
	message := strings.TrimSpace(err.Error())
	if message == "" || message == providerError.Error() {
		return providerError
	}
	message = strings.TrimPrefix(message, providerError.Error()+": ")
	return fmt.Errorf("%w: %s", providerError, message)
}

func (p LiveProvider) installQueueDir() string {
	return filepath.Join(p.dataRoot, filepath.FromSlash(natrocos.AppInstallQueueRelativePath))
}

func (p LiveProvider) queueStoreInstall(app natrocos.StoreApp) (natrocos.StoreInstallResponse, error) {
	jobID, err := randomID("install")
	if err != nil {
		return natrocos.StoreInstallResponse{}, err
	}

	now := time.Now().UTC().Format(time.RFC3339)
	normalizedApp := normalizeStoreApp(app)
	dataPath := filepath.Join(p.dataRoot, "apps", normalizedApp.ID)
	entry := natrocos.StoreInstallJob{
		JobID:    jobID,
		App:      normalizedApp,
		Status:   natrocos.StoreInstallJobQueued,
		QueuedAt: now,
		Plan: natrocos.StoreInstallPlan{
			DataPath:    dataPath,
			ComposePath: filepath.Join(dataPath, "compose.yaml"),
			Image:       normalizedApp.Image,
			ServiceName: composeServiceName(normalizedApp.ID),
			Tags:        normalizedApp.Tags,
		},
	}

	if err := p.writeInstallQueueEntry(entry); err != nil {
		return natrocos.StoreInstallResponse{}, err
	}

	return natrocos.StoreInstallResponse{
		AppID:    entry.App.ID,
		JobID:    entry.JobID,
		QueuedAt: entry.QueuedAt,
		Status:   entry.Status,
	}, nil
}

func (p LiveProvider) writeInstallQueueEntry(entry natrocos.StoreInstallJob) error {
	queueDir := p.installQueueDir()
	if err := os.MkdirAll(queueDir, 0o700); err != nil {
		return err
	}

	content, err := json.MarshalIndent(entry, "", "  ")
	if err != nil {
		return err
	}

	path := filepath.Join(queueDir, entry.JobID+".json")
	tempPath := path + ".tmp"
	if err := os.WriteFile(tempPath, content, natrocos.AppInstallQueueFilePermission); err != nil {
		return err
	}
	return os.Rename(tempPath, path)
}

func composeServiceName(value string) string {
	var builder strings.Builder
	lastDash := false
	for _, char := range strings.ToLower(value) {
		switch {
		case char >= 'a' && char <= 'z', char >= '0' && char <= '9':
			builder.WriteRune(char)
			lastDash = false
		case !lastDash:
			builder.WriteByte('-')
			lastDash = true
		}
	}

	name := strings.Trim(builder.String(), "-")
	if name == "" {
		return "app"
	}
	if name[0] >= '0' && name[0] <= '9' {
		return "app-" + name
	}
	return name
}

func randomID(prefix string) (string, error) {
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	return prefix + "_" + strings.TrimRight(token[:22], "_-"), nil
}

func randomToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func (p LiveProvider) dockerContainers() ([]dockerContainer, error) {
	output, err := p.runner.Run("docker", "ps", "-a", "--no-trunc", "--format", "{{json .}}")
	if err != nil {
		return nil, err
	}

	containers := []dockerContainer{}
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var container dockerContainer
		if err := json.Unmarshal([]byte(line), &container); err != nil {
			return nil, err
		}
		containers = append(containers, container)
	}

	return containers, scanner.Err()
}

func (p LiveProvider) dockerStats() map[string]dockerStats {
	output, err := p.runner.Run("docker", "stats", "--no-stream", "--format", "{{json .}}")
	if err != nil {
		return map[string]dockerStats{}
	}

	stats := map[string]dockerStats{}
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var stat dockerStats
		if err := json.Unmarshal([]byte(line), &stat); err != nil {
			continue
		}
		stats[stat.ID] = stat
		stats[stat.Name] = stat
	}

	return stats
}

func validAppAction(action string) bool {
	switch action {
	case "open", "restart", "start", "stop":
		return true
	default:
		return false
	}
}

func mapDockerState(state string, status string) string {
	normalizedState := strings.ToLower(strings.TrimSpace(state))
	normalizedStatus := strings.ToLower(status)
	switch {
	case normalizedState == "running":
		return "running"
	case normalizedState == "paused" || normalizedState == "restarting":
		return "updating"
	case strings.Contains(normalizedStatus, "error") || normalizedState == "dead":
		return "error"
	default:
		return "stopped"
	}
}

func splitPorts(value string) []string {
	if strings.TrimSpace(value) == "" {
		return []string{}
	}

	parts := strings.Split(value, ",")
	ports := make([]string, 0, len(parts))
	for _, part := range parts {
		port := strings.TrimSpace(part)
		if port != "" {
			ports = append(ports, port)
		}
	}
	return ports
}

func parsePercent(value string) float64 {
	value = strings.TrimSpace(strings.TrimSuffix(value, "%"))
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0
	}
	return parsed
}

func parseMemory(value string) string {
	if value == "" {
		return "0 B"
	}
	return strings.TrimSpace(strings.Split(value, "/")[0])
}

func readUptime() string {
	content, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return "unknown"
	}

	fields := strings.Fields(string(content))
	if len(fields) == 0 {
		return "unknown"
	}

	seconds, err := strconv.ParseFloat(fields[0], 64)
	if err != nil {
		return "unknown"
	}
	return formatDuration(time.Duration(seconds) * time.Second)
}

func formatDuration(duration time.Duration) string {
	days := int(duration.Hours()) / 24
	hours := int(duration.Hours()) % 24
	if days > 0 {
		return fmt.Sprintf("%dd %dh", days, hours)
	}
	return fmt.Sprintf("%dh %dm", hours, int(duration.Minutes())%60)
}

func cpuValue() string {
	if runtime.GOOS != "linux" {
		return "unknown"
	}

	first, err := readCPUStat()
	if err != nil {
		return "unknown"
	}
	time.Sleep(120 * time.Millisecond)
	second, err := readCPUStat()
	if err != nil {
		return "unknown"
	}

	idle := second.idle - first.idle
	total := second.total - first.total
	if total <= 0 {
		return "unknown"
	}
	usage := (1 - (float64(idle) / float64(total))) * 100
	return fmt.Sprintf("%.1f%%", usage)
}

type cpuStat struct {
	idle  uint64
	total uint64
}

func readCPUStat() (cpuStat, error) {
	content, err := os.ReadFile("/proc/stat")
	if err != nil {
		return cpuStat{}, err
	}

	lines := strings.Split(string(content), "\n")
	fields := strings.Fields(lines[0])
	if len(fields) < 5 || fields[0] != "cpu" {
		return cpuStat{}, errors.New("invalid /proc/stat cpu line")
	}

	var total uint64
	values := make([]uint64, 0, len(fields)-1)
	for _, field := range fields[1:] {
		value, err := strconv.ParseUint(field, 10, 64)
		if err != nil {
			return cpuStat{}, err
		}
		values = append(values, value)
		total += value
	}

	return cpuStat{idle: values[3], total: total}, nil
}

func memoryValue() string {
	values, err := readMeminfo()
	if err != nil {
		return "unknown"
	}
	total := values["MemTotal"]
	available := values["MemAvailable"]
	if total == 0 {
		return "unknown"
	}

	used := total - available
	return formatBytes(used * 1024)
}

func readMeminfo() (map[string]uint64, error) {
	content, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return nil, err
	}

	values := map[string]uint64{}
	scanner := bufio.NewScanner(strings.NewReader(string(content)))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 2 {
			continue
		}
		key := strings.TrimSuffix(fields[0], ":")
		value, err := strconv.ParseUint(fields[1], 10, 64)
		if err != nil {
			continue
		}
		values[key] = value
	}
	return values, scanner.Err()
}

func networkValue() string {
	content, err := os.ReadFile("/proc/net/dev")
	if err != nil {
		return "unknown"
	}

	var rx uint64
	var tx uint64
	scanner := bufio.NewScanner(strings.NewReader(string(content)))
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.Contains(line, ":") {
			continue
		}
		parts := strings.Split(line, ":")
		iface := strings.TrimSpace(parts[0])
		if iface == "lo" {
			continue
		}
		fields := strings.Fields(parts[1])
		if len(fields) < 16 {
			continue
		}
		rxValue, _ := strconv.ParseUint(fields[0], 10, 64)
		txValue, _ := strconv.ParseUint(fields[8], 10, 64)
		rx += rxValue
		tx += txValue
	}

	if rx == 0 && tx == 0 {
		return "unknown"
	}
	return fmt.Sprintf("rx %s / tx %s", formatBytes(rx), formatBytes(tx))
}

func storageValue(pools []natrocos.StoragePool) string {
	if len(pools) == 0 {
		return "unknown"
	}
	return pools[0].Used
}

func diskUsage(path string) (string, string) {
	if _, err := os.Stat(path); err != nil {
		return "unavailable", "unavailable"
	}

	output, err := exec.Command("df", "-k", path).Output()
	if err != nil {
		return "available", "unknown"
	}
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) < 2 {
		return "available", "unknown"
	}
	fields := strings.Fields(lines[1])
	if len(fields) < 4 {
		return "available", "unknown"
	}

	total, _ := strconv.ParseUint(fields[1], 10, 64)
	used, _ := strconv.ParseUint(fields[2], 10, 64)
	return formatBytes(used * 1024), formatBytes(total * 1024)
}

func commandUnavailable(err error) bool {
	var pathErr *exec.Error
	return errors.As(err, &pathErr)
}

func shortID(id string) string {
	if len(id) > 12 {
		return id[:12]
	}
	return id
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}

	divisor := float64(unit)
	value := float64(bytes) / divisor
	for _, suffix := range []string{"KB", "MB", "GB", "TB", "PB"} {
		if value < unit {
			return fmt.Sprintf("%.2f %s", value, suffix)
		}
		value /= divisor
	}
	return fmt.Sprintf("%.2f EB", value)
}

func localAddresses() []string {
	addresses, err := net.InterfaceAddrs()
	if err != nil {
		return []string{}
	}

	values := []string{}
	for _, address := range addresses {
		ipNet, ok := address.(*net.IPNet)
		if !ok || ipNet.IP.IsLoopback() || ipNet.IP.To4() == nil {
			continue
		}
		values = append(values, ipNet.IP.String())
	}
	return values
}
