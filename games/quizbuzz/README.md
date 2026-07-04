# 🎮 Quiz Buzz - Multiplayer Quiz Game

A real-time multiplayer quiz game built with HTML, CSS, JavaScript, and Supabase. Host creates rooms, players join with a room ID, and everyone answers quiz questions together.

---

## 📋 Features

- Host dashboard for creating rooms and managing quiz state
- Live player joining and progress updates
- Real-time question phase changes for all clients
- Multiple categories and review of answers at the end
- Works across desktop and mobile devices
- Secure local credentials via Supabase config

---

## 📁 Project Structure

```
games/quizbuzz/
├── index.html
├── host.html
├── host.js
├── player.html
├── player.js
├── leaderboard.html
├── leaderboard.js
├── supabase-config.js
├── supabase-schema.sql
├── questions.json
├── styles.css
├── config.example.js
├── SUPABASE_SETUP.md
└── README.md
```

---

## 🚀 Quick Start

1. Create a Supabase project.
2. Run the SQL from [supabase-schema.sql](supabase-schema.sql). It creates the quizbuzz schema and all quiz game tables there.
3. Copy [config.example.js](config.example.js) to [config.local.js](config.local.js).
4. Add your Supabase URL and anon key to [config.local.js](config.local.js).
5. Open [index.html](index.html) and start using the app.

For setup details, see [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

---

## 🎯 How to Play

### Hosts
1. Open [host.html](host.html).
2. Select a quiz category.
3. Create a room.
4. Share the room ID with players.
5. Start the quiz and manage the live flow.

### Players
1. Open [player.html](player.html).
2. Enter the room ID and your name.
3. Join the room.
4. Answer questions as the host advances the quiz.

---

## 🔐 Configuration

Keep your Supabase credentials in [config.local.js](config.local.js), which should stay local and private.

Example:

```js
const supabaseConfigLocal = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-key"
};
```

---

## 🛠️ Troubleshooting

- If the app cannot connect, verify the Supabase URL and anon key.
- If rooms do not update, confirm that the quizbuzz schema and its tables were created successfully.
- If players cannot join, check that the room exists in Supabase.


---

## 🚀 Deployment

**Important**: Before deploying, read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) to understand how to handle Firebase credentials securely in production.

### Quick Deploy Options:

**Firebase Hosting** (Easiest for Firebase):
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

**Netlify/Vercel** (For GitHub-hosted repos):
- Connect your GitHub repo
- Add Firebase credentials as environment variables
- Automatic deployment on push

**GitHub Pages + GitHub Actions** (Most secure static hosting):
- See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for GitHub Actions setup, including the `FIREBASE_DATABASE_URL` repository secret

**Other Platforms**:
- See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed options

---

## 📄 File References

- **Getting Started**: [GETTING_STARTED.md](GETTING_STARTED.md)
- **Setup Guide**: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- **Integration Checklist**: [FIREBASE_INTEGRATION_CHECKLIST.md](FIREBASE_INTEGRATION_CHECKLIST.md)
- **Secrets Management**: [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md)
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) ⭐ Read this before deploying!
- **Questions Database**: [questions.json](questions.json)

---

## 🎓 Learning Resources

This project demonstrates:
- HTML5 semantic structure
- CSS3 flexbox & grid layouts
- JavaScript ES6+ (async/await, arrow functions)
- Real-time database synchronization
- Event-driven architecture
- Responsive web design

---

## 💡 Future Features (To Consider)

- [ ] Score calculations and leaderboards
- [ ] Timed questions
- [ ] Question difficulty levels
- [ ] Custom room names
- [ ] Admin panel to manage questions
- [ ] Chat between host and players
- [ ] Player statistics tracking
- [ ] Multiple quiz modes (team vs individual)

---

## 🤝 Contributing

To add features or fix issues:
1. Create a new branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

## 📞 Support

Stuck? Here's what to check:
1. Firebase credentials in `firebase-config.js`
2. Browser console for JavaScript errors
3. Firebase Console for database connectivity
4. Network tab in DevTools for failed requests
5. [FIREBASE_SETUP.md](FIREBASE_SETUP.md) troubleshooting section

---

## 📄 License

This project is part of Pixel Arcade Lab. Feel free to use and modify!

---

## 🎮 Enjoy Your Quiz!

Quiz Buzz is ready to bring team learning to life. Have fun! 🎉

---

**Last Updated**: May 15, 2026  
**Status**: Ready for Firebase Integration
