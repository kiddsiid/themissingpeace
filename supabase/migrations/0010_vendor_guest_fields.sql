-- Vendor + guest field completeness (spec §12 Vendor fields, §13 Guest/Household fields).
-- Additive + idempotent. No new enum types, so 0000_reset needs no change.
-- Seating chart is explicitly out of v1 scope, so no seating columns here.

-- Vendors: outreach dates, availability, contract, payment, day-of logistics
alter table vendors add column if not exists inquiry_date date;
alter table vendors add column if not exists response_date date;
alter table vendors add column if not exists availability text;
alter table vendors add column if not exists contract_status text;
alter table vendors add column if not exists deposit_amount numeric;
alter table vendors add column if not exists payment_schedule text;
alter table vendors add column if not exists cancellation_terms text;
alter table vendors add column if not exists insurance_required boolean not null default false;
alter table vendors add column if not exists meals_required boolean not null default false;
alter table vendors add column if not exists arrival_time text;
alter table vendors add column if not exists departure_time text;
alter table vendors add column if not exists setup_time text;
alter table vendors add column if not exists breakdown_time text;

-- Households: primary contact + invitation status
alter table households add column if not exists primary_contact text;
alter table households add column if not exists invitation_status text;

-- Guests: identity, invited events, hospitality tracking
alter table guests add column if not exists preferred_name text;
alter table guests add column if not exists pronouns text;
alter table guests add column if not exists guest_group text;
alter table guests add column if not exists invited_rehearsal boolean not null default false;
alter table guests add column if not exists invited_other_events boolean not null default false;
alter table guests add column if not exists hotel_status text;
alter table guests add column if not exists transportation_need boolean not null default false;
alter table guests add column if not exists gift_received boolean not null default false;
alter table guests add column if not exists thank_you_note_status text;
