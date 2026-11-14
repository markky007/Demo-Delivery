# Security changes: staging and release order

Migrations `00026`–`00032` are code changes only until applied to a database. Do not run
`supabase db push` against production before resolving the two existing `00022` migration
versions and comparing the remote migration history. Use a disposable staging database first.

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
