# 🎮 Quiz Buzz - Multiplayer Quiz Game

A real-time multiplayer quiz game built with HTML, CSS, JavaScript, and Firebase. Host creates rooms, players join with a room ID, and everyone answers quiz questions together!

---

## 📋 Features

- **Host Dashboard**: Create quiz rooms, select categories, manage players
- **Real-time Player Tracking**: See players joining and their progress live
- **Live Progress Monitoring**: Watch as players answer questions in real-time
- **Multiple Categories**: Art & Theatre, Geography, Nature, Music (20 questions total)
- **Answer Review**: Host can review all answers after quiz ends
- **Cross-device**: Works on desktop, tablet, and mobile

---

## 📁 Project Structure

```
games/quizbuzz/
├── index.html                          # Home page with Host/Player selection
├── host.html                           # Host dashboard
├── host.js                             # Host logic
├── player.html                         # Player join and quiz interface
├── player.js                           # Player logic
├── firebase-config.js                  # Firebase configuration (UPDATE THIS)
├── questions.json                      # Quiz questions database
├── styles.css                          # Shared styling
├── FIREBASE_SETUP.md                   # Detailed Firebase setup guide
├── FIREBASE_INTEGRATION_CHECKLIST.md   # Code integration checklist
└── README.md                           # This file
```

---

## 🚀 Quick Start

### 1. Set Up Firebase (Required)
Follow the detailed instructions in **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)**:
- Create a Firebase project
- Create a Realtime Database
- Get your Firebase credentials
- Update `firebase-config.js`

### 2. Enable Firebase API Calls
Follow **[FIREBASE_INTEGRATION_CHECKLIST.md](FIREBASE_INTEGRATION_CHECKLIST.md)** to uncomment Firebase code in:
- `host.js`
- `player.js`

### 3. Test the App
- Open `index.html` to see the home page
- Click "Host" to create a quiz room
- Click "Player" in another tab/window to join the room

---

## 🎯 How to Play

### For Hosts:
1. Open `host.html`
2. Select a quiz category (Art & Theatre, Geography, Nature, or Music)
3. Click "Create Room" - you'll get a Room ID
4. Share the Room ID with your team
5. Watch as players join the room (you'll see their names and progress)
6. Click "Start Quiz" when everyone has joined
7. Monitor progress as players answer questions
8. Click "End Session" when everyone is done
9. Review the correct answers together

### For Players:
1. Open `player.html`
2. Enter the Room ID (shared by the host)
3. Enter your name
4. Click "Join Room"
5. Wait for the host to start the quiz
6. When questions appear, read them and click an answer
7. Click "Next Question" to move to the next question
8. After answering all 5 questions, wait for results

---

## 📊 Quiz Categories & Questions

**4 Categories × 5 Questions = 20 Total Questions**

### 1. Art and Theatre (by Elena Rossi)
- Mona Lisa painter
- Michelangelo's sculpture
- Hamlet playwright
- Picasso's art movement
- Van Gogh's ear story

### 2. Geography (by Marcus Chen)
- Japan's capital
- Largest country
- Longest river
- Mount Everest location
- Smallest continent

### 3. Nature (by Dr. Sarah Thompson)
- Largest mammal
- Insect legs
- Photosynthesis gas
- Color-changing animal
- Food-making process

### 4. Music (by James Mitchell)
- Violin strings
- Deaf composer
- Piano keys
- Jazz birthplace
- Musical tempo marking

---

## 🔥 Firebase Database Structure

```
rooms/
  ROOM_ABC123/
    hostId: "host_1234567890_abc"
    category: "Geography"
    status: "waiting" | "started" | "ended"
    createdAt: timestamp
    players/
      player_1234567890_xyz/
        name: "Alice"
        joinedAt: timestamp
        completedQuestions: 3
        answers: [0, 2, 1, null, null]
```

---

## 📝 Configuration

### Update Firebase Config
Edit `firebase-config.js` and replace placeholders:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};
```

---

## 🔧 Development Guide

### Key Files:

**`host.js`** - Host functionality
- `createRoom()` - Create a new quiz room
- `listenForPlayers()` - Monitor players joining
- `startQuiz()` - Start the quiz
- `updatePlayersList()` - Update UI with player progress
- `endSession()` - End quiz and show results

**`player.js`** - Player functionality
- `joinRoom()` - Join an existing room
- `listenForQuizStart()` - Wait for host to start
- `displayCurrentQuestion()` - Show question and options
- `selectAnswer()` - Select an answer option
- `completeQuiz()` - Submit all answers

**`questions.json`** - Quiz database
- 4 categories, 5 questions each
- Each question has 4 options and marked correct answer

---

## 🔐 Security

### Current Setup (Development Only)
- Test Mode database rules (all read/write allowed)
- No authentication required

### For Production:
1. Implement Firebase Authentication
2. Update database rules to restrict access
3. Add validation on backend using Cloud Functions
4. Use HTTPS only
5. Rate limit API calls

---

## 📱 Responsive Design

- ✅ Desktop (1920px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 767px)

Works on Chrome, Firefox, Safari, Edge, and mobile browsers.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Firebase not defined | Load firebase-config.js AFTER Firebase SDK in HTML |
| Permission denied | Check Firebase Database Rules |
| Players not joining | Verify Room ID and Firebase connection |
| Answers not saving | Check browser console for errors |
| Questions not loading | Ensure questions.json is in correct directory |

See **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** for detailed troubleshooting.

---

## 🎨 Customization

### Change Quiz Categories:
Edit `questions.json` to add/modify categories or questions.

### Change Colors:
Edit `styles.css` to modify the color scheme:
- Primary color: `#667eea` (purple)
- Secondary color: `#f5576c` (pink)
- Success color: `#28a745` (green)

### Add More Questions:
Add to the appropriate category in `questions.json` following the structure:
```json
{
  "id": 21,
  "question": "Your question here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0
}
```

---

## 📚 Firebase Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Realtime Database Docs](https://firebase.google.com/docs/database)
- [Security Rules Guide](https://firebase.google.com/docs/database/security)

---

## 🚀 Deployment

### Deploy to Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

### Deploy Elsewhere:
Upload all files to any web hosting service (GitHub Pages, Netlify, Vercel, etc.)

---

## 📄 File References

- **Setup Guide**: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- **Integration Checklist**: [FIREBASE_INTEGRATION_CHECKLIST.md](FIREBASE_INTEGRATION_CHECKLIST.md)
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
