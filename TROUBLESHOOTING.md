# 🔧 YouTube Music Integration - Troubleshooting Guide

## Common Errors and Solutions

### Error: "YouTube API error: 400"

**What it means:** Bad Request - Something is wrong with the request to YouTube's API.

**Possible causes:**

1. **Invalid API Key**
   - API key is malformed or incorrect
   - API key has typos or extra spaces

2. **API Not Enabled**
   - YouTube Data API v3 is not enabled for your project
   - Wrong API is enabled (YouTube Analytics instead of YouTube Data API v3)

3. **API Key Restrictions**
   - API key has HTTP referrer restrictions that block the Supabase server
   - API key is restricted to wrong APIs

**Solutions:**

#### Solution 1: Verify Your API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: **APIs & Services → Credentials**
3. Find your API key
4. Click the **Edit** icon (pencil)
5. **Copy the full API key** (make sure no spaces or extra characters)
6. Re-enter it in Supabase secrets:
   - Name: `YOUTUBE_MUSIC_API_KEY`
   - Value: [paste your API key exactly as shown]

#### Solution 2: Enable YouTube Data API v3

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: **APIs & Services → Library**
3. Search for: **"YouTube Data API v3"** (not YouTube Analytics!)
4. Click on **YouTube Data API v3**
5. Click **ENABLE** button
6. Wait 1-2 minutes for propagation
7. Try searching again

#### Solution 3: Remove API Key Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: **APIs & Services → Credentials**
3. Click on your API key
4. Under **Application restrictions**, select **None**
5. Under **API restrictions**, select **Don't restrict key** (temporarily for testing)
6. Click **Save**
7. Wait 1-2 minutes
8. Try searching again

**Note:** For production, you should restrict the key to only "YouTube Data API v3" but leave HTTP referrer restrictions off since requests come from Supabase servers.

---

### Error: "YouTube Music API key not configured"

**What it means:** The API key is not found in Supabase environment variables.

**Solution:**

1. Check Supabase Dashboard:
   - Go to your Supabase project
   - Navigate to: **Edge Functions → Secrets** (or **Settings → Edge Functions**)
   - Look for `YOUTUBE_MUSIC_API_KEY`

2. If missing, add it:
   - Click **New Secret**
   - Name: `YOUTUBE_MUSIC_API_KEY`
   - Value: [your YouTube Data API v3 key]
   - Click **Save**

3. Redeploy edge functions (may be automatic)

4. Refresh your app and try again

---

### Error: "No results found"

**What it means:** YouTube couldn't find any videos matching your search.

**Solutions:**

1. **Try different search terms:**
   - Good: "Martin Garrix Animals"
   - Bad: "mrt grx anmls"

2. **Search for popular artists:**
   - "The Chainsmokers"
   - "Coldplay"
   - "Ed Sheeran"

3. **Add context to your search:**
   - Instead of: "Animals"
   - Try: "Animals Martin Garrix official"

4. **Check your spelling**

---

### Error: "Quota exceeded" or 403

**What it means:** You've used up your daily API quota.

**Free Tier Limits:**
- 10,000 units per day
- Search costs ~100 units each
- ~100 searches per day maximum

**Solutions:**

1. **Wait 24 hours** - Quota resets at midnight Pacific Time

2. **Check quota usage:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to: **APIs & Services → Dashboard**
   - Click on **YouTube Data API v3**
   - View **Quotas** tab
   - See current usage

3. **Request quota increase:**
   - On the Quotas page
   - Click **Edit Quotas**
   - Fill out the form explaining your use case
   - Google may approve higher limits

4. **Optimize usage:**
   - Cache search results
   - Don't search repeatedly for the same query
   - Use specific search terms to find songs faster

---

### Error: "Failed to fetch thumbnail"

**What it means:** The color extraction endpoint couldn't load the YouTube thumbnail.

**Impact:** Low - The song will still be added with default colors.

**Solutions:**
- This error doesn't prevent song addition
- Colors will use random generation instead
- No action needed

---

### Error: "CORS error" or "Network request failed"

**What it means:** Your browser is blocking the request or can't reach Supabase.

**Solutions:**

1. **Check Internet Connection**
   - Make sure you're online
   - Try loading another website

2. **Check Supabase Status**
   - Is your Supabase project running?
   - Check Supabase dashboard for any issues

3. **Check Edge Function Deployment**
   - Go to Supabase Dashboard
   - Navigate to: **Edge Functions**
   - Ensure `make-server-6ed35f1d` is deployed
   - Check deployment logs for errors

4. **Browser Console**
   - Open Developer Tools (F12)
   - Check Console tab for specific error messages
   - Look for red error messages

---

### Error: "Video not found" (404)

**What it means:** The specific YouTube video couldn't be retrieved.

**Solutions:**
- This is rare and usually means the video was deleted
- Try searching for a different song
- The search should work but this specific video has issues

---

## Debug Checklist

Use this checklist to diagnose issues:

### Backend (Supabase) Checks

- [ ] **API key exists in Supabase secrets**
  - Go to: Supabase → Edge Functions → Secrets
  - Verify: `YOUTUBE_MUSIC_API_KEY` is present

- [ ] **API key is correct**
  - Copy from Google Cloud Console
  - Paste exactly (no spaces, no quotes)

- [ ] **Edge function is deployed**
  - Go to: Supabase → Edge Functions
  - Check deployment status

- [ ] **Check edge function logs**
  - Go to: Supabase → Edge Functions → Logs
  - Look for error messages
  - Check for API key validation logs

### Google Cloud Checks

- [ ] **YouTube Data API v3 is enabled**
  - Go to: APIs & Services → Library
  - Search: "YouTube Data API v3"
  - Status should be: "ENABLED"

- [ ] **API key is valid**
  - Go to: APIs & Services → Credentials
  - Click on your API key
  - Verify it's not expired or deleted

- [ ] **No restrictive API key settings**
  - Application restrictions: None (for testing)
  - API restrictions: YouTube Data API v3 only
  - HTTP referrer restrictions: None

- [ ] **Quota is not exceeded**
  - Go to: APIs & Services → Dashboard
  - Click: YouTube Data API v3
  - Check: Quotas tab
  - Verify: Not at 10,000 units

### Frontend Checks

- [ ] **Browser console shows no errors**
  - Open: Developer Tools (F12)
  - Tab: Console
  - Look for: Red error messages

- [ ] **Network requests are working**
  - Open: Developer Tools (F12)
  - Tab: Network
  - Filter: Fetch/XHR
  - Search and check request/response

- [ ] **Correct Supabase project ID**
  - Check: `/utils/supabase/info.tsx`
  - Verify: projectId matches your Supabase project

## How to Get Detailed Error Information

### 1. Backend Logs (Supabase)

```
Go to: Supabase Dashboard
→ Edge Functions
→ Click on your function
→ View Logs tab

Look for messages like:
✅ "Searching YouTube Music for: [query]"
✅ "Found X results for query: [query]"
❌ "YouTube API search error: 400 - [details]"
```

### 2. Frontend Console (Browser)

```
Press F12 to open Developer Tools
→ Console tab

Look for messages like:
✅ "Found YouTube results"
❌ "YouTube Music search error: Error: [details]"
```

### 3. Network Tab (Browser)

```
Press F12 to open Developer Tools
→ Network tab
→ Click on the failed request
→ Preview/Response tab

Check the error response:
{
  "error": "Detailed error message",
  "details": "Additional context",
  "status": 400
}
```

## Quick Fixes

### Reset Everything (Nuclear Option)

If nothing works, try this:

1. **Delete API key from Supabase**
2. **Create new API key in Google Cloud**
3. **Re-enable YouTube Data API v3**
4. **Add new API key to Supabase**
5. **Wait 2-3 minutes**
6. **Clear browser cache**
7. **Refresh page and try again**

### Test with cURL

Test if the backend is working directly:

```bash
# Test health endpoint
curl https://ixrhgldxlbxffatbtqnw.supabase.co/functions/v1/make-server-6ed35f1d/health

# Test search endpoint (replace YOUR_ANON_KEY)
curl -X POST https://ixrhgldxlbxffatbtqnw.supabase.co/functions/v1/make-server-6ed35f1d/youtube/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"query":"test"}'
```

If cURL works but the UI doesn't, the issue is in the frontend.
If cURL doesn't work, the issue is in the backend/API key.

## Still Having Issues?

### Check These Files

1. **Backend endpoint:** `/supabase/functions/server/index.tsx`
   - Should have 3 YouTube endpoints
   - Should log detailed errors

2. **Frontend component:** `/src/app/components/YouTubeMusicSearch.tsx`
   - Should show error messages
   - Should handle 400 errors

3. **Supabase info:** `/utils/supabase/info.tsx`
   - Should have correct projectId
   - Should have correct publicAnonKey

### Get More Help

1. **Check browser console** - Press F12, look at Console and Network tabs
2. **Check Supabase logs** - Dashboard → Edge Functions → Logs
3. **Verify API key** - Copy fresh from Google Cloud Console
4. **Test with simple query** - Try searching "test" or "music"

## Common Mistakes

❌ **Using wrong API**
- Don't use: YouTube Analytics API
- Use: YouTube Data API v3

❌ **Copy/paste errors**
- API key has spaces
- API key has quotes
- API key is truncated

❌ **Not waiting for propagation**
- After enabling API: Wait 1-2 minutes
- After adding key: Wait 1-2 minutes
- After changing restrictions: Wait 1-2 minutes

❌ **Wrong secret name**
- Must be exactly: `YOUTUBE_MUSIC_API_KEY`
- Not: `YOUTUBE_API_KEY`
- Not: `YOUTUBE_MUSIC_KEY`

---

## Success Indicators

When everything is working correctly, you should see:

✅ **In Supabase Logs:**
```
Searching YouTube Music for: "test"
Using API key: AIzaSyD...
Request URL: https://www.googleapis.com/youtube/v3/search?...
Found 10 results for query: "test"
```

✅ **In Browser Console:**
```
(No errors - clean console)
```

✅ **In UI:**
```
- Search results appear
- Thumbnails load
- Can click "Add" button
- Song appears in library
```

---

**Most 400 errors are due to invalid API keys or API not being enabled. Follow Solution 1 and 2 above first!**
