# Database Fixes - December 18, 2025

## Issues Fixed

### 1. Missing `notifications` Table (404 Error)

**Problem:**
- The admin dashboard was trying to query the `notifications` table which didn't exist
- Error: `Could not find the table 'public.notifications' in the schema cache`
- The database only had `notification_templates` table but not the actual user notifications table

**Solution:**
- Created migration `20251218140000_create_notifications.sql`
- Added `notifications` table with proper structure:
  - User-specific notifications storage
  - Links to orders and announcements
  - Read/unread status tracking
  - RLS policies for user privacy
- Added helper functions:
  - `create_notification()` - Create new notifications
  - `mark_notification_as_read()` - Mark single notification as read
  - `mark_all_notifications_as_read()` - Mark all user notifications as read

### 2. `app_contents` Table Access Denied (500 Error)

**Problem:**
- The API endpoint `/api/admin/settings/contents` was returning 500 error
- Admin user `admin@modusrepair.com` couldn't access the `app_contents` table
- RLS policy was checking for emails ending with `@admin.modusrepair.com` but the actual admin email is `admin@modusrepair.com`

**Solution:**
- Created migration `20251218141000_fix_app_contents_rls.sql`
- Updated RLS policy to allow access for:
  - Users with `ADMIN` or `MANAGER` role
  - Users with email ending in `@admin.modusrepair.com`
  - Specifically the user `admin@modusrepair.com`

## Migration Status

All migrations successfully applied:

```
Local          | Remote         | Time (UTC)          
---------------|----------------|---------------------
20251210151815 | 20251210151815 | 2025-12-10 15:18:15 
20251216222909 | 20251216222909 | 2025-12-16 22:29:09 
20251217000000 | 20251217000000 | 2025-12-17 00:00:00 
20251218140000 | 20251218140000 | 2025-12-18 14:00:00 
20251218141000 | 20251218141000 | 2025-12-18 14:10:00 
```

## Files Created/Modified

### New Migration Files:
1. `/Users/jangjihoon/modo/supabase/migrations/20251218140000_create_notifications.sql`
   - Creates `notifications` table
   - Adds RLS policies
   - Creates helper functions

2. `/Users/jangjihoon/modo/supabase/migrations/20251218141000_fix_app_contents_rls.sql`
   - Fixes RLS policy for `app_contents` table
   - Allows admin access

### Modified Files:
1. `/Users/jangjihoon/modo/supabase/migrations/20251217000000_create_app_contents.sql`
   - Updated to use `CREATE TABLE IF NOT EXISTS`
   - Added conditional policy creation to prevent errors on re-run

## Testing

After these fixes, the following should work:

1. ✅ Admin dashboard notifications popover should load without 404 errors
2. ✅ `/api/admin/settings/contents` endpoint should return 200 status
3. ✅ Admin user can view and edit app contents (price list, guides, terms, privacy policy)
4. ✅ Notifications can be created and displayed for users

## Next Steps

1. Refresh the admin dashboard page to see the fixes in action
2. Test the notifications popover - it should show "알림이 없습니다" instead of errors
3. Navigate to Settings > Contents to verify the API is working
4. Consider adding some test notifications to verify the notification system works

## Notes

- The `notification_templates` table already existed and contains templates for different notification types
- The new `notifications` table stores actual notification instances sent to users
- RLS policies ensure users can only see their own notifications
- Admins can manage all notifications and content

