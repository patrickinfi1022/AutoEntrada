-- Multi-parking control plane. Apply after 20261008_add_camera_streams.sql.
-- Keep media API addresses private; route them over a site-to-cloud VPN.

CREATE TABLE IF NOT EXISTS parking_sites (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/Mexico_City',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ix_parking_sites_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS edge_gateways (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    site_id VARCHAR(36) NOT NULL,
    name VARCHAR(120) NOT NULL,
    media_api_url VARCHAR(512) NOT NULL,
    enrollment_token_hash CHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    last_seen_at DATETIME NULL,
    configured_stream_count INT NOT NULL DEFAULT 0,
    media_version VARCHAR(40) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ix_edge_gateways_tenant_id (tenant_id),
    INDEX ix_edge_gateways_site_id (site_id),
    CONSTRAINT fk_edge_gateways_site FOREIGN KEY (site_id)
        REFERENCES parking_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_memberships (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    site_id VARCHAR(36) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ix_site_memberships_tenant_id (tenant_id),
    INDEX ix_site_memberships_site_id (site_id),
    UNIQUE KEY uq_site_memberships_site_subject (site_id, subject),
    CONSTRAINT fk_site_memberships_site FOREIGN KEY (site_id)
        REFERENCES parking_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE camera_streams
    ADD COLUMN site_id VARCHAR(36) NULL,
    ADD COLUMN gateway_id VARCHAR(36) NULL,
    ADD INDEX ix_camera_streams_site_id (site_id),
    ADD INDEX ix_camera_streams_gateway_id (gateway_id),
    ADD CONSTRAINT fk_camera_streams_site FOREIGN KEY (site_id)
        REFERENCES parking_sites(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_camera_streams_gateway FOREIGN KEY (gateway_id)
        REFERENCES edge_gateways(id) ON DELETE SET NULL;
