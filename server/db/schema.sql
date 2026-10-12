-- ==============================================================================
-- PostgreSQL Permanent Storage Schema
-- Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
-- Version: 1.0.0
-- 
-- Designed to match real db.json entities with strict referential integrity,
-- unique constraints, indexing, transactions, and auditability.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. SYSTEM SETTINGS & MAINTENANCE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_settings (
    id INT PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    maintenance_mode INT NOT NULL DEFAULT 0,
    message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    CONSTRAINT maintenance_settings_single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS home_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    settings JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS email_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    settings JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- ------------------------------------------------------------------------------
-- 3. DEPARTMENTS & TEAMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    director_name VARCHAR(255),
    director_id VARCHAR(100),
    national_id VARCHAR(30),
    email VARCHAR(255),
    phone VARCHAR(30),
    budget NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    icon VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_national_id ON departments(national_id);

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    leader_name VARCHAR(255),
    leader_id VARCHAR(100),
    members_count INT DEFAULT 0,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);

-- ------------------------------------------------------------------------------
-- 4. USERS, PERMISSIONS & SESSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(30),
    national_id VARCHAR(30) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'volunteer',
    job_title VARCHAR(255),
    primary_department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    allowed_departments JSONB DEFAULT '[]'::jsonb,
    allowed_pages JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'active',
    must_change_password BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON system_users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON system_users(status);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON system_users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON system_users(email);

CREATE TABLE IF NOT EXISTS user_sessions (
    token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
    user_role VARCHAR(50) NOT NULL,
    user_name VARCHAR(255),
    department_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(100),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON password_reset_otps(email);

-- ------------------------------------------------------------------------------
-- 5. VOLUNTEERS & APPLICATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS volunteer_file_numbers (
    file_number VARCHAR(30) PRIMARY KEY,
    volunteer_id VARCHAR(100) NOT NULL,
    national_id VARCHAR(30),
    gender VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vfn_volunteer_id ON volunteer_file_numbers (volunteer_id);

CREATE TABLE IF NOT EXISTS volunteers (
    id VARCHAR(100) PRIMARY KEY,
    file_number VARCHAR(30) UNIQUE,
    name VARCHAR(255) NOT NULL,
    national_id VARCHAR(30) UNIQUE,
    phone VARCHAR(30),
    email VARCHAR(255),
    gender VARCHAR(20),
    birth_date DATE,
    city VARCHAR(100),
    qualification VARCHAR(100),
    occupation VARCHAR(100),
    skills JSONB DEFAULT '[]'::jsonb,
    interests JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'pending',
    role VARCHAR(50) DEFAULT 'volunteer',
    join_date DATE DEFAULT CURRENT_DATE,
    total_hours NUMERIC(10, 2) DEFAULT 0,
    initiatives_count INT DEFAULT 0,
    primary_department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    team_id VARCHAR(50) REFERENCES teams(id) ON DELETE SET NULL,
    profile_image TEXT,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_volunteers_national_id ON volunteers(national_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_file_number ON volunteers(file_number);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_dept ON volunteers(primary_department_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_team ON volunteers(team_id);

CREATE TABLE IF NOT EXISTS volunteer_applications (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    national_id VARCHAR(30) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    birth_date DATE,
    city VARCHAR(100),
    qualification VARCHAR(100),
    occupation VARCHAR(100),
    skills JSONB DEFAULT '[]'::jsonb,
    interests JSONB DEFAULT '[]'::jsonb,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_vol_app_status ON volunteer_applications(status);
CREATE INDEX IF NOT EXISTS idx_vol_app_national_id ON volunteer_applications(national_id);

CREATE TABLE IF NOT EXISTS team_applications (
    id VARCHAR(100) PRIMARY KEY,
    volunteer_id VARCHAR(100) NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    team_id VARCHAR(50) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(100),
    notes TEXT
);

-- ------------------------------------------------------------------------------
-- 6. INITIATIVES, ATTENDANCE & EVALUATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS initiatives (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    team_id VARCHAR(50) REFERENCES teams(id) ON DELETE SET NULL,
    description TEXT,
    location VARCHAR(255),
    start_date DATE,
    end_date DATE,
    hours NUMERIC(6, 2) DEFAULT 0,
    volunteers_required INT DEFAULT 0,
    volunteers_registered INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planned',
    supervisor_name VARCHAR(255),
    target_audience VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_initiatives_dept ON initiatives(department_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON initiatives(status);

CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(100) PRIMARY KEY,
    initiative_id VARCHAR(100) NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    volunteer_id VARCHAR(100) NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'present',
    check_in_time VARCHAR(20),
    check_out_time VARCHAR(20),
    hours_awarded NUMERIC(6, 2) DEFAULT 0,
    verified_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_initiative_volunteer_date UNIQUE (initiative_id, volunteer_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_volunteer ON attendance(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_initiative ON attendance(initiative_id);

CREATE TABLE IF NOT EXISTS evaluations (
    id VARCHAR(100) PRIMARY KEY,
    initiative_id VARCHAR(100) NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    volunteer_id VARCHAR(100) NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    score INT CHECK (score >= 1 AND score <= 100),
    feedback TEXT,
    evaluated_by VARCHAR(100),
    evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. BENEFICIARIES, REQUESTS & DISTRIBUTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficiaries (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    national_id VARCHAR(30) UNIQUE,
    phone VARCHAR(30),
    email VARCHAR(255),
    gender VARCHAR(20),
    birth_date DATE,
    marital_status VARCHAR(50),
    family_members_count INT DEFAULT 1,
    city VARCHAR(100),
    district VARCHAR(100),
    address TEXT,
    income NUMERIC(15, 2) DEFAULT 0,
    housing_type VARCHAR(100),
    health_status VARCHAR(100),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    support_history JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_national_id ON beneficiaries(national_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON beneficiaries(status);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_category ON beneficiaries(category);

CREATE TABLE IF NOT EXISTS benefit_requests (
    id VARCHAR(100) PRIMARY KEY,
    beneficiary_id VARCHAR(100) NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100),
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    amount_requested NUMERIC(15, 2) DEFAULT 0,
    amount_approved NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(100),
    disbursement_status VARCHAR(50) DEFAULT 'pending',
    documents JSONB DEFAULT '[]'::jsonb,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_benefit_req_beneficiary ON benefit_requests(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_benefit_req_status ON benefit_requests(status);

CREATE TABLE IF NOT EXISTS distributions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    initiative_id VARCHAR(100) REFERENCES initiatives(id) ON DELETE SET NULL,
    warehouse_id VARCHAR(50),
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'planned',
    items_count INT DEFAULT 0,
    beneficiaries_count INT DEFAULT 0,
    handovers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 8. EMPLOYEES & HUMAN RESOURCES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    national_id VARCHAR(30) UNIQUE,
    employee_number VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(30),
    job_title VARCHAR(255),
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    department_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    salary NUMERIC(15, 2) DEFAULT 0,
    hire_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees(national_id);

CREATE TABLE IF NOT EXISTS employee_requests (
    id VARCHAR(100) PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(100),
    notes TEXT
);

-- ------------------------------------------------------------------------------
-- 9. FINANCIAL SYSTEM (ACCOUNTS, TRANSACTIONS, BUDGETS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_accounts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) UNIQUE,
    bank_name VARCHAR(255),
    type VARCHAR(50) DEFAULT 'bank',
    balance NUMERIC(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'SAR',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- income / expense / transfer
    account_id VARCHAR(50) REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    reference_number VARCHAR(100),
    beneficiary_id VARCHAR(100) REFERENCES beneficiaries(id) ON DELETE SET NULL,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'approved',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fin_tx_account ON financial_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_type ON financial_transactions(type);

CREATE TABLE IF NOT EXISTS financial_budgets (
    id VARCHAR(50) PRIMARY KEY,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE CASCADE,
    year INT NOT NULL,
    allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    spent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_year_budget UNIQUE (department_id, year)
);

-- ------------------------------------------------------------------------------
-- 10. INVENTORY & WAREHOUSES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    manager_name VARCHAR(255),
    phone VARCHAR(30),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(100) PRIMARY KEY,
    warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'قطعة',
    quantity_available NUMERIC(12, 2) DEFAULT 0,
    minimum_threshold NUMERIC(12, 2) DEFAULT 0,
    unit_cost NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id VARCHAR(100) PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    type VARCHAR(50) NOT NULL, -- in / out / transfer / adjustment
    quantity NUMERIC(12, 2) NOT NULL,
    reference_id VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_item ON inventory_movements(item_id);

-- ------------------------------------------------------------------------------
-- 11. ATTACHMENT REGISTRY (CLOUDFLARE R2 & PHYSICAL STORAGE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachment_metadata (
    id VARCHAR(100) PRIMARY KEY,
    file_key VARCHAR(500) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    sanitized_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'local', -- local / r2 / s3
    entity_type VARCHAR(100), -- volunteers, beneficiaries, licenses, cards
    entity_id VARCHAR(100),
    field_name VARCHAR(100),
    is_private BOOLEAN DEFAULT TRUE,
    access_role VARCHAR(100) DEFAULT 'admin',
    checksum_sha256 VARCHAR(64) NOT NULL,
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active' -- active / archived / orphan
);

CREATE INDEX IF NOT EXISTS idx_attach_entity ON attachment_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attach_checksum ON attachment_metadata(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_attach_status ON attachment_metadata(status);

-- ------------------------------------------------------------------------------
-- 12. MIGRATION AUDIT & RESUMPTION TRACKING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_tracking (
    id VARCHAR(100) PRIMARY KEY,
    phase_name VARCHAR(100) NOT NULL,
    source_collection VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    records_scanned INT NOT NULL DEFAULT 0,
    records_migrated INT NOT NULL DEFAULT 0,
    records_skipped INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending / in_progress / completed / failed
    checksum_source VARCHAR(64),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_details TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255),
    endpoint VARCHAR(255),
    status VARCHAR(50),
    ip VARCHAR(100),
    device TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
