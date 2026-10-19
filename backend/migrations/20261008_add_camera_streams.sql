-- Apply once to the application's MySQL database before enabling /api/cameras.
-- Do not commit camera credentials, Fernet keys, JWT secrets, or populated RTSP URLs.

CREATE TABLE IF NOT EXISTS camera_streams (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    stream_key VARCHAR(80) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    host VARCHAR(45) NOT NULL,
    rtsp_username VARCHAR(100) NOT NULL,
    password_encrypted VARCHAR(512) NOT NULL,
    channel INT NOT NULL DEFAULT 101,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ix_camera_streams_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS whep_sessions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    camera_id VARCHAR(36) NOT NULL,
    upstream_location VARCHAR(1024) NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX ix_whep_sessions_tenant_camera (tenant_id, camera_id),
    CONSTRAINT fk_whep_sessions_camera
        FOREIGN KEY (camera_id) REFERENCES camera_streams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
