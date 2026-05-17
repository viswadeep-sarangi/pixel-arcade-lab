# Firebase Integration Checklist

## Files Created
- ✅ `firebase-config.js` - Firebase configuration
- ✅ `host.html` - Host dashboard interface
- ✅ `host.js` - Host logic with Firebase placeholders
- ✅ `player.html` - Player join and quiz interface
- ✅ `player.js` - Player logic with Firebase placeholders
- ✅ `styles.css` - Shared styling
- ✅ `questions.json` - Quiz questions database
- ✅ `index.html` - Quiz Buzz home page (updated)

---

## Before You Start: Firebase Setup Checklist

- [ ] Create Firebase project at https://console.firebase.google.com/
- [ ] Create Realtime Database (Test Mode for now)
- [ ] Note your database URL
- [ ] Get Firebase config credentials from Project Settings
- [ ] Copy `config.example.js` to `config.local.js`
- [ ] Add your credentials to `config.local.js` (NOT firebase-config.js!)
- [ ] Verify `config.local.js` is in `.gitignore`
- [ ] (Optional) Enable Anonymous Authentication
- [ ] Set Database Rules (see FIREBASE_SETUP.md)

---

## Code Integration Checklist

### In `config.local.js` (Your Secure Local Config)
- [ ] Copy `config.example.js` to `config.local.js`
- [ ] Replace `YOUR_API_KEY_HERE` with your actual API key
- [ ] Replace `YOUR_PROJECT_ID` with your actual project ID
- [ ] Replace `YOUR_MESSAGING_SENDER_ID_HERE` with your messaging sender ID
- [ ] Replace `YOUR_APP_ID_HERE` with your actual app ID
- [ ] Verify `config.local.js` is NOT listed when you run `git status`

**Note**: `firebase-config.js` will automatically load your credentials from `config.local.js`. You don't need to edit `firebase-config.js`!

### In `host.js`

#### `createRoom()` function
- [ ] Find the comment: `// TODO: Firebase - Create room entry in database`
- [ ] Uncomment the Firebase call: `database.ref('rooms/' + currentRoomId).set(roomData)`
- [ ] Uncomment the `.then()` and `.catch()` handlers

#### `listenForPlayers()` function
- [ ] Find the comment: `// TODO: Firebase - Set up real-time listener for players joining`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId + '/players').on('value', ...)`
- [ ] Uncomment the `updatePlayersList(players)` call

#### `startQuiz()` function
- [ ] Find the comment: `// TODO: Firebase - Update room status to "started"`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId).update({status: "started", ...})`
- [ ] Uncomment the `.then()` and `.catch()` handlers

#### `endSession()` function
- [ ] Find the comment: `// TODO: Firebase - Update room status to "ended"`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId).update({status: "ended", ...})`

#### `displayResults()` function
- [ ] Find the comment: `// TODO: Firebase - Fetch all player answers`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId + '/players').once('value', ...)`

#### `resetRoom()` function
- [ ] Find the comment: `// TODO: Firebase - Clean up current room`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId).remove()`

#### `goBack()` function
- [ ] Find the comment: `// TODO: Firebase - Delete the room if leaving early`
- [ ] Uncomment the room cleanup code

### In `player.js`

#### `joinRoom()` function
- [ ] Find the comment: `// TODO: Firebase - Verify room exists and add player`
- [ ] Uncomment: `database.ref('rooms/' + roomId).once('value', ...)`
- [ ] Uncomment the player data set call
- [ ] Uncomment the `.then()` and `.catch()` handlers

#### `listenForQuizStart()` function
- [ ] Find the comment: `// TODO: Firebase - Listen for room status change`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId).on('value', ...)`
- [ ] Uncomment the status check for 'started'

#### `loadQuizQuestions()` function
- [ ] Find the comment: `// TODO: Firebase - Use category from room data`
- [ ] Add logic to use the `category` parameter from room data

#### `selectAnswer()` function
- [ ] Find the comment: `// TODO: Firebase - Update progress on host dashboard`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId + '/players/' + playerId + '/completedQuestions').set(...)`

#### `completeQuiz()` function
- [ ] Find the comment: `// TODO: Firebase - Save all answers to database`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId + '/players/' + playerId).update({...})`
- [ ] Uncomment the `.then()` and `.catch()` handlers

#### `showResultsScreen()` function
- [ ] Find the comment: `// TODO: Firebase - Listen for host to display results`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId).on('value', ...)`
- [ ] Uncomment the status check for 'ended'

#### `goBack()` function
- [ ] Find the comment: `// TODO: Firebase - Remove player from room`
- [ ] Uncomment: `database.ref('rooms/' + currentRoomId + '/players/' + playerId).remove()`

---

## Testing Checklist

### Local Testing
- [ ] Open `host.html` and create a room
- [ ] Open `player.html` in another tab and join with the room ID
- [ ] Verify players appear on host dashboard
- [ ] Click "Start Quiz" and verify player sees questions
- [ ] Answer questions and verify progress updates
- [ ] Complete quiz and verify results appear

### Firebase Console Verification
- [ ] Log in to Firebase Console
- [ ] Go to Realtime Database → Data
- [ ] Create a room as host
- [ ] Verify room structure appears in database
- [ ] Join as player
- [ ] Verify player entry appears under rooms/{roomId}/players/
- [ ] Answer a question
- [ ] Verify answers are saved in database

### Real Device Testing
- [ ] Test on mobile device (scan QR code or share URL)
- [ ] Verify touch interactions work
- [ ] Check network latency (optional)

---

## Deployment (After Testing)

- [ ] Test on production Firebase project
- [ ] Update Database Rules for security
- [ ] (Optional) Deploy to Firebase Hosting
- [ ] Test with real players

---

## Important Notes

1. **Test Mode Database Rules**: The current setup uses test mode rules which allow anyone to read/write. This is fine for development but **must be changed before production**.

2. **No Authentication**: Currently, the app uses no authentication. For production, implement Firebase Authentication.

3. **Placeholder Comments**: Search for `// TODO: Firebase` in all .js files to find exactly where to uncomment code.

4. **Remove Test Code**: Before deploying, search for "For testing:" comments and remove simulation code.

---

## Common Issues & Solutions

### "Firebase is not defined"
- Ensure firebase-config.js is loaded AFTER Firebase SDK scripts in HTML

### "Permission denied" errors
- Check Database Rules in Firebase Console
- Verify rules allow read/write operations

### Players not seeing updates
- Check browser console for JavaScript errors
- Verify Firebase listeners are properly set up
- Check network tab in DevTools for failed requests

### Room not found error
- Verify Room ID is typed correctly
- Check if room was created successfully in host
- Look in Firebase Console to see if room exists

---

## Support Resources

- See `FIREBASE_SETUP.md` for detailed setup instructions
- Firebase Documentation: https://firebase.google.com/docs/database
- Troubleshooting: https://firebase.google.com/docs/database/troubleshooting

---

## Next Steps

1. Follow the Firebase Setup Guide (`FIREBASE_SETUP.md`)
2. Update `firebase-config.js` with your credentials
3. Go through each file and uncomment the TODO Firebase sections
4. Test locally with host and player
5. Verify data in Firebase Console
6. Deploy when ready!

Good luck! 🚀
