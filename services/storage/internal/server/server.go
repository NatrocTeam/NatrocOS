package server

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"natrocos/internal/natrocos"
)

const serviceName = "natrocos-storage"

type Options struct {
	DataRoot   string
	MountsPath string
	Runner     CommandRunner
}

type CommandRunner interface {
	Run(name string, args ...string) ([]byte, error)
}

type execRunner struct{}

type Provider struct {
	dataRoot   string
	mountsPath string
	runner     CommandRunner
}

type lsblkOutput struct {
	BlockDevices []lsblkDevice `json:"blockdevices"`
}

type lsblkDevice struct {
	Children    []lsblkDevice   `json:"children"`
	Filesystem  string          `json:"fstype"`
	Label       string          `json:"label"`
	Model       string          `json:"model"`
	Mountpoints []any           `json:"mountpoints"`
	Name        string          `json:"name"`
	Path        string          `json:"path"`
	Removable   json.RawMessage `json:"rm"`
	Serial      string          `json:"serial"`
	Size        uint64          `json:"size"`
	Type        string          `json:"type"`
}

func New(options Options) http.Handler {
	provider := NewProvider(options)

	mux := http.NewServeMux()
	mux.HandleFunc(natrocos.RouteHealth, handleHealth(provider))
	mux.HandleFunc(natrocos.RouteStorageDisks, handleStorageDisks(provider))
	mux.HandleFunc(natrocos.RouteStorageMounts, handleStorageMounts(provider))
	mux.HandleFunc(natrocos.RouteStoragePools, handleStoragePools(provider))
	return mux
}

func NewProvider(options Options) Provider {
	dataRoot := strings.TrimSpace(options.DataRoot)
	if dataRoot == "" {
		dataRoot = natrocos.DataRoot
	}
	mountsPath := strings.TrimSpace(options.MountsPath)
	if mountsPath == "" {
		mountsPath = "/proc/mounts"
	}
	if options.Runner == nil {
		options.Runner = execRunner{}
	}

	return Provider{dataRoot: dataRoot, mountsPath: mountsPath, runner: options.Runner}
}

func (execRunner) Run(name string, args ...string) ([]byte, error) {
	return exec.Command(name, args...).Output()
}

func (p Provider) Health() natrocos.HealthResponse {
	return natrocos.HealthResponse{
		Service:  serviceName,
		Status:   "ok",
		DataRoot: p.dataRoot,
	}
}

func (p Provider) Disks() ([]natrocos.StorageDisk, error) {
	output, err := p.runner.Run(
		"lsblk",
		"--json",
		"--bytes",
		"--output",
		"NAME,PATH,TYPE,SIZE,FSTYPE,LABEL,MODEL,SERIAL,RM,MOUNTPOINTS",
	)
	if err != nil {
		if commandUnavailable(err) {
			return []natrocos.StorageDisk{}, nil
		}
		return nil, fmt.Errorf("lsblk failed: %w", err)
	}

	var payload lsblkOutput
	if err := json.Unmarshal(output, &payload); err != nil {
		return nil, err
	}

	disks := make([]natrocos.StorageDisk, 0, len(payload.BlockDevices))
	for _, device := range payload.BlockDevices {
		appendDisk(&disks, device, "")
	}
	return disks, nil
}

func (p Provider) Mounts() ([]natrocos.StorageMount, error) {
	file, err := os.Open(p.mountsPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []natrocos.StorageMount{}, nil
		}
		return nil, err
	}
	defer file.Close()

	mounts := []natrocos.StorageMount{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 4 {
			continue
		}

		source := unescapeProcField(fields[0])
		target := unescapeProcField(fields[1])
		filesystem := unescapeProcField(fields[2])
		options := splitOptions(fields[3])
		used, total := p.mountUsage(target)
		mounts = append(mounts, natrocos.StorageMount{
			ID:         mountID(source, target),
			Source:     source,
			Target:     target,
			Filesystem: filesystem,
			Options:    options,
			Used:       used,
			Total:      total,
		})
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	sort.Slice(mounts, func(left int, right int) bool {
		return mounts[left].Target < mounts[right].Target
	})
	return mounts, nil
}

func (p Provider) Pools() []natrocos.StoragePool {
	used, total := p.mountUsage(p.dataRoot)
	return []natrocos.StoragePool{
		{
			ID:        "primary",
			Label:     "NatrocOS data root",
			MountPath: p.dataRoot,
			Used:      firstNonEmpty(used, "available"),
			Total:     firstNonEmpty(total, "unknown"),
		},
	}
}

func appendDisk(disks *[]natrocos.StorageDisk, device lsblkDevice, parent string) {
	name := strings.TrimSpace(device.Name)
	path := strings.TrimSpace(device.Path)
	id := firstNonEmpty(path, name)
	mountpoints := cleanMountpoints(device.Mountpoints)
	*disks = append(*disks, natrocos.StorageDisk{
		ID:          id,
		Name:        name,
		Path:        path,
		Parent:      parent,
		Type:        strings.TrimSpace(device.Type),
		Size:        device.Size,
		Filesystem:  strings.TrimSpace(device.Filesystem),
		Label:       strings.TrimSpace(device.Label),
		Model:       strings.TrimSpace(device.Model),
		Serial:      strings.TrimSpace(device.Serial),
		Mountpoints: mountpoints,
		Removable:   parseRemovable(device.Removable),
	})

	nextParent := id
	for _, child := range device.Children {
		appendDisk(disks, child, nextParent)
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

func handleStorageDisks(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.Disks()
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	}
}

func handleStorageMounts(provider Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		payload, err := provider.Mounts()
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
		writeJSON(w, http.StatusOK, provider.Pools())
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

func writeError(w http.ResponseWriter, err error) {
	writeJSON(w, http.StatusInternalServerError, map[string]string{
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

func (p Provider) mountUsage(path string) (string, string) {
	if _, err := os.Stat(path); err != nil {
		return "", ""
	}

	output, err := p.runner.Run("df", "-kP", path)
	if err != nil {
		return "", ""
	}
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) < 2 {
		return "", ""
	}
	fields := strings.Fields(lines[1])
	if len(fields) < 4 {
		return "", ""
	}

	total, _ := strconv.ParseUint(fields[1], 10, 64)
	used, _ := strconv.ParseUint(fields[2], 10, 64)
	return formatBytes(used * 1024), formatBytes(total * 1024)
}

func cleanMountpoints(values []any) []string {
	if values == nil {
		return []string{}
	}

	mountpoints := make([]string, 0, len(values))
	for _, value := range values {
		text, ok := value.(string)
		if !ok {
			continue
		}
		text = strings.TrimSpace(text)
		if text != "" {
			mountpoints = append(mountpoints, text)
		}
	}
	return mountpoints
}

func splitOptions(value string) []string {
	if strings.TrimSpace(value) == "" {
		return []string{}
	}

	parts := strings.Split(value, ",")
	options := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			options = append(options, part)
		}
	}
	return options
}

func unescapeProcField(value string) string {
	var builder strings.Builder
	for index := 0; index < len(value); index++ {
		if value[index] != '\\' || index+3 >= len(value) {
			builder.WriteByte(value[index])
			continue
		}

		octal := value[index+1 : index+4]
		decoded, err := strconv.ParseInt(octal, 8, 32)
		if err != nil {
			builder.WriteByte(value[index])
			continue
		}
		builder.WriteRune(rune(decoded))
		index += 3
	}
	return builder.String()
}

func mountID(source string, target string) string {
	value := strings.Trim(strings.ToLower(source+"-"+target), "-")
	var builder strings.Builder
	lastDash := false
	for _, char := range value {
		switch {
		case char >= 'a' && char <= 'z', char >= '0' && char <= '9':
			builder.WriteRune(char)
			lastDash = false
		case !lastDash:
			builder.WriteByte('-')
			lastDash = true
		}
	}

	id := strings.Trim(builder.String(), "-")
	if id == "" {
		return "mount"
	}
	return id
}

func parseRemovable(raw json.RawMessage) bool {
	value := strings.TrimSpace(strings.Trim(string(raw), `"`))
	switch strings.ToLower(value) {
	case "1", "true", "yes":
		return true
	default:
		return false
	}
}

func commandUnavailable(err error) bool {
	var pathErr *exec.Error
	return errors.As(err, &pathErr)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
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

	value := float64(bytes)
	for _, suffix := range []string{"KB", "MB", "GB", "TB", "PB"} {
		value /= unit
		if value < unit {
			return fmt.Sprintf("%.2f %s", value, suffix)
		}
	}
	return fmt.Sprintf("%.2f EB", value/unit)
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
	return "127.0.0.1:8083"
}

func CleanPath(path string) string {
	absolute, err := filepath.Abs(path)
	if err != nil {
		return filepath.Clean(path)
	}
	return filepath.Clean(absolute)
}
