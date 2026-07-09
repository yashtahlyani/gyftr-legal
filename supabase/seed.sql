-- ═══════════════════════════════════════════════════════════════════════════
-- GyfTR Legal Portal — Seed Script
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run All
-- Safe to re-run (ON CONFLICT DO NOTHING throughout)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Fix RLS policies on profiles ──────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Read profiles') THEN
    EXECUTE 'CREATE POLICY "Read profiles" ON profiles FOR SELECT USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Insert own profile') THEN
    EXECUTE 'CREATE POLICY "Insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Update own profile') THEN
    EXECUTE 'CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (auth.uid() = id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agreements' AND policyname='Legal deletes agreements') THEN
    EXECUTE 'CREATE POLICY "Legal deletes agreements" ON agreements FOR DELETE USING ((select role from profiles where id = auth.uid()) = ''legal'')';
  END IF;
END $$;

-- ── STEP 2: pgcrypto ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── STEP 3: Profiles for existing Supabase users ──────────────────────────
-- Auth users already exist — only insert profiles (FK: profiles.id → auth.users.id)
-- UIDs from Supabase Dashboard → Authentication → Users
INSERT INTO profiles (id, name, role, team_code, avatar) VALUES
  ('2e67f8ea-68e4-4176-8c97-25e9c090f6d0', 'Nitin Kumar',  'legal',      'L', 'NK'),
  ('5837357d-882c-4d59-84ac-fd0ac1aef464', 'Pankaj Mehta', 'finance',    'F', 'PM'),
  ('e2c91d93-78cc-490d-b994-b9dccaf9dcfe', 'Madhvi Singh', 'business',   'B', 'MS'),
  ('424b5780-eb11-48b6-9a67-362ea1249068', 'Nitin Kapoor', 'compliance', 'C', 'NK')
ON CONFLICT (id) DO NOTHING;

-- ── STEP 4: Seed 6 agreements + all related data ──────────────────────────
DO $$
DECLARE
  uid_legal  UUID := '2e67f8ea-68e4-4176-8c97-25e9c090f6d0';  -- nitin@gyftr.com
  ag1  UUID := 'bbbb0001-0000-0000-0000-000000000000';
  ag2  UUID := 'bbbb0002-0000-0000-0000-000000000000';
  ag3  UUID := 'bbbb0003-0000-0000-0000-000000000000';
  ag4  UUID := 'bbbb0004-0000-0000-0000-000000000000';
  ag5  UUID := 'bbbb0005-0000-0000-0000-000000000000';
  ag6  UUID := 'bbbb0006-0000-0000-0000-000000000000';
  cl1a UUID := 'cccc0101-0000-0000-0000-000000000000';
  cl1b UUID := 'cccc0102-0000-0000-0000-000000000000';
  cl1c UUID := 'cccc0103-0000-0000-0000-000000000000';
  cl1d UUID := 'cccc0104-0000-0000-0000-000000000000';
  cl2a UUID := 'cccc0201-0000-0000-0000-000000000000';
  cl2b UUID := 'cccc0202-0000-0000-0000-000000000000';
  cl2c UUID := 'cccc0203-0000-0000-0000-000000000000';
  cl2d UUID := 'cccc0204-0000-0000-0000-000000000000';
  cl2e UUID := 'cccc0205-0000-0000-0000-000000000000';
BEGIN

-- ── AGREEMENTS ────────────────────────────────────────────────────────────
INSERT INTO agreements (
  id, client, tag, type, status, client_status,
  promise_date, start_date, spoc_legal, spoc_finance, spoc_business, spoc_compliance,
  doc_link, client_dates, created_by, created_at, updated_at
) VALUES
  (ag1, 'LKP Finance Limited', 'LKP', 'API / Direct', 'review', 'responded',
   '2026-07-01', '2026-01-10', 'Nitin Kumar', 'Pankaj Mehta', 'Madhvi Singh', 'Nitin Kapoor',
   'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
   '{"draftStart":"2026-01-10","latestModified":"2026-06-04","effectiveDate":"2026-07-01","signingDate":"","endDate":"2027-01-09"}',
   uid_legal, '2026-01-10 10:00:00+05:30', '2026-06-10 11:00:00+05:30'),

  (ag2, 'Axis Bank', 'AXIS', 'API / Direct', 'review', 'negotiating',
   '2026-06-30', '2026-03-05', 'Nitin Kumar', 'Pankaj Mehta', 'Madhvi Singh', 'Nitin Kapoor',
   'https://docs.google.com/document/d/19GynpWHuPzVZqyQXCIcRkkXCl4Zaji0P/edit',
   '{"draftStart":"2026-03-05","latestModified":"2026-06-01","effectiveDate":"2026-07-01","signingDate":"","endDate":"2027-03-04"}',
   uid_legal, '2026-03-05 09:00:00+05:30', '2026-06-08 10:30:00+05:30'),

  (ag3, 'HDFC Bank', 'HDFC', 'White Label', 'pending', 'awaiting',
   '2026-07-15', '2026-04-01', 'Nitin Kumar', 'Pankaj Mehta', 'Madhvi Singh', 'Nitin Kapoor',
   'https://docs.google.com/document/d/17-mhtub5pwUDQT__kfNI8e1Liy5Ox9WA/edit',
   '{"draftStart":"2026-04-01","latestModified":"2026-06-01","effectiveDate":"2026-08-01","signingDate":"","endDate":"2027-07-31"}',
   uid_legal, '2026-04-01 09:00:00+05:30', '2026-06-01 14:00:00+05:30'),

  (ag4, 'IndusInd Bank', 'IND', 'API / Direct', 'review', 'responded',
   '2026-07-01', '2026-05-12', 'Nitin Kumar', 'Pankaj Mehta', 'Madhvi Singh', 'Nitin Kapoor',
   'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
   '{"draftStart":"2026-05-12","latestModified":"2026-06-04","effectiveDate":"2026-07-01","signingDate":"","endDate":"2027-05-11"}',
   uid_legal, '2026-05-12 11:30:00+05:30', '2026-06-05 14:22:00+05:30'),

  (ag5, 'ICICI Bank', 'ICICI', 'API / Direct', 'closed', 'finalised',
   '2026-04-01', '2026-01-05', 'Nitin Kumar', 'Pankaj Mehta', 'Madhvi Singh', 'Nitin Kapoor',
   'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
   '{"draftStart":"2026-01-05","latestModified":"2026-04-01","effectiveDate":"2026-05-01","signingDate":"2026-04-10","endDate":"2027-04-30"}',
   uid_legal, '2026-01-05 09:00:00+05:30', '2026-04-10 12:00:00+05:30'),

  (ag6, 'Kotak Mahindra Bank', 'KMB', 'Reseller', 'reopen', 'responded',
   '2026-05-30', '2026-02-01', 'Nitin Kumar', 'Pankaj Mehta', 'Madhvi Singh', 'Nitin Kapoor',
   'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
   '{"draftStart":"2026-02-01","latestModified":"2026-06-06","effectiveDate":"","signingDate":"","endDate":""}',
   uid_legal, '2026-02-01 11:00:00+05:30', '2026-06-06 15:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- ── TEAM STATUSES ─────────────────────────────────────────────────────────
INSERT INTO team_statuses (agreement_id, team_code, status, aging_days, updated_by, updated_at) VALUES
  (ag1,'L','Approved',0,'Nitin Kumar','2026-05-15 10:00:00+05:30'),
  (ag1,'F','Under Review',3,'Pankaj Mehta','2026-06-10 11:00:00+05:30'),
  (ag1,'C','Pending',0,'—','2026-01-10 10:00:00+05:30'),
  (ag1,'B','Approved',0,'Madhvi Singh','2026-05-18 09:00:00+05:30'),
  (ag2,'L','Under Review',2,'Nitin Kumar','2026-06-08 10:30:00+05:30'),
  (ag2,'F','Under Review',1,'Pankaj Mehta','2026-06-08 10:30:00+05:30'),
  (ag2,'C','Pending',0,'—','2026-03-05 09:00:00+05:30'),
  (ag2,'B','Approved',0,'Madhvi Singh','2026-04-02 10:00:00+05:30'),
  (ag3,'L','Under Review',1,'Nitin Kumar','2026-06-01 14:00:00+05:30'),
  (ag3,'F','Pending',0,'—','2026-04-01 09:00:00+05:30'),
  (ag3,'C','Pending',0,'—','2026-04-01 09:00:00+05:30'),
  (ag3,'B','Pending',0,'—','2026-04-01 09:00:00+05:30'),
  (ag4,'L','Approved',0,'Nitin Kumar','2026-06-01 09:00:00+05:30'),
  (ag4,'F','Under Review',3,'Pankaj Mehta','2026-06-05 14:22:00+05:30'),
  (ag4,'C','Pending',0,'—','2026-05-12 11:30:00+05:30'),
  (ag4,'B','Approved',0,'Madhvi Singh','2026-06-03 10:05:00+05:30'),
  (ag5,'L','Approved',0,'Nitin Kumar','2026-02-10 10:00:00+05:30'),
  (ag5,'F','Approved',0,'Pankaj Mehta','2026-03-01 09:00:00+05:30'),
  (ag5,'C','Approved',0,'Nitin Kapoor','2026-03-10 14:00:00+05:30'),
  (ag5,'B','Approved',0,'Madhvi Singh','2026-02-15 11:00:00+05:30'),
  (ag6,'L','Under Review',3,'Nitin Kumar','2026-06-07 10:30:00+05:30'),
  (ag6,'F','Rejected',5,'Pankaj Mehta','2026-06-06 15:00:00+05:30'),
  (ag6,'C','Pending',0,'—','2026-02-01 11:00:00+05:30'),
  (ag6,'B','Approved',0,'Madhvi Singh','2026-03-10 09:00:00+05:30')
ON CONFLICT (agreement_id, team_code) DO NOTHING;

-- ── REMARKS ───────────────────────────────────────────────────────────────
INSERT INTO remarks (agreement_id, author_name, author_role, text, created_at) VALUES
  (ag1,'Nitin Kumar','Legal','D1 sent — standard E2E Buy & Sell template used. Revenue share at 15% as per business approval.','2026-05-15 10:00:00+05:30'),
  (ag1,'Madhvi Singh','Business','LKP confirmed interest. Client wants payment cycle changed from 30 to 45 days.','2026-05-20 14:30:00+05:30'),
  (ag1,'Pankaj Mehta','Finance','45-day payment cycle acceptable but need prefunded advance account clause confirmed. Awaiting Legal to revise Annexure A.','2026-06-10 11:00:00+05:30'),
  (ag2,'Nitin Kumar','Legal','API template sent. Key additions vs E2E: Proprietary Software clause, API uptime SLA, data security obligations.','2026-03-10 09:00:00+05:30'),
  (ag2,'Madhvi Singh','Business','Axis happy with API access. Dispute on uptime SLA — they want 99.9%, we offered 99.5%.','2026-04-05 15:00:00+05:30'),
  (ag2,'Pankaj Mehta','Finance','Revenue share model needs clarification. Is it on MRP or selling price? Need Legal to specify in Annexure A clearly.','2026-06-08 10:30:00+05:30'),
  (ag3,'Nitin Kumar','Legal','WL template sent. This is more complex — includes WhiteLabel website development, payment gateway, API, and direct sending module. All 4 fulfilment methods included.','2026-04-05 09:00:00+05:30'),
  (ag3,'Madhvi Singh','Business','HDFC is for channel incentivization. Large deal — ~Rs 2Cr annual GMV expected. Client wants custom branding on WL site.','2026-04-10 11:00:00+05:30'),
  (ag3,'Nitin Kumar','Legal','D1 sent. Awaiting client response. Remind in 7 days if no reply.','2026-06-01 14:00:00+05:30'),
  (ag4,'Nitin Kumar','Legal','Draft shared with finance team for review.','2026-06-01 09:00:00+05:30'),
  (ag4,'Pankaj Mehta','Finance','Awaiting clarification on revenue share clause — is the 17% on MRP or selling price?','2026-06-05 14:22:00+05:30'),
  (ag5,'Nitin Kumar','Legal','Fully executed. Signed copies filed. Agreement live from 1 May 2026.','2026-04-10 12:00:00+05:30'),
  (ag6,'Pankaj Mehta','Finance','Rejected. Revenue share of 17% is below our minimum threshold of 18% for resellers. Please rework Annexure A and resubmit.','2026-06-06 15:00:00+05:30'),
  (ag6,'Nitin Kumar','Legal','Noted. Will rework clauses 5 and Annexure A. New draft by June 15.','2026-06-07 10:30:00+05:30')
ON CONFLICT DO NOTHING;

-- ── DRAFTS ────────────────────────────────────────────────────────────────
INSERT INTO drafts (agreement_id, draft_no, direction, note, date, created_by) VALUES
  (ag1,'D1','sent','Initial draft — GyfTR standard E2E Buy & Sell template. Revenue share 15%, 30-day payment cycle, 12-month term.','2026-01-15',uid_legal),
  (ag1,'D2','received','LKP returned with 4 changes: payment cycle 45 days, liability cap increase, non-solicitation period reduced to 6 months, added KYC clause.','2026-02-01',uid_legal),
  (ag1,'D3','sent','GyfTR counter: accepted 45-day payment cycle. Liability cap at 3 months fees. Non-solicitation held at 12 months.','2026-02-20',uid_legal),
  (ag1,'D4','received','LKP accepted D3 terms. Minor edit on escalation matrix contact details only.','2026-06-04',uid_legal),
  (ag2,'D1','sent','Initial draft — API integration template. Includes Proprietary Software clause (Cl.3), API SLA at 99.5% uptime, 30-day payment cycle.','2026-03-10',uid_legal),
  (ag2,'D2','received','Client returned: requested 99.9% uptime SLA, unlimited liability for data breach, removed non-solicitation entirely.','2026-04-01',uid_legal),
  (ag2,'D3','sent','GyfTR counter: 99.7% uptime (compromise), liability cap maintained at 3 months fees, non-solicitation held at 12 months.','2026-05-02',uid_legal),
  (ag2,'D4','received','Client accepted uptime 99.7%. Still disputing liability cap for data breach — wants carve-out for data breach from overall cap.','2026-06-01',uid_legal),
  (ag3,'D1','sent','Initial White Label draft sent — includes WL website development (Annexure C), payment gateway integration, API access, direct sending module, and channel incentivization terms.','2026-06-01',uid_legal),
  (ag4,'D1','sent','Initial draft sent to IndusInd Bank. Standard API template. Revenue share 17%.','2026-05-14',uid_legal),
  (ag4,'D2','received','Client returned — 4 changes: revenue share basis clarification, payment cycle 45 days, SLA uptime 99.7%, liability cap increase.','2026-05-22',uid_legal),
  (ag4,'D3','sent','GyfTR counter sent — accepted 45-day cycle, clarified 17% on selling price, held SLA at 99.5%.','2026-05-30',uid_legal),
  (ag4,'D4','received','IndusInd accepted most terms. Still pushing on SLA — want 99.7%.','2026-06-04',uid_legal),
  (ag5,'D1','sent','Initial draft sent','2026-01-10',uid_legal),
  (ag5,'D2','received','Client returned with minor edits on payment terms and liability cap','2026-01-25',uid_legal),
  (ag5,'D3','sent','Revised and sent back — all terms agreed','2026-02-10',uid_legal),
  (ag5,'D4','sent','Execution copy sent for signature','2026-04-01',uid_legal),
  (ag6,'D1','sent','Initial reseller draft. Revenue share 17%. Non-solicitation 12 months. Payment cycle 30 days.','2026-02-05',uid_legal),
  (ag6,'D2','received','Kotak proposed major revision: revenue share 12%, exclusivity in banking channel, 2-year term.','2026-03-01',uid_legal),
  (ag6,'D3','sent','GyfTR counter: revenue share 17% (firm), no exclusivity, 18-month term.','2026-04-01',uid_legal),
  (ag6,'D4','received','Kotak accepted 17% and 18-month term. Withdrew exclusivity request.','2026-05-15',uid_legal),
  (ag6,'D5','sent','Near-final draft sent for internal approval.','2026-06-01',uid_legal),
  (ag6,'D6','received','Finance internally rejected — needs rework','2026-06-06',uid_legal)
ON CONFLICT DO NOTHING;

-- ── HISTORY LOG ───────────────────────────────────────────────────────────
INSERT INTO history_log (agreement_id, team, changed_by, from_status, to_status, created_at) VALUES
  (ag1,'Legal','Nitin Kumar','—','Pending','2026-01-10 10:00:00+05:30'),
  (ag1,'Legal','Nitin Kumar','Pending','Approved','2026-05-15 10:00:00+05:30'),
  (ag1,'Business','Madhvi Singh','Pending','Approved','2026-05-18 09:00:00+05:30'),
  (ag1,'Finance','Pankaj Mehta','Pending','Under Review','2026-06-10 11:00:00+05:30'),
  (ag2,'Legal','Nitin Kumar','—','Pending','2026-03-05 09:00:00+05:30'),
  (ag2,'Legal','Nitin Kumar','Pending','Under Review','2026-03-10 09:00:00+05:30'),
  (ag2,'Business','Madhvi Singh','Pending','Approved','2026-04-02 10:00:00+05:30'),
  (ag2,'Finance','Pankaj Mehta','Pending','Under Review','2026-06-08 10:30:00+05:30'),
  (ag3,'Legal','Nitin Kumar','—','Pending','2026-04-01 09:00:00+05:30'),
  (ag3,'Legal','Nitin Kumar','Pending','Under Review','2026-06-01 14:00:00+05:30'),
  (ag4,'Legal','Nitin Kumar','—','Pending','2026-05-12 11:30:00+05:30'),
  (ag4,'Legal','Nitin Kumar','Pending','Approved','2026-06-01 09:00:00+05:30'),
  (ag4,'Business','Madhvi Singh','Pending','Approved','2026-06-03 10:05:00+05:30'),
  (ag4,'Finance','Pankaj Mehta','Pending','Under Review','2026-06-05 14:22:00+05:30'),
  (ag5,'Legal','Nitin Kumar','—','Pending','2026-01-05 09:00:00+05:30'),
  (ag5,'Legal','Nitin Kumar','Pending','Approved','2026-02-10 10:00:00+05:30'),
  (ag5,'Business','Madhvi Singh','Pending','Approved','2026-02-15 11:00:00+05:30'),
  (ag5,'Finance','Pankaj Mehta','Under Review','Approved','2026-03-01 09:00:00+05:30'),
  (ag5,'Compliance','Nitin Kapoor','Under Review','Approved','2026-03-10 14:00:00+05:30'),
  (ag5,'Legal','Nitin Kumar','Final Sign','Closed','2026-04-10 12:00:00+05:30'),
  (ag6,'Legal','Nitin Kumar','—','Pending','2026-02-01 11:00:00+05:30'),
  (ag6,'Business','Madhvi Singh','Pending','Approved','2026-03-10 09:00:00+05:30'),
  (ag6,'Finance','Pankaj Mehta','Under Review','Approved','2026-04-20 10:00:00+05:30'),
  (ag6,'Finance','Pankaj Mehta','Approved','Rejected','2026-06-06 15:00:00+05:30')
ON CONFLICT DO NOTHING;

-- ── CLAUSES — AG1 (LKP Finance) ───────────────────────────────────────────
INSERT INTO clauses (id, agreement_id, clause_no, clause_name, outcome, full_context) VALUES
  (cl1a, ag1, '2', 'Scope of Work — Fulfilment Method', 'accepted',
   'Client requested addition of API fulfilment alongside Excel file delivery. GyfTR agreed to include API as an optional fulfilment channel subject to technical integration.'),
  (cl1b, ag1, '5', 'Consideration — Payment Cycle', 'partial',
   'Initial template had 30-day payment cycle. Client cited internal finance processing time and requested 45 days. GyfTR accepted subject to prefunded advance account being maintained.'),
  (cl1c, ag1, '11', 'Non-Solicitation and Anti-Poaching', 'held',
   'Client proposed reducing the non-solicitation period from 12 months to 6 months post-termination. GyfTR held firm at 12 months citing merchant relationship protection.'),
  (cl1d, ag1, '13', 'Indemnity — Liability Cap', 'partial',
   'Template had liability cap at 3 months fees. Client requested increase to 6 months. Settled at 4 months as a compromise.')
ON CONFLICT (agreement_id, clause_no) DO NOTHING;

INSERT INTO clause_changes (clause_id, draft_no, change_text) VALUES
  (cl1a,'D1','GyfTR to send GV/Coupons to Client in a password protected excel file to registered email ID.'),
  (cl1a,'D2','Client requested API integration as primary fulfilment channel in addition to Excel.'),
  (cl1a,'D3','GyfTR accepted. Clause updated: fulfilment via (a) password-protected Excel, or (b) API/Proprietary Software at Client option.'),
  (cl1a,'D4','No further change.'),
  (cl1b,'D1','Client to pay Consideration within 30 days of invoice date. Prefunded advance account to be maintained.'),
  (cl1b,'D2','Client requested 45-day payment cycle citing internal finance approval timelines.'),
  (cl1b,'D3','GyfTR counter-accepted 45 days subject to minimum prefunded balance of Rs 5 Lakhs being maintained at all times.'),
  (cl1b,'D4','Client accepted 45-day cycle and prefunded balance requirement.'),
  (cl1c,'D1','Non-solicitation period: 12 months post termination. Client shall not approach GyfTR merchants directly.'),
  (cl1c,'D2','Client proposed reducing non-solicitation to 6 months post termination.'),
  (cl1c,'D3','GyfTR declined — 12 months is non-negotiable to protect merchant network investment.'),
  (cl1c,'D4','Client accepted 12-month non-solicitation period.'),
  (cl1d,'D1','Liability of GyfTR capped at Consideration paid during 3 months prior to the date of claim.'),
  (cl1d,'D2','Client requested liability cap increased to 6 months of fees paid.'),
  (cl1d,'D3','GyfTR counter-proposed 4 months as compromise.'),
  (cl1d,'D4','Both parties agreed on 4-month liability cap.')
ON CONFLICT (clause_id, draft_no) DO NOTHING;

-- ── CLAUSES — AG2 (Axis Bank) ─────────────────────────────────────────────
INSERT INTO clauses (id, agreement_id, clause_no, clause_name, outcome, full_context) VALUES
  (cl2a, ag2, '2', 'Scope — API Access & Proprietary Software', 'accepted',
   'API template includes Proprietary Software access via secure login. Client to use Digital Code Management System (DCMS) to manage and track GV/Coupon inventory in real time.'),
  (cl2b, ag2, '3', 'Use of Proprietary Software — Security', 'accepted',
   'Client solely responsible for all actions under its account. GyfTR not liable for unauthorized use arising from Client failure to maintain account confidentiality.'),
  (cl2c, ag2, '6', 'API Uptime SLA', 'partial',
   'Client requested 99.9% uptime which GyfTR could not guarantee given current infrastructure. Settled at 99.7% with 4-hour P1 resolution window and monthly credit mechanism.'),
  (cl2d, ag2, '11', 'Non-Solicitation', 'held',
   'Client attempted to remove non-solicitation clause entirely. GyfTR held firm — this clause is in every agreement.'),
  (cl2e, ag2, '13', 'Indemnity — Data Breach Carve-out', 'pending',
   'Client wants data breach liability carved out from the overall 3-month fee cap. GyfTR legal reviewing with compliance. Still unresolved.')
ON CONFLICT (agreement_id, clause_no) DO NOTHING;

INSERT INTO clause_changes (clause_id, draft_no, change_text) VALUES
  (cl2a,'D1','GyfTR to provide API or username/password access to pull GV/Coupons from GyfTR server in real time. Client to use Proprietary Software (DCMS) for tracking.'),
  (cl2a,'D2','Client requested dedicated sandbox environment for testing before go-live.'),
  (cl2a,'D3','GyfTR accepted — sandbox access for 30 days pre-launch included.'),
  (cl2a,'D4','No further change.'),
  (cl2b,'D1','Client solely responsible for account security. Must notify GyfTR immediately of any breach.'),
  (cl2b,'D2','Client requested GyfTR to implement 2FA on the Proprietary Software.'),
  (cl2b,'D3','GyfTR accepted — 2FA to be implemented within 60 days of signing.'),
  (cl2b,'D4','Client accepted. No further change.'),
  (cl2c,'D1','API uptime SLA: 99.5% monthly measured availability. No penalty specified.'),
  (cl2c,'D2','Client requested upgrade to 99.9% uptime with hourly measurement window and 10% credit per breach.'),
  (cl2c,'D3','GyfTR counter: 99.7% uptime, 4-hour P1 resolution, 5% credit per breach capped at 15% per quarter.'),
  (cl2c,'D4','Client accepted 99.7% SLA and 5% credit mechanism.'),
  (cl2d,'D1','Non-solicitation period: 12 months post termination.'),
  (cl2d,'D2','Client proposed removing non-solicitation clause entirely.'),
  (cl2d,'D3','GyfTR declined — non-negotiable. Clause retained as drafted.'),
  (cl2d,'D4','Client accepted non-solicitation clause at 12 months.'),
  (cl2e,'D1','Liability of GyfTR capped at Consideration paid during 3 months prior to date of claim. All liabilities subject to this cap.'),
  (cl2e,'D2','Client demanded data breach liability carved out from cap — unlimited liability for any breach of data security obligations.'),
  (cl2e,'D3','GyfTR declined unlimited liability. Counter: data breach cap at 12 months fees paid, separate from operational cap of 3 months.'),
  (cl2e,'D4','Client partially accepted. Still negotiating cap amount for data breach — client wants 24 months, GyfTR offered 12 months.')
ON CONFLICT (clause_id, draft_no) DO NOTHING;

END $$;

-- ── CLAUSES — AG4 (IndusInd Bank) ─────────────────────────────────────────
DO $$
DECLARE
  cl4a UUID := 'cccc0401-0000-0000-0000-000000000000';
  cl4b UUID := 'cccc0402-0000-0000-0000-000000000000';
  cl4c UUID := 'cccc0403-0000-0000-0000-000000000000';
  cl4d UUID := 'cccc0404-0000-0000-0000-000000000000';
  ag4  UUID := 'bbbb0004-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO clauses (id, agreement_id, clause_no, clause_name, outcome, full_context) VALUES
    (cl4a, ag4, '4', 'Revenue Share — Basis of Calculation', 'partial',
     'Dispute on whether the 17% revenue share applies to MRP or actual selling price. Significant financial impact. Settled on selling price.'),
    (cl4b, ag4, '5', 'Payment Cycle', 'accepted',
     'Template was 30 days. IndusInd requested 45 days citing internal finance processing. Accepted.'),
    (cl4c, ag4, '6', 'API Uptime SLA', 'pending',
     'IndusInd wants 99.7% SLA. GyfTR currently offering 99.5%. Gap remains. Finance needs to approve the penalty structure before Legal can agree.'),
    (cl4d, ag4, '13', 'Liability Cap', 'accepted',
     'Template at 3 months fees. Client requested 6 months. Settled at 4 months.')
  ON CONFLICT (agreement_id, clause_no) DO NOTHING;

  INSERT INTO clause_changes (clause_id, draft_no, change_text) VALUES
    (cl4a,'D1','Revenue share: 17% of net GMV processed through platform.'),
    (cl4a,'D2','Client requested clarification — is 17% on MRP or selling price? Client proposed MRP basis.'),
    (cl4a,'D3','GyfTR counter: 17% on selling price (discounted price at which GV sold to End Customer). Non-negotiable.'),
    (cl4a,'D4','Client accepted 17% on selling price.'),
    (cl4b,'D1','Payment due within 30 days of invoice date.'),
    (cl4b,'D2','Client requested 45-day payment cycle.'),
    (cl4b,'D3','GyfTR accepted 45-day cycle.'),
    (cl4b,'D4','No further change.'),
    (cl4c,'D1','API uptime SLA: 99.5% monthly measured availability.'),
    (cl4c,'D2','Client requested upgrade to 99.7% uptime with 5% monthly credit per breach.'),
    (cl4c,'D3','GyfTR counter: will match 99.7% if penalty capped at 10% per quarter. Sent to Finance for approval.'),
    (cl4c,'D4','Finance has not yet responded. Pending internal approval before GyfTR can confirm.'),
    (cl4d,'D1','Liability cap: 3 months fees paid prior to claim.'),
    (cl4d,'D2','Client requested 6-month liability cap.'),
    (cl4d,'D3','GyfTR counter: 4 months as compromise.'),
    (cl4d,'D4','Client accepted 4-month cap.')
  ON CONFLICT (clause_id, draft_no) DO NOTHING;
END $$;

-- ── CLAUSES — AG5 (ICICI Bank) ────────────────────────────────────────────
DO $$
DECLARE
  cl5a UUID := 'cccc0501-0000-0000-0000-000000000000';
  cl5b UUID := 'cccc0502-0000-0000-0000-000000000000';
  ag5  UUID := 'bbbb0005-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO clauses (id, agreement_id, clause_no, clause_name, outcome, full_context) VALUES
    (cl5a, ag5, '5', 'Payment Terms', 'accepted', 'Payment cycle changed from 30 to 45 days.'),
    (cl5b, ag5, '13', 'Liability Cap', 'partial', 'Settled at 4 months from template 3 months.')
  ON CONFLICT (agreement_id, clause_no) DO NOTHING;

  INSERT INTO clause_changes (clause_id, draft_no, change_text) VALUES
    (cl5a,'D1','30 days'),(cl5a,'D2','Client requested 45 days'),(cl5a,'D3','Accepted'),(cl5a,'D4','Final'),
    (cl5b,'D1','3 months fees'),(cl5b,'D2','Client requested 6 months'),(cl5b,'D3','Counter at 4 months'),(cl5b,'D4','Agreed 4 months')
  ON CONFLICT (clause_id, draft_no) DO NOTHING;
END $$;

-- ── CLAUSES — AG6 (Kotak Mahindra Bank) ──────────────────────────────────
DO $$
DECLARE
  cl6a UUID := 'cccc0601-0000-0000-0000-000000000000';
  cl6b UUID := 'cccc0602-0000-0000-0000-000000000000';
  cl6c UUID := 'cccc0603-0000-0000-0000-000000000000';
  ag6  UUID := 'bbbb0006-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO clauses (id, agreement_id, clause_no, clause_name, outcome, full_context) VALUES
    (cl6a, ag6, '5', 'Revenue Share', 'pending',
     'GyfTR standard reseller revenue share is 18% minimum. Business agreed to 17% without Finance sign-off. Finance has now rejected. Needs rework.'),
    (cl6b, ag6, '11', 'Non-Solicitation', 'held',
     'Kotak attempted to remove non-solicitation clause citing it restricts their reseller model. GyfTR held firm.'),
    (cl6c, ag6, '12', 'Term', 'partial',
     'Template 12 months. Kotak wanted 24 months. Settled at 18 months.')
  ON CONFLICT (agreement_id, clause_no) DO NOTHING;

  INSERT INTO clause_changes (clause_id, draft_no, change_text) VALUES
    (cl6a,'D1','GyfTR revenue share: 18% of net GMV (standard reseller rate).'),
    (cl6a,'D2','Kotak proposed 12% citing thin reseller margin.'),
    (cl6a,'D3','GyfTR counter: 17% flat — accepted by Business team without Finance approval.'),
    (cl6a,'D4','Kotak accepted 17%. Sent for internal GyfTR approval.'),
    (cl6a,'D5','Near-final at 17% submitted to Finance.'),
    (cl6a,'D6','Finance rejected 17% — minimum 18% required for reseller agreements. Must be reworked.'),
    (cl6b,'D1','Non-solicitation: 12 months post termination.'),
    (cl6b,'D2','Kotak requested removal of non-solicitation clause entirely.'),
    (cl6b,'D3','GyfTR declined — mandatory in all reseller agreements.'),
    (cl6b,'D4','Kotak accepted 12-month non-solicitation.'),
    (cl6b,'D5','No change.'),(cl6b,'D6','No change.'),
    (cl6c,'D1','12-month term with auto-renewal on 30-day notice.'),
    (cl6c,'D2','Kotak requested 24-month term.'),
    (cl6c,'D3','GyfTR counter: 18 months as compromise.'),
    (cl6c,'D4','Kotak accepted 18 months.'),
    (cl6c,'D5','No change.'),(cl6c,'D6','No change.')
  ON CONFLICT (clause_id, draft_no) DO NOTHING;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verify with:
-- SELECT id, name, role FROM profiles;          -- should be 4 rows
-- SELECT count(*) FROM agreements;              -- 6
-- SELECT count(*) FROM team_statuses;           -- 24
-- SELECT count(*) FROM remarks;                 -- 14
-- SELECT count(*) FROM drafts;                  -- 23
-- SELECT count(*) FROM history_log;             -- 24
-- SELECT count(*) FROM clauses;                 -- 18
-- SELECT count(*) FROM clause_changes;          -- 68
-- ═══════════════════════════════════════════════════════════════════════════
