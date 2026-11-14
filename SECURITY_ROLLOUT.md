# Security changes: staging and release order

## Demo-Delivery remote status (2026-11-14)

The linked remote database already contained the schema and all 20 final function bodies from
`00001`–`00025`, but its Supabase CLI migration history was empty. Both `00022` function bodies
matched their original migration files exactly. Their SQL is now consolidated in one local
`00022` migration file so the CLI has one version to track.

With owner approval, CLI history was repaired for `00001`–`00025` without rerunning their SQL.
The dry run then listed only `00026`–`00032`; these seven migrations were pushed successfully.
The remote migration list and local files now match, `supabase db push --dry-run` reports that
the remote is up to date, and `supabase/tests/security_regression.sql` passed on the remote.
The owner UID was provisioned separately through the SQL Editor before the push. Customer and
owner write flows still require an authorized end-to-end check with test data.

## Procedure for other environments

Migrations `00026`–`00032` must be checked against each target database before applying them.
Compare the remote migration history and schema before `supabase db push`. Use a disposable
staging database first.

1. Apply the new migrations to staging and run `supabase/tests/security_regression.sql`.
2. Find the exact Supabase Auth UID of every owner or staff account using the Auth dashboard.
   Provision each UID with a trusted administrator connection (never from the browser):

   ```sql
   INSERT INTO public.owner_users (user_id)
   VALUES ('<owner-auth-uuid>'::uuid)
   ON CONFLICT (user_id) DO NOTHING;
   ```

3. Verify an allowlisted owner can open the owner portal, change an order status and a price,
   and upload a menu image. Verify another authenticated account is denied.
4. Verify a guest can scan a QR, start a dine-in or takeaway session, create and edit an order,
   view only that session's orders/history, and follow queue and table transfers. Test concurrent
   joins to the same dine-in table and an empty order submission.
5. Deploy the matching frontend in a coordinated window. Old customer clients use direct table
   reads that the new RLS policies deny, so they must reload after the database change.

The owner allowlist is intentionally empty and fail-closed. Applying `00031` before step 2
temporarily blocks the owner portal. Keep a trusted administrative connection available for
provisioning and recovery. No migration here alters existing order or bill rows.

The product uses QR possession as the evidence of restaurant presence. Browser geolocation is
advisory only and cannot prove physical presence to the database. The new order RPC verifies
the presented QR and joined guest session. A copied QR remains usable remotely under this
chosen policy; rotate a compromised QR from the owner portal.
