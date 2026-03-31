# 🔧 Fix "API key not valid" Error

## Quick Diagnosis

I've added a **test endpoint** and **diagnostic tools** to help fix your API key issue.

---

## Method 1: Use the API Key Tester (Easiest)

1. **Open the tester page:**
   - Open `/API_KEY_TESTER.html` in your browser
   - Or navigate to it in your project

2. **Click "Test API Key"**
   - It will check if your API key is configured
   - It will verify if the API key works with YouTube
   - It will show detailed error messages

3. **Follow the instructions shown**
   - If successful: ✅ You're done!
   - If failed: Follow the suggestions provided

---

## Method 2: Test via Browser Console (Quick)

Open your browser console (F12) and run this:

```javascript
// Test the API key
fetch('https://ixrhgldxlbxffatbtqnw.supabase.co/functions/v1/make-server-6ed35f1d/youtube/test-key')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Expected output if working:**
```json
{
  "success": true,
  "message": "YouTube API key is valid and working!",
  "apiKeyPreview": "AIzaSyD...xyz",
  "testResult": "Successfully connected to YouTube Data API v3"
}
```

**Expected output if broken:**
```json
{
  "success": false,
  "error": { ... },
  "suggestions": [
    "1. Verify API key is correct (should start with 'AIza')",
    "2. Enable YouTube Data API v3 in Google Cloud Console",
    "3. Check API key restrictions",
    "4. Wait 1-2 minutes after creating/modifying"
  ]
}
```

---

## Method 3: Check Supabase Logs (Detailed)

1. **Go to Supabase Dashboard**
2. **Navigate to:** Edge Functions → Logs
3. **Look for these messages:**

**✅ If API key is working:**
```
Testing YouTube API key: AIzaSyD...xyz
API key length: 39 characters
YouTube API test successful!
```

**❌ If API key is missing:**
```
API key not found in environment variables
```

**❌ If API key is invalid:**
```
YouTube API test failed: 400
Error response: { "error": { "message": "API key not valid" } }
```

---

## Common Issues and Solutions

### Issue 1: "API key not found in environment variables"

**Problem:** You haven't added the API key to Supabase yet.

**Solution:**
1. A secret modal should have appeared - use it to add your key
2. Or manually go to: Supabase Dashboard → Edge Functions → Secrets
3. Create new secret:
   - Name: `YOUTUBE_MUSIC_API_KEY`
   - Value: Your YouTube Data API v3 key (from Google Cloud)
4. Save

### Issue 2: "API key not valid"

**Problem:** The API key is incorrect or not properly configured.

**Checklist:**
- [ ] API key starts with `AIza` (39 characters long)
- [ ] Copied the ENTIRE key (no truncation)
- [ ] No extra spaces before/after the key
- [ ] YouTube Data API v3 is ENABLED in Google Cloud
- [ ] API key restrictions allow server requests (Application restrictions: None)
- [ ] Waited 1-2 minutes after creating/modifying the key

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: APIs & Services → Credentials
3. Find your API key
4. Click the **Copy** icon to copy the full key
5. Go to Supabase → Edge Functions → Secrets
6. **Update** the `YOUTUBE_MUSIC_API_KEY` secret with the correct key
7. Wait 1-2 minutes
8. Test again

### Issue 3: "YouTube Data API has not been used in project"

**Problem:** YouTube Data API v3 is not enabled for your Google Cloud project.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: APIs & Services → Library
3. Search for: **"YouTube Data API v3"** (exactly this, not Analytics!)
4. Click on it
5. Click **"ENABLE"**
6. Wait 1-2 minutes
7. Test again

### Issue 4: API key has restrictive settings

**Problem:** API key restrictions are blocking server requests.

**Solution:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Under **"Application restrictions"**: Select **"None"**
4. Under **"API restrictions"**: 
   - Select **"Restrict key"**
   - Check ONLY: **"YouTube Data API v3"**
5. Click **"Save"**
6. **Wait 2-3 minutes** for changes to propagate
7. Test again

---

## Step-by-Step: Create a New API Key (Fresh Start)

If nothing works, create a brand new API key:

### 1. Google Cloud Console Setup

```
Go to: https://console.cloud.google.com

1. Select your project (or create new one)
2. Sidebar → APIs & Services → Library
3. Search: "YouTube Data API v3"
4. Click it → Click "ENABLE"
5. Wait for "API enabled" confirmation
```

### 2. Create API Key

```
1. Sidebar → APIs & Services → Credentials
2. Click: "+ CREATE CREDENTIALS"
3. Select: "API Key"
4. A popup shows your key → COPY IT IMMEDIATELY
5. It looks like: AIzaSyDxxxx_xxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Configure API Key (IMPORTANT!)

```
1. Click "RESTRICT KEY" (in the popup)
   OR go back to Credentials and click the key

2. Application restrictions:
   ◉ None
   ○ HTTP referrers
   ○ IP addresses
   
3. API restrictions:
   ◉ Restrict key
   ☑ YouTube Data API v3  ← CHECK THIS
   ☐ Other APIs           ← UNCHECK ALL OTHERS
   
4. Click "SAVE"
5. WAIT 2-3 MINUTES (very important!)
```

### 4. Add to Supabase

```
1. Go to your Supabase project dashboard
2. Left sidebar → Edge Functions
3. Click on "Secrets" or "Edge Functions Settings"
4. Click "+ New Secret"
5. Enter:
   Name: YOUTUBE_MUSIC_API_KEY
   Value: [paste your API key - the AIza... string]
6. Click "Add Secret" or "Save"
7. WAIT 1 MINUTE
```

### 5. Test It

```
Option A: Open /API_KEY_TESTER.html and click "Test API Key"

Option B: In browser console:
fetch('https://ixrhgldxlbxffatbtqnw.supabase.co/functions/v1/make-server-6ed35f1d/youtube/test-key')
  .then(res => res.json())
  .then(data => console.log(data));

Option C: Try searching in the music player
```

---

## Verification Checklist

Before testing, verify:

- [ ] YouTube Data API v3 is **ENABLED** in Google Cloud
- [ ] API key is **COPIED** correctly (starts with `AIza`, 39 chars)
- [ ] API key has **NO SPACES** before/after
- [ ] Application restrictions: **NONE**
- [ ] API restrictions: **YouTube Data API v3 ONLY**
- [ ] Secret name is exactly: `YOUTUBE_MUSIC_API_KEY`
- [ ] Waited **2-3 minutes** after saving
- [ ] Tested using the test endpoint

---

## What I Fixed in the Code

1. **Added test endpoint:** `/youtube/test-key`
   - Tests if API key exists
   - Tests if API key is valid
   - Returns helpful error messages

2. **Better error logging:**
   - Shows API key preview (first 10 + last 4 chars)
   - Shows API key length
   - Shows full YouTube error response

3. **Trim whitespace:**
   - Automatically removes spaces from API key
   - Prevents "invalid API key" errors from copy/paste

4. **Created diagnostic tools:**
   - `/API_KEY_TESTER.html` - Visual tester
   - Test endpoint for programmatic testing
   - Enhanced logging in Supabase

---

## Still Not Working?

### Double-check the API key:

1. **Length:** Should be 39 characters
2. **Format:** Should start with `AIza`
3. **Example:** `AIzaSyDxxxx_xxxxxxxxxxxxxxxxxxxxxxxxx`

### Verify in Supabase:

```
1. Supabase Dashboard
2. Project Settings or Edge Functions
3. Secrets or Environment Variables
4. Look for: YOUTUBE_MUSIC_API_KEY
5. Value should be the full API key
```

### Check Google Cloud Console:

```
1. Go to: APIs & Services → Dashboard
2. Click: YouTube Data API v3
3. Should show: "API enabled"
4. Check quota: Should have available quota
```

---

## Final Test

Once you've added/fixed your API key:

1. **Wait 2-3 minutes** (very important!)
2. **Open the music player**
3. **Click the Plus (+) button**
4. **Click "SEARCH YOUTUBE MUSIC"**
5. **Search for: "test"**
6. **Should show results!** ✅

---

## Need More Help?

1. **Check Supabase Logs:**
   - Shows exact error from YouTube API
   - Shows API key being used (preview)

2. **Check Browser Console (F12):**
   - Shows frontend errors
   - Shows API responses

3. **Use the test endpoint:**
   - Fastest way to diagnose
   - Shows clear error messages

---

**The most common issue is not waiting 1-2 minutes after creating/modifying the API key!**

**Second most common: YouTube Data API v3 not enabled in Google Cloud Console.**

**Third most common: Wrong secret name (must be exactly `YOUTUBE_MUSIC_API_KEY`)**
