# 🔐 Firebase Secrets Management

Your Firebase credentials are now secure and won't be exposed in version control!

---

## How It Works

Instead of committing your Firebase credentials to git, we use a local configuration file that's ignored by git:

```
Your Repository (Committed to GitHub)
├── config.example.js ✅ (safe to commit - template)
├── firebase-config.js ✅ (safe to commit - helper)
├── host.html ✅
├── player.html ✅
└── .gitignore (prevents config.local.js from being committed)

Your Local Machine (NOT committed)
└── config.local.js ❌ (never committed - contains your actual keys)
```

---

## ⚠️ Important: This is for Development Only

`config.local.js` only exists on your local machine and won't be deployed to production servers. 

**Before deploying to production**, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for how to:
- Handle credentials on Firebase Hosting
- Use environment variables on Netlify/Vercel  
- Set up GitHub Actions for GitHub Pages
- Deploy securely on other platforms

---

## Setup Instructions

### Step 1: Create Your Local Config File

1. In the `games/quizbuzz/` folder, duplicate `config.example.js`
2. Rename the copy to `config.local.js`
3. Open `config.local.js` and replace the placeholder values with your actual Firebase credentials

```javascript
// config.local.js (your local copy - NEVER commit this!)
const firebaseConfigLocal = {
  apiKey: "AIzaSyC...",  // Your actual API key
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### Step 2: That's It!

- `config.local.js` is automatically git-ignored
- When you open `host.html` or `player.html`, it will load `config.local.js` automatically
- Your credentials stay on your local machine only

---

## File Structure

```
games/quizbuzz/
├── config.example.js          ✅ Template (shared in repo)
├── config.local.js            ❌ Your secrets (NOT in repo)
├── firebase-config.js         ✅ Helper that loads config.local.js
├── host.html                  ✅ Loads config.local.js before firebase-config.js
└── player.html                ✅ Loads config.local.js before firebase-config.js
```

---

## What Gets Committed vs. Ignored

### ✅ Committed to GitHub (Safe)
- `config.example.js` - Just the template structure
- `firebase-config.js` - Logic to load your local config
- `host.html` / `player.html` - Game code
- Everything else in your repo

### ❌ NOT Committed (Git Ignored)
- `config.local.js` - Your actual Firebase credentials
- Any `.env` files
- `node_modules/` (if you add npm)

---

## How It Loads

### In Your Browser (host.html or player.html):

```html
<script src="config.local.js"></script>      <!-- Loads your credentials -->
<script src="firebase-config.js"></script>   <!-- Uses them to initialize Firebase -->
<script src="host.js"></script>              <!-- Game logic uses the config -->
```

### In firebase-config.js:

```javascript
// This checks if config.local.js was loaded
if (typeof firebaseConfigLocal !== 'undefined') {
  firebaseConfig = firebaseConfigLocal;  // Use your actual credentials
} else {
  console.warn('config.local.js not found...');  // Shows helpful message
}
```

---

## If You're Collaborating

### For Your Team:

1. **You (as the project owner):**
   - Keep `config.local.js` on your machine only
   - Commit `config.example.js` to show the structure
   - Never commit `config.local.js`

2. **Your Team Members:**
   - Clone the repo
   - See `config.example.js`
   - Copy it to `config.local.js`
   - Each person adds their own Firebase credentials

### For Shared Firebase Projects:

If your whole team uses the same Firebase project:
1. Share the Firebase credentials **separately** (not in git)
2. Each team member adds them to their own `config.local.js`
3. All credentials remain local, nothing in git

---

## Security Best Practices

✅ **Do This:**
- Keep `config.local.js` only on your machine
- Add it to `.gitignore` (already done!)
- Never paste credentials in Slack, email, or git commits
- Use different Firebase projects for dev/production
- Rotate keys periodically in Firebase Console

❌ **Don't Do This:**
- Commit `config.local.js` to git
- Share credentials via email or chat
- Use the same keys in multiple projects
- Hardcode keys in your code
- Share `.env` files

---

## Verify It's Working

1. **Check `.gitignore`:**
   ```bash
   cat .gitignore
   ```
   Should include: `games/quizbuzz/config.local.js`

2. **Create `config.local.js`:**
   - Copy `config.example.js`
   - Rename to `config.local.js`
   - Add your Firebase credentials

3. **Open `host.html` or `player.html`:**
   - Open browser Developer Tools (F12)
   - Go to Console tab
   - You should NOT see the warning about config.local.js
   - Firebase should initialize successfully

4. **Verify Git Ignores It:**
   ```bash
   git status
   ```
   Should NOT show `config.local.js` in the list

---

## Troubleshooting

### Warning: "config.local.js not found"

**Problem:** You see this warning in the browser console.

**Solution:**
1. Make sure `config.local.js` exists in `games/quizbuzz/`
2. It should be a copy of `config.example.js` with your credentials
3. Reload the page (Ctrl+R or Cmd+R)

### Git Keeps Trying to Commit config.local.js

**Problem:** Git is asking to commit `config.local.js`

**Solution:**
```bash
# Remove it from git tracking
git rm --cached games/quizbuzz/config.local.js

# Verify .gitignore has the entry
cat .gitignore
```

### Firebase Says "Invalid API Key"

**Problem:** You see Firebase auth errors

**Solution:**
- Check that your credentials in `config.local.js` are exactly as shown in Firebase Console
- Make sure you didn't accidentally copy extra spaces or quotes
- Try copying them again from Firebase Console

---

## Environment Variable Alternative (Optional)

If you want even more security, you can use environment variables:

```javascript
// In firebase-config.js
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  // ... etc
};
```

But this requires a build tool (webpack, vite, etc.), so the current `config.local.js` approach is simpler for this project.

---

## Summary

| What | Where | Committed? |
|------|-------|-----------|
| Template structure | `config.example.js` | ✅ Yes |
| Your actual keys | `config.local.js` | ❌ No |
| Loading logic | `firebase-config.js` | ✅ Yes |
| Ignore rules | `.gitignore` | ✅ Yes |

---

## Quick Reference

```bash
# 1. Copy the template
cp config.example.js config.local.js

# 2. Edit config.local.js with your credentials
# (Use your text editor)

# 3. Verify it won't be committed
git status  # Should NOT show config.local.js

# 4. Open host.html or player.html in browser
# Firebase should load successfully!
```

---

## 🚀 Ready to Deploy?

Remember: `config.local.js` **will NOT be deployed** because it's git-ignored!

For production deployment, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) which covers:
- ✅ Firebase Hosting (easiest, native integration)
- ✅ Netlify/Vercel (with environment variables)
- ✅ GitHub Pages (with GitHub Actions & Secrets)
- ✅ Custom servers and other platforms

Choose the right approach for your hosting platform **before you deploy**.

---

Your credentials are now secure! 🔐
