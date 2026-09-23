-- CreateEnum
CREATE TYPE "activity_type" AS ENUM ('diving', 'snorkeling', 'try_dive', 'discovery', 'specialty');

-- CreateEnum
CREATE TYPE "booking_source" AS ENUM ('direct', 'partner', 'walk_in', 'phone');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "breach_type" AS ENUM ('unauthorized_access', 'data_loss', 'data_disclosure', 'data_modification', 'other');

-- CreateEnum
CREATE TYPE "briefing_type" AS ENUM ('safety_briefing', 'dive_briefing', 'equipment_briefing', 'emergency_briefing');

-- CreateEnum
CREATE TYPE "certification_type" AS ENUM ('recreational', 'professional');

-- CreateEnum
CREATE TYPE "claim_type" AS ENUM ('equipment_damage', 'customer_injury', 'equipment_loss', 'liability', 'medical', 'other');

-- CreateEnum
CREATE TYPE "clearance_type" AS ENUM ('medical_clearance', 'diving_fitness', 'safety_clearance');

-- CreateEnum
CREATE TYPE "consent_method" AS ENUM ('online', 'paper', 'verbal', 'implied');

-- CreateEnum
CREATE TYPE "consent_type" AS ENUM ('marketing', 'data_processing', 'photo_video', 'medical_clearance', 'medical_data');

-- CreateEnum
CREATE TYPE "contact_type" AS ENUM ('emergency', 'veterinary', 'chamber', 'coast_guard', 'medical', 'police', 'ambulance', 'fire_dept', 'other');

-- CreateEnum
CREATE TYPE "customer_type" AS ENUM ('tourist', 'local', 'recurrent');

-- CreateEnum
CREATE TYPE "data_type" AS ENUM ('customer_data', 'booking_data', 'financial_data', 'equipment_data', 'staff_data', 'certification_data', 'medical_data');

-- CreateEnum
CREATE TYPE "deletion_trigger" AS ENUM ('retention_policy', 'customer_request', 'business_requirement', 'legal_requirement');

-- CreateEnum
CREATE TYPE "equipment_type" AS ENUM ('diving', 'snorkeling', 'accessory');

-- CreateEnum
CREATE TYPE "incident_type" AS ENUM ('equipment_failure', 'medical', 'weather', 'boat_problem', 'lost_equipment', 'customer_complaint', 'other');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cash', 'card', 'stripe', 'bank_transfer', 'voucher', 'government_bono', 'deferred');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'partial', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "provider_type" AS ENUM ('insurance', 'equipment_service', 'training', 'legal', 'medical', 'other');

-- CreateEnum
CREATE TYPE "restriction_level" AS ENUM ('none', 'restricted', 'banned');

-- CreateEnum
CREATE TYPE "severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "staff_role" AS ENUM ('owner', 'manager', 'instructor', 'divemaster', 'assistant', 'admin', 'boat_captain', 'mechanic', 'intern');

-- CreateEnum
CREATE TYPE "status" AS ENUM ('active', 'inactive', 'pending', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('superadmin', 'admin', 'boat_pilot', 'guide', 'trainer', 'intern');

-- CreateEnum
CREATE TYPE "withdrawal_method" AS ENUM ('online', 'paper', 'email', 'verbal');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "domain" VARCHAR(255),
    "is_active" BOOLEAN DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "user_id" UUID,
    "user_type" VARCHAR(20) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" UUID,
    "details" JSONB DEFAULT '{}',
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boat_preps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "session" VARCHAR(50) NOT NULL,
    "boat_id" UUID,
    "diver_ids" JSONB NOT NULL DEFAULT '[]',
    "dive_site_id" UUID,
    "actual_dive_site_id" UUID,
    "dive_site_status" JSONB DEFAULT '{}',
    "post_dive_report" JSONB DEFAULT '{}',
    "staff" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boat_preps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "equipment_onboard" JSONB DEFAULT '[]',
    "maintenance_schedule" JSONB DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bono_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bono_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "usage_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bono_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "boat_id" UUID,
    "dive_site_id" UUID,
    "staff_primary_id" UUID,
    "booking_date" DATE NOT NULL,
    "activity_type" "activity_type" NOT NULL,
    "number_of_dives" INTEGER DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) DEFAULT 0,
    "total_price" DECIMAL(10,2) NOT NULL,
    "payment_method" "payment_method",
    "payment_status" "payment_status" DEFAULT 'pending',
    "status" "booking_status" DEFAULT 'pending',
    "special_requirements" TEXT,
    "equipment_needed" JSONB DEFAULT '[]',
    "bono_id" UUID,
    "government_payment" DECIMAL(10,2) DEFAULT 0,
    "customer_payment" DECIMAL(10,2) DEFAULT 0,
    "dive_sequence" INTEGER DEFAULT 1,
    "stay_id" UUID,
    "source" "booking_source" DEFAULT 'direct',
    "partner_id" UUID,
    "created_by_partner_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_agencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "priority" INTEGER NOT NULL,
    "is_primary_agency" BOOLEAN DEFAULT false,
    "api_endpoint" VARCHAR(255),
    "api_key_required" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certification_agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_certifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "certification_number" VARCHAR(100) NOT NULL,
    "certification_level" VARCHAR(100) NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE,
    "instructor_name" VARCHAR(100),
    "dive_center" VARCHAR(100),
    "api_validated" BOOLEAN DEFAULT false,
    "api_data" JSONB,
    "last_validated" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "consent_type" "consent_type" NOT NULL,
    "consent_given" BOOLEAN NOT NULL,
    "consent_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consent_method" "consent_method" NOT NULL DEFAULT 'online',
    "ip_address" INET,
    "user_agent" TEXT,
    "withdrawal_date" TIMESTAMPTZ(6),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_stays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "stay_start_date" DATE NOT NULL,
    "stay_end_date" DATE,
    "status" "status" DEFAULT 'active',
    "total_dives" INTEGER DEFAULT 0,
    "total_spent" DECIMAL(10,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_stays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "dob" DATE,
    "nationality" VARCHAR(50),
    "address" JSONB DEFAULT '{}',
    "customer_type" "customer_type",
    "preferences" JSONB DEFAULT '{}',
    "medical_conditions" JSONB DEFAULT '[]',
    "restrictions" JSONB DEFAULT '{}',
    "notes" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "anonymized" BOOLEAN DEFAULT false,
    "deletion_reason" TEXT,
    "source" "booking_source" DEFAULT 'direct',
    "partner_id" UUID,
    "created_by_partner_id" UUID,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_breaches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "breach_type" "breach_type" NOT NULL,
    "severity" "severity" NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurred_at" TIMESTAMPTZ(6),
    "affected_data_types" "data_type"[] DEFAULT ARRAY[]::"data_type"[],
    "affected_customers_count" INTEGER DEFAULT 0,
    "affected_customer_ids" UUID[],
    "root_cause" TEXT,
    "containment_measures" TEXT,
    "mitigation_actions" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'detected',
    "reported_to_authority" BOOLEAN DEFAULT false,
    "authority_notification_date" TIMESTAMPTZ(6),
    "authority_name" VARCHAR(255),
    "customer_notification_required" BOOLEAN DEFAULT false,
    "customer_notification_date" TIMESTAMPTZ(6),
    "customers_notified_count" INTEGER DEFAULT 0,
    "notification_deadline" TIMESTAMPTZ(6) NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),
    "reported_by" UUID,
    "assigned_to" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_breaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_subject_access_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "request_type" VARCHAR(50) NOT NULL DEFAULT 'access',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "deadline" TIMESTAMPTZ(6) NOT NULL,
    "requested_by" VARCHAR(100),
    "request_details" JSONB DEFAULT '{}',
    "response_data" JSONB,
    "response_format" VARCHAR(20),
    "response_delivery_method" VARCHAR(50),
    "response_delivered_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_subject_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dive_sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "activity_type" NOT NULL,
    "depth_range" JSONB NOT NULL,
    "difficulty_level" VARCHAR(50) NOT NULL,
    "conditions" JSONB DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dive_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" "equipment_type" NOT NULL,
    "type" "equipment_type" NOT NULL,
    "size" VARCHAR(50),
    "condition" VARCHAR(50),
    "serial_number" VARCHAR(100),
    "is_available" BOOLEAN DEFAULT true,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_bonos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "discount_percentage" DECIMAL(5,2),
    "max_amount" DECIMAL(10,2),
    "valid_from" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "usage_limit" INTEGER,
    "current_usage" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "government_bonos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "address" JSONB NOT NULL,
    "contact_info" JSONB NOT NULL,
    "settings" JSONB DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "bill_number" VARCHAR(100) NOT NULL,
    "stay_start_date" DATE NOT NULL,
    "bill_date" DATE NOT NULL,
    "booking_ids" JSONB NOT NULL DEFAULT '[]',
    "bill_items" JSONB NOT NULL DEFAULT '[]',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "partner_paid_total" DECIMAL(10,2) DEFAULT 0,
    "customer_paid_total" DECIMAL(10,2) DEFAULT 0,
    "partner_tax" DECIMAL(10,2) DEFAULT 0,
    "customer_tax" DECIMAL(10,2) DEFAULT 0,
    "breakdown" JSONB DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "customer_id" UUID,
    "bill_id" VARCHAR(100),
    "location_id" UUID NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "booking_ids" JSONB DEFAULT '[]',
    "notes" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "contact_email" VARCHAR(100) NOT NULL,
    "contact_phone" VARCHAR(20),
    "api_key" VARCHAR(255) NOT NULL,
    "api_secret_hash" VARCHAR(255) NOT NULL,
    "webhook_url" VARCHAR(255),
    "commission_rate" DECIMAL(5,2),
    "allowed_locations" UUID[],
    "is_active" BOOLEAN DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID,
    "pricing_type" VARCHAR(50) NOT NULL DEFAULT 'standard',
    "activity_type" "activity_type",
    "activity_reference_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "pricing_rules" JSONB NOT NULL,
    "conditions" JSONB DEFAULT '{}',
    "priority" INTEGER DEFAULT 0,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "location_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "role" "staff_role" NOT NULL,
    "certifications" JSONB DEFAULT '[]',
    "emergency_contact" JSONB DEFAULT '{}',
    "employment_start_date" DATE,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "username" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(100),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'admin',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location_access" UUID[] DEFAULT ARRAY[]::UUID[],
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "idx_tenants_slug" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "idx_tenants_active" ON "tenants"("is_active");

-- CreateIndex
CREATE INDEX "idx_audit_logs_tenant" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_resource_action_date" ON "audit_logs"("resource_type", "resource_id", "action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_action_date" ON "audit_logs"("user_id", "action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_type" ON "audit_logs"("user_type");

-- CreateIndex
CREATE INDEX "idx_boat_preps_boat" ON "boat_preps"("boat_id");

-- CreateIndex
CREATE INDEX "idx_boat_preps_date" ON "boat_preps"("date");

-- CreateIndex
CREATE INDEX "idx_boat_preps_location" ON "boat_preps"("location_id");

-- CreateIndex
CREATE INDEX "idx_boats_active" ON "boats"("is_active");

-- CreateIndex
CREATE INDEX "idx_boats_location" ON "boats"("location_id");

-- CreateIndex
CREATE INDEX "idx_bookings_created_by_partner" ON "bookings"("created_by_partner_id");

-- CreateIndex
CREATE INDEX "idx_bookings_customer" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "idx_bookings_partner" ON "bookings"("partner_id");

-- CreateIndex
CREATE INDEX "idx_bookings_source" ON "bookings"("source");

-- CreateIndex
CREATE UNIQUE INDEX "certification_agencies_code_key" ON "certification_agencies"("code");

-- CreateIndex
CREATE INDEX "idx_certification_agencies_tenant" ON "certification_agencies"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_certifications_customer" ON "customer_certifications"("customer_id");

-- CreateIndex
CREATE INDEX "idx_customer_consents_active" ON "customer_consents"("is_active");

-- CreateIndex
CREATE INDEX "idx_customer_consents_customer" ON "customer_consents"("customer_id");

-- CreateIndex
CREATE INDEX "idx_customer_consents_customer_type_active" ON "customer_consents"("customer_id", "consent_type", "is_active");

-- CreateIndex
CREATE INDEX "idx_customer_consents_type" ON "customer_consents"("consent_type");

-- CreateIndex
CREATE INDEX "idx_customer_stays_customer" ON "customer_stays"("customer_id");

-- CreateIndex
CREATE INDEX "idx_customers_tenant" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_customers_anonymized" ON "customers"("anonymized");

-- CreateIndex
CREATE INDEX "idx_customers_created_by_partner" ON "customers"("created_by_partner_id");

-- CreateIndex
CREATE INDEX "idx_customers_deleted_at" ON "customers"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_customers_email" ON "customers"("email");

-- CreateIndex
CREATE INDEX "idx_customers_partner" ON "customers"("partner_id");

-- CreateIndex
CREATE INDEX "idx_customers_source" ON "customers"("source");

-- CreateIndex
CREATE INDEX "idx_data_breaches_tenant" ON "data_breaches"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_data_breaches_detected_at" ON "data_breaches"("detected_at");

-- CreateIndex
CREATE INDEX "idx_data_breaches_notification_deadline" ON "data_breaches"("notification_deadline");

-- CreateIndex
CREATE INDEX "idx_data_breaches_reported_to_authority" ON "data_breaches"("reported_to_authority");

-- CreateIndex
CREATE INDEX "idx_data_breaches_severity" ON "data_breaches"("severity");

-- CreateIndex
CREATE INDEX "idx_data_breaches_status" ON "data_breaches"("status");

-- CreateIndex
CREATE INDEX "idx_dsar_customer" ON "data_subject_access_requests"("customer_id");

-- CreateIndex
CREATE INDEX "idx_dsar_deadline" ON "data_subject_access_requests"("deadline");

-- CreateIndex
CREATE INDEX "idx_dsar_requested_at" ON "data_subject_access_requests"("requested_at");

-- CreateIndex
CREATE INDEX "idx_dsar_status" ON "data_subject_access_requests"("status");

-- CreateIndex
CREATE INDEX "idx_dive_sites_location" ON "dive_sites"("location_id");

-- CreateIndex
CREATE INDEX "idx_equipment_category" ON "equipment"("category");

-- CreateIndex
CREATE INDEX "idx_equipment_location" ON "equipment"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "government_bonos_code_key" ON "government_bonos"("code");

-- CreateIndex
CREATE INDEX "idx_government_bonos_tenant" ON "government_bonos"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_locations_tenant" ON "locations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_locations_active" ON "locations"("is_active");

-- CreateIndex
CREATE INDEX "idx_locations_type" ON "locations"("type");

-- CreateIndex
CREATE UNIQUE INDEX "customer_bills_bill_number_key" ON "customer_bills"("bill_number");

-- CreateIndex
CREATE INDEX "idx_customer_bills_date" ON "customer_bills"("bill_date");

-- CreateIndex
CREATE INDEX "idx_customer_bills_number" ON "customer_bills"("bill_number");

-- CreateIndex
CREATE INDEX "idx_customer_bills_customer" ON "customer_bills"("customer_id");

-- CreateIndex
CREATE INDEX "idx_customer_bills_stay_start" ON "customer_bills"("stay_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "partner_invoices_invoice_number_key" ON "partner_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_partner_invoices_due_date" ON "partner_invoices"("due_date");

-- CreateIndex
CREATE INDEX "idx_partner_invoices_number" ON "partner_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_partner_invoices_partner" ON "partner_invoices"("partner_id");

-- CreateIndex
CREATE INDEX "idx_partner_invoices_status" ON "partner_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "partners_contact_email_key" ON "partners"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "partners_api_key_key" ON "partners"("api_key");

-- CreateIndex
CREATE INDEX "idx_partners_tenant" ON "partners"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_partners_active" ON "partners"("is_active");

-- CreateIndex
CREATE INDEX "idx_partners_api_key" ON "partners"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "idx_settings_tenant" ON "settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE INDEX "idx_staff_location" ON "staff"("location_id");

-- CreateIndex
CREATE INDEX "idx_staff_role" ON "staff"("role");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_tenant" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_users_active" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "boat_preps" ADD CONSTRAINT "boat_preps_actual_dive_site_id_fkey" FOREIGN KEY ("actual_dive_site_id") REFERENCES "dive_sites"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "boat_preps" ADD CONSTRAINT "boat_preps_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "boat_preps" ADD CONSTRAINT "boat_preps_dive_site_id_fkey" FOREIGN KEY ("dive_site_id") REFERENCES "dive_sites"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "boat_preps" ADD CONSTRAINT "boat_preps_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "boats" ADD CONSTRAINT "boats_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bono_usage" ADD CONSTRAINT "bono_usage_bono_id_fkey" FOREIGN KEY ("bono_id") REFERENCES "government_bonos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bono_usage" ADD CONSTRAINT "bono_usage_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bono_usage" ADD CONSTRAINT "bono_usage_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_partner_id_fkey" FOREIGN KEY ("created_by_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dive_site_id_fkey" FOREIGN KEY ("dive_site_id") REFERENCES "dive_sites"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_primary_id_fkey" FOREIGN KEY ("staff_primary_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_stay_id_fkey" FOREIGN KEY ("stay_id") REFERENCES "customer_stays"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certification_agencies" ADD CONSTRAINT "certification_agencies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_certifications" ADD CONSTRAINT "customer_certifications_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "certification_agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_certifications" ADD CONSTRAINT "customer_certifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_stays" ADD CONSTRAINT "customer_stays_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_partner_id_fkey" FOREIGN KEY ("created_by_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "data_breaches" ADD CONSTRAINT "data_breaches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "data_subject_access_requests" ADD CONSTRAINT "data_subject_access_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dive_sites" ADD CONSTRAINT "dive_sites_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "government_bonos" ADD CONSTRAINT "government_bonos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_bills" ADD CONSTRAINT "customer_bills_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_bills" ADD CONSTRAINT "customer_bills_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partner_invoices" ADD CONSTRAINT "partner_invoices_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pricing_configs" ADD CONSTRAINT "pricing_configs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

