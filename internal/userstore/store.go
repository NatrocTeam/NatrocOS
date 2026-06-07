package userstore

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"natrocos/internal/natrocos"
)

const (
	passwordHashAlgorithm  = "pbkdf2-sha256"
	passwordHashIterations = 600000
	passwordHashKeyLength  = 32
	sessionTTL             = 24 * time.Hour
	DatabaseRelativePath   = "metadata/user.db"
	DatabaseFilePermission = 0o600
	databaseDirPermission  = 0o700
)

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrConflict     = errors.New("resource conflict")
	ErrForbidden    = errors.New("permission denied")
	ErrValidation   = errors.New("validation failed")
)

type Options struct {
	DataRoot string
}

type Store struct {
	dataRoot string
}

type Database struct {
	LegacyOwner *UserRecord     `json:"owner,omitempty"`
	Users       []UserRecord    `json:"users"`
	Sessions    []SessionRecord `json:"sessions"`
}

type UserRecord struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	DisplayName  string `json:"displayName"`
	Role         string `json:"role"`
	PasswordHash string `json:"passwordHash"`
	CreatedAt    string `json:"createdAt"`
}

type SessionRecord struct {
	Token     string `json:"token"`
	UserID    string `json:"userId"`
	ExpiresAt string `json:"expiresAt"`
}

func New(options Options) Store {
	dataRoot := strings.TrimSpace(options.DataRoot)
	if dataRoot == "" {
		dataRoot = natrocos.DataRoot
	}
	return Store{dataRoot: dataRoot}
}

func (s Store) DataRoot() string {
	return s.dataRoot
}

func (s Store) DatabasePath() string {
	return filepath.Join(s.dataRoot, filepath.FromSlash(DatabaseRelativePath))
}

func (s Store) SetupStatus() (natrocos.SetupStatus, error) {
	db, err := s.readDatabase()
	if err != nil {
		return natrocos.SetupStatus{}, err
	}

	_, hasOwner := db.owner()
	return natrocos.SetupStatus{HasOwner: hasOwner, RequiresSetup: !hasOwner}, nil
}

func (s Store) CreateOwner(request natrocos.CreateOwnerRequest) (natrocos.UserSession, error) {
	username := strings.TrimSpace(request.Username)
	displayName := strings.TrimSpace(request.DisplayName)
	if displayName == "" {
		displayName = username
	}
	if len(username) < 3 || len(request.Password) < 8 {
		return natrocos.UserSession{}, fmt.Errorf("%w: username must be at least 3 characters and password at least 8 characters", ErrValidation)
	}

	db, err := s.readDatabase()
	if err != nil {
		return natrocos.UserSession{}, err
	}
	if len(db.Users) > 0 {
		return natrocos.UserSession{}, fmt.Errorf("%w: setup already completed", ErrConflict)
	}

	passwordHash, err := hashPassword(request.Password)
	if err != nil {
		return natrocos.UserSession{}, err
	}
	userID, err := randomID("usr")
	if err != nil {
		return natrocos.UserSession{}, err
	}
	owner := UserRecord{
		ID:           userID,
		Username:     username,
		DisplayName:  displayName,
		Role:         defaultRoleForNewUser(len(db.Users)),
		PasswordHash: passwordHash,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
	}
	session, err := newSession(owner)
	if err != nil {
		return natrocos.UserSession{}, err
	}

	db.Users = []UserRecord{owner}
	db.Sessions = []SessionRecord{{
		Token:     session.AccessToken,
		UserID:    owner.ID,
		ExpiresAt: session.ExpiresAt,
	}}
	if err := s.writeDatabase(db); err != nil {
		return natrocos.UserSession{}, err
	}
	return session, nil
}

func (s Store) Users(token string) ([]natrocos.UserAccount, error) {
	db, err := s.readDatabase()
	if err != nil {
		return nil, err
	}

	requester, ok := db.activeUserByToken(token)
	if !ok {
		return nil, ErrUnauthorized
	}
	if requester.Role != natrocos.RoleOwner {
		return nil, ErrForbidden
	}

	users := make([]natrocos.UserAccount, 0, len(db.Users))
	for _, user := range db.Users {
		users = append(users, accountFromUser(user))
	}
	return users, nil
}

func (s Store) CreateUser(token string, request natrocos.CreateUserRequest) (natrocos.UserAccount, error) {
	username := strings.TrimSpace(request.Username)
	displayName := strings.TrimSpace(request.DisplayName)
	if displayName == "" {
		displayName = username
	}
	if len(username) < 3 || len(request.Password) < 8 {
		return natrocos.UserAccount{}, fmt.Errorf("%w: username must be at least 3 characters and password at least 8 characters", ErrValidation)
	}

	db, err := s.readDatabase()
	if err != nil {
		return natrocos.UserAccount{}, err
	}

	requester, ok := db.activeUserByToken(token)
	if !ok {
		return natrocos.UserAccount{}, ErrUnauthorized
	}
	if requester.Role != natrocos.RoleOwner {
		return natrocos.UserAccount{}, ErrForbidden
	}
	if _, hasOwner := db.owner(); !hasOwner {
		return natrocos.UserAccount{}, fmt.Errorf("%w: first owner setup is required", ErrConflict)
	}
	if _, exists := db.userByUsername(username); exists {
		return natrocos.UserAccount{}, fmt.Errorf("%w: username already exists", ErrConflict)
	}

	passwordHash, err := hashPassword(request.Password)
	if err != nil {
		return natrocos.UserAccount{}, err
	}
	userID, err := randomID("usr")
	if err != nil {
		return natrocos.UserAccount{}, err
	}

	user := UserRecord{
		ID:           userID,
		Username:     username,
		DisplayName:  displayName,
		Role:         defaultRoleForNewUser(len(db.Users)),
		PasswordHash: passwordHash,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
	}
	db.Users = append(db.Users, user)
	if err := s.writeDatabase(db); err != nil {
		return natrocos.UserAccount{}, err
	}

	return accountFromUser(user), nil
}

func (s Store) AuthLogin(request natrocos.LoginRequest) (natrocos.UserSession, error) {
	db, err := s.readDatabase()
	if err != nil {
		return natrocos.UserSession{}, err
	}
	user, ok := db.userByUsername(strings.TrimSpace(request.Username))
	if !ok || !verifyPassword(request.Password, user.PasswordHash) {
		return natrocos.UserSession{}, ErrUnauthorized
	}

	session, err := newSession(user)
	if err != nil {
		return natrocos.UserSession{}, err
	}
	db.Sessions = append(pruneExpiredSessions(db.Sessions), SessionRecord{
		Token:     session.AccessToken,
		UserID:    user.ID,
		ExpiresAt: session.ExpiresAt,
	})
	if err := s.writeDatabase(db); err != nil {
		return natrocos.UserSession{}, err
	}
	return session, nil
}

func (s Store) AuthRefresh(token string) (natrocos.RefreshSessionResponse, error) {
	db, err := s.readDatabase()
	if err != nil {
		return natrocos.RefreshSessionResponse{}, err
	}
	index, ok := findActiveSession(db.Sessions, token)
	if !ok {
		return natrocos.RefreshSessionResponse{}, ErrUnauthorized
	}
	if _, ok := db.userByID(db.Sessions[index].UserID); !ok {
		return natrocos.RefreshSessionResponse{}, ErrUnauthorized
	}

	nextToken, err := randomToken()
	if err != nil {
		return natrocos.RefreshSessionResponse{}, err
	}
	expiresAt := time.Now().UTC().Add(sessionTTL).Format(time.RFC3339)
	db.Sessions[index].Token = nextToken
	db.Sessions[index].ExpiresAt = expiresAt
	db.Sessions = pruneExpiredSessions(db.Sessions)
	if err := s.writeDatabase(db); err != nil {
		return natrocos.RefreshSessionResponse{}, err
	}
	return natrocos.RefreshSessionResponse{AccessToken: nextToken, ExpiresAt: expiresAt}, nil
}

func (s Store) AuthLogout(token string) error {
	db, err := s.readDatabase()
	if err != nil {
		return err
	}
	index, ok := findActiveSession(db.Sessions, token)
	if !ok {
		return ErrUnauthorized
	}

	db.Sessions = append(db.Sessions[:index], db.Sessions[index+1:]...)
	return s.writeDatabase(db)
}

func (s Store) CurrentUser(token string) (natrocos.CurrentUser, error) {
	db, err := s.readDatabase()
	if err != nil {
		return natrocos.CurrentUser{}, err
	}
	index, ok := findActiveSession(db.Sessions, token)
	if !ok {
		return natrocos.CurrentUser{}, ErrUnauthorized
	}
	user, ok := db.userByID(db.Sessions[index].UserID)
	if !ok {
		return natrocos.CurrentUser{}, ErrUnauthorized
	}

	return natrocos.CurrentUser{
		UserID:      user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Role:        user.Role,
	}, nil
}

func (s Store) readDatabase() (Database, error) {
	content, err := os.ReadFile(s.DatabasePath())
	if err != nil {
		if os.IsNotExist(err) {
			return Database{}, nil
		}
		return Database{}, err
	}
	if len(strings.TrimSpace(string(content))) == 0 {
		return Database{}, nil
	}

	var db Database
	if err := json.Unmarshal(content, &db); err != nil {
		return Database{}, err
	}
	return normalizeDatabase(db), nil
}

func (s Store) writeDatabase(db Database) error {
	path := s.DatabasePath()
	if err := os.MkdirAll(filepath.Dir(path), databaseDirPermission); err != nil {
		return err
	}

	content, err := json.MarshalIndent(db, "", "  ")
	if err != nil {
		return err
	}

	tempPath := path + ".tmp"
	if err := os.WriteFile(tempPath, content, DatabaseFilePermission); err != nil {
		return err
	}
	return os.Rename(tempPath, path)
}

func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	key, err := pbkdf2.Key(sha256.New, password, salt, passwordHashIterations, passwordHashKeyLength)
	if err != nil {
		return "", err
	}

	return strings.Join([]string{
		passwordHashAlgorithm,
		strconv.Itoa(passwordHashIterations),
		base64.RawURLEncoding.EncodeToString(salt),
		base64.RawURLEncoding.EncodeToString(key),
	}, "$"), nil
}

func verifyPassword(password string, encodedHash string) bool {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 4 || parts[0] != passwordHashAlgorithm {
		return false
	}

	iterations, err := strconv.Atoi(parts[1])
	if err != nil {
		return false
	}
	salt, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return false
	}
	expected, err := base64.RawURLEncoding.DecodeString(parts[3])
	if err != nil {
		return false
	}

	actual, err := pbkdf2.Key(sha256.New, password, salt, iterations, len(expected))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

func normalizeDatabase(db Database) Database {
	normalized := Database{
		Users:    []UserRecord{},
		Sessions: db.Sessions,
	}
	seenUsers := map[string]bool{}

	if db.LegacyOwner != nil {
		normalized.addUser(*db.LegacyOwner, seenUsers)
	}
	for _, user := range db.Users {
		normalized.addUser(user, seenUsers)
	}

	for index := range normalized.Users {
		normalized.Users[index].Username = strings.TrimSpace(normalized.Users[index].Username)
		normalized.Users[index].DisplayName = strings.TrimSpace(normalized.Users[index].DisplayName)
		if normalized.Users[index].DisplayName == "" {
			normalized.Users[index].DisplayName = normalized.Users[index].Username
		}

		if index == 0 {
			normalized.Users[index].Role = natrocos.RoleOwner
		} else {
			normalized.Users[index].Role = natrocos.RoleUser
		}
	}

	return normalized
}

func (db *Database) addUser(user UserRecord, seenUsers map[string]bool) {
	if user.ID == "" || seenUsers[user.ID] {
		return
	}

	seenUsers[user.ID] = true
	db.Users = append(db.Users, user)
}

func (db Database) owner() (UserRecord, bool) {
	for _, user := range db.Users {
		if user.Role == natrocos.RoleOwner {
			return user, true
		}
	}
	return UserRecord{}, false
}

func (db Database) userByUsername(username string) (UserRecord, bool) {
	for _, user := range db.Users {
		if user.Username == username {
			return user, true
		}
	}
	return UserRecord{}, false
}

func (db Database) userByID(id string) (UserRecord, bool) {
	for _, user := range db.Users {
		if user.ID == id {
			return user, true
		}
	}
	return UserRecord{}, false
}

func (db Database) activeUserByToken(token string) (UserRecord, bool) {
	index, ok := findActiveSession(db.Sessions, token)
	if !ok {
		return UserRecord{}, false
	}
	return db.userByID(db.Sessions[index].UserID)
}

func accountFromUser(user UserRecord) natrocos.UserAccount {
	return natrocos.UserAccount{
		UserID:      user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Role:        user.Role,
		CreatedAt:   user.CreatedAt,
	}
}

func defaultRoleForNewUser(existingUserCount int) string {
	if existingUserCount == 0 {
		return natrocos.RoleOwner
	}
	return natrocos.RoleUser
}

func newSession(user UserRecord) (natrocos.UserSession, error) {
	token, err := randomToken()
	if err != nil {
		return natrocos.UserSession{}, err
	}
	return natrocos.UserSession{
		UserID:      user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Role:        user.Role,
		AccessToken: token,
		ExpiresAt:   time.Now().UTC().Add(sessionTTL).Format(time.RFC3339),
	}, nil
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

func findActiveSession(sessions []SessionRecord, token string) (int, bool) {
	if strings.TrimSpace(token) == "" {
		return 0, false
	}

	now := time.Now().UTC()
	for index, session := range sessions {
		if session.Token != token {
			continue
		}
		expiresAt, err := time.Parse(time.RFC3339, session.ExpiresAt)
		if err != nil || !expiresAt.After(now) {
			return 0, false
		}
		return index, true
	}
	return 0, false
}

func pruneExpiredSessions(sessions []SessionRecord) []SessionRecord {
	now := time.Now().UTC()
	activeSessions := make([]SessionRecord, 0, len(sessions))
	for _, session := range sessions {
		expiresAt, err := time.Parse(time.RFC3339, session.ExpiresAt)
		if err == nil && expiresAt.After(now) {
			activeSessions = append(activeSessions, session)
		}
	}
	return activeSessions
}
