# 🚀 Deployment & Production Credentials Guide

This guide explains how to handle Firebase credentials when deploying Quiz Buzz to production.

---

## ❓ The Problem

- `config.local.js` is git-ignored (stays on your local machine only)
- GitHub repo doesn't have `config.local.js`
- Hosting services can't deploy what's not in the repo
- Your app won't have Firebase credentials in production

---

## ✅ Solutions by Deployment Platform

### **Option 1: Firebase Hosting (Recommended for Firebase projects)**

Firebase Hosting integrates seamlessly with Firebase.

#### Setup:
1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Initialize Firebase in your project:
```bash
firebase login
firebase init hosting
```

3. In `firebase-config.js`, you can commit the public API key because:
   - Firebase Security Rules protect your data
   - API key restrictions limit what it can do
   - Database Rules ensure only authorized users can read/write

#### Modified Approach:
```javascript
// firebase-config.js - Safe to commit for Firebase Hosting
const firebaseConfig = {
  apiKey: "YOUR_PUBLIC_API_KEY",  // Can be public with security rules
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

Deploy:
```bash
firebase deploy
```

---

### **Option 2: Netlify (With Environment Variables)**

Netlify supports environment variables through `.netlify/functions` or build-time injection.

#### Setup:
1. Push your repo to GitHub
2. Connect to Netlify from GitHub
3. In Netlify Dashboard → Site Settings → Build & Deploy → Environment
4. Add environment variables:
   ```
   FIREBASE_API_KEY = your-api-key
   FIREBASE_PROJECT_ID = your-project-id
   FIREBASE_DATABASE_URL = https://your-project-id-default-rtdb.firebaseio.com
   (... etc for all fields)
   ```

5. Modify `firebase-config.js` to read from environment:
```javascript
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
```

**⚠️ Issue**: This requires a build tool (webpack, Vite, etc.) to inject environment variables at build time.

---

### **Option 3: Vercel (With Environment Variables)**

Similar to Netlify.

#### Setup:
1. Connect your GitHub repo to Vercel
2. In Project Settings → Environment Variables
3. Add all Firebase credentials as environment variables
4. Use the same `process.env` approach in `firebase-config.js`

---

### **Option 4: GitHub Pages (Simple Static Hosting)**

GitHub Pages serves static files directly, no build process.

#### Setup - Use config.local.js Everywhere:

Since GitHub Pages has no build step, you have two approaches:

**Approach A: Commit the keys (Not Recommended)**
- Commit `config.local.js` with your credentials
- ⚠️ Security risk: Keys are visible on GitHub
- Not recommended for real projects

**Approach B: Create config.local.js Manually on GitHub Pages**
- Use GitHub Actions to create the file during deployment
- Create a `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Create config.local.js
        env:
          FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          FIREBASE_DATABASE_URL: ${{ secrets.FIREBASE_DATABASE_URL }}
          FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
        run: |
          cat > games/quizbuzz/config.local.js << EOF
          const firebaseConfigLocal = {
            apiKey: "${{ env.FIREBASE_API_KEY }}",
            authDomain: "${{ env.FIREBASE_AUTH_DOMAIN }}",
            databaseURL: "${{ env.FIREBASE_DATABASE_URL }}",
            projectId: "${{ env.FIREBASE_PROJECT_ID }}",
            storageBucket: "${{ env.FIREBASE_STORAGE_BUCKET }}",
            messagingSenderId: "${{ env.FIREBASE_MESSAGING_SENDER_ID }}",
            appId: "${{ env.FIREBASE_APP_ID }}"
          };
          EOF
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

Then add secrets to GitHub:
1. Go to your repo → Settings → Secrets and variables → Actions
2. Add each Firebase credential as a secret
3. Next push will automatically create `config.local.js` and deploy

---

### **Option 5: Custom Server (Node.js/Express)**

If you run your own server, you can:

1. Keep `config.local.js` on server only
2. Or use environment variables in your hosting environment
3. Create `/api/config` endpoint that returns safe config

```javascript
// On your server
app.get('/api/config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    // ... etc
  });
});
```

```javascript
// In firebase-config.js
fetch('/api/config')
  .then(res => res.json())
  .then(config => {
    firebaseConfig = config;
    firebase.initializeApp(config);
  });
```

---

## 🎯 Recommended Approach by Scenario

| Scenario | Best Option | Why |
|----------|------------|-----|
| Development (Local) | `config.local.js` (current) | Keys stay private on your machine |
| Firebase Hosting | Option 1 | Native Firebase integration |
| Netlify | Option 3 | Built-in environment variable support |
| Vercel | Option 3 | Built-in environment variable support |
| GitHub Pages | Option 4 with GitHub Actions | Secure, automated deployment |
| Custom Server | Option 5 | Full control over credentials |

---

## 🔐 Security Considerations for Each Approach

### Firebase Hosting (Option 1) - SAFE ✅
- API key is public (it's in browser anyway)
- Security Rules protect your database
- API Key Restrictions add extra layer

### Environment Variables (Options 2, 3, 5) - SAFE ✅
- Credentials never in source code
- Only available during build/runtime
- Varies by platform

### GitHub Actions (Option 4) - SAFE ✅
- Uses GitHub Secrets (encrypted)
- Generates file only during deployment
- File not stored in repo

### GitHub Pages Direct (Not Recommended) - UNSAFE ❌
- API keys visible on GitHub
- Anyone can see your credentials
- Can lead to abuse/quota issues

---

## 📋 Quick Implementation Guide

### For Local Development (Already Done)
```
games/quizbuzz/
├── config.example.js       ← Template
├── config.local.js         ← Your local credentials (git-ignored)
├── firebase-config.js      ← Loads config.local.js
```

### For Firebase Hosting
```
1. npm install -g firebase-tools
2. firebase init hosting
3. Update firebase-config.js to use hardcoded config (safe with security rules)
4. firebase deploy
```

### For Netlify/Vercel
```
1. Push to GitHub
2. Connect to Netlify/Vercel
3. Add environment variables in dashboard
4. Update firebase-config.js to use process.env
5. Add build step if needed
```

### For GitHub Pages + GitHub Actions
```
1. Create .github/workflows/deploy.yml (see above)
2. Add GitHub Secrets for each Firebase credential, including `FIREBASE_DATABASE_URL`
3. Push code → GitHub Actions creates config.local.js and deploys
```

---

## ⚠️ Important: Do NOT Hardcode Credentials in Repository

```javascript
// ❌ WRONG - Never do this
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdef",  // EXPOSED!
  projectId: "my-secret-project",     // EXPOSED!
  // ...
};

// ✅ RIGHT - Use one of the approaches above
```

---

## 🔑 Firebase API Key Restrictions (Extra Security)

Even with public API keys, add restrictions:

1. Go to Firebase Console → APIs & Services → Credentials
2. Find your API Key
3. Click it to edit
4. Under "API restrictions", select "Realtime Database API"
5. Under "HTTP referrers", add your domain(s)

This prevents abuse even if someone has your key.

---

## 🚀 What Should You Do Right Now?

Choose based on where you want to deploy:

1. **Using Firebase Hosting?**
   - Follow Option 1 above
   - You can safely commit the full config

2. **Using Netlify/Vercel?**
   - Follow Option 2 or 3
   - Need a build tool setup

3. **Using GitHub Pages?**
   - Follow Option 4 with GitHub Actions
   - Most complex but very secure

4. **Just developing locally for now?**
   - Keep current setup with `config.local.js`
   - Decide deployment method later

---

## 📚 Additional Resources

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Pages Deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)

---

## 💡 TL;DR

**Development**: `config.local.js` (git-ignored) ✅

**Production**: Choose a platform and method above. Most people use:
- **Firebase Hosting** (easiest for Firebase projects)
- **Netlify/Vercel** (easiest for static sites with build tools)
- **GitHub Actions** (most control with GitHub Pages)

Your credentials stay secure in all cases! 🔒
