# Firebase Setup Guide for Quiz Buzz

## Overview
This guide will walk you through setting up Firebase for the Quiz Buzz multiplayer quiz game.

## What is Firebase?
Firebase is a backend-as-a-service platform by Google that provides:
- **Realtime Database**: Stores and syncs data in real-time across all clients
- **Authentication**: User sign-in and identity management
- **Hosting**: Deploy your web app
- **Cloud Functions**: Run backend code

For Quiz Buzz, we primarily use the **Realtime Database** to:
- Store room data
- Track players joining
- Monitor player progress
- Sync quiz state across host and players

---

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or **"Add project"**
3. Enter a project name (e.g., "pixel-arcade-lab")
4. Disable Google Analytics (optional, you can enable it later)
5. Click **"Create project"** and wait for it to complete
6. When done, click **"Continue"** to go to the project dashboard

---

## Step 2: Set Up Realtime Database

1. In the Firebase Console, go to **Build** → **Realtime Database**
2. Click **"Create Database"**
3. Choose your database location (select one closest to your region)
4. Choose security rules mode:
   - **Start in test mode** (for development - allows all read/write)
   - **Start in locked mode** (production - more secure, requires auth)
   
   **For now, choose "Test Mode"** to make setup easier

5. Click **"Enable"** to create the database

Your database URL will look like: `https://your-project-id.firebaseio.com`

---

## Step 3: Set Up Security Rules

1. In the **Realtime Database** section, go to the **Rules** tab
2. Replace the default rules with the following:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "players": {
          "$playerId": {
            ".read": true,
            ".write": true
          }
        }
      }
    }
  }
}
```

3. Click **"Publish"** to save the rules

**Note**: These rules allow open read/write access. For production, you should:
- Implement authentication
- Use more restrictive rules based on user IDs
- Validate data on the backend using Cloud Functions

---

## Step 4: Get Your Firebase Configuration

1. In the Firebase Console, go to **Project Settings** (⚙️ icon)
2. Under the **Your apps** section, click the **Web** icon (`</>`)
3. If you haven't registered an app, enter a name (e.g., "Quiz Buzz")
4. You'll see a code snippet like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "project-id.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

5. Copy these values

---

## Step 5: Update Firebase Config in Your Code

1. Open `games/quizbuzz/firebase-config.js`
2. Replace the placeholder values with your actual Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",  // Replace with your apiKey
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",  // Replace
  projectId: "YOUR_PROJECT_ID_HERE",  // Replace
  storageBucket: "YOUR_PROJECT_ID.appspot.com",  // Replace
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",  // Replace
  appId: "YOUR_APP_ID_HERE"  // Replace
};
```

3. Save the file

---

## Step 6: Enable Anonymous Authentication (Optional but Recommended)

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get Started"**
3. Go to the **Sign-in method** tab
4. Click **"Anonymous"** and toggle it **On**
5. Click **"Save"**

This allows players to join without creating accounts.

---

## Firebase Database Structure

The code uses the following database structure:

```
rooms/
  ROOM_ABC123/
    hostId: "host_1234567890_abc123"
    category: "Geography"
    status: "waiting" | "started" | "ended"
    createdAt: "2024-05-15T10:30:00Z"
    players/
      player_1234567890_xyz789/
        name: "John"
        joinedAt: "2024-05-15T10:31:00Z"
        completedQuestions: 3
        answers: [0, 2, 1, null, null]
```

---

## How the Game Flow Works with Firebase

### 1. Host Creates Room
```
Host clicks "Create Room" → Room entry created in Firebase database
→ Room ID generated → Players can now join
```

### 2. Players Join
```
Player enters Room ID + Name → Player entry added to Firebase
→ Host sees real-time list of joining players
```

### 3. Host Starts Quiz
```
Host clicks "Start Quiz" → Room status changed to "started" in Firebase
→ All connected players receive event → Questions appear on player screens
```

### 4. Players Answer Questions
```
Player selects answer → Answer saved in Firebase
→ Next question appears → Player progress updates
→ Host sees real-time progress: "Player 1: 3/5 questions"
```

### 5. Quiz Ends
```
All players finish → Host clicks "End Session"
→ Room status changes to "ended"
→ Host can review all answers
```

---

## What Code Changes Are Needed

The application has placeholder TODO comments where Firebase API calls need to be uncommented and integrated:

### In `host.js`:
- `createRoom()` - Create room in database
- `listenForPlayers()` - Listen for players joining
- `startQuiz()` - Update room status to "started"
- `endSession()` - Update room status to "ended"
- `displayResults()` - Fetch all player answers

### In `player.js`:
- `joinRoom()` - Add player to room
- `listenForQuizStart()` - Listen for host to start quiz
- `selectAnswer()` - Save answer progress
- `completeQuiz()` - Save all answers

### In `firebase-config.js`:
- Add your actual Firebase credentials

---

## Testing the App

1. **Start the host**:
   - Open `host.html`
   - Select a category
   - Click "Create Room"
   - Note the Room ID

2. **Start as player**:
   - Open `player.html` in another browser tab/window
   - Enter the Room ID from the host
   - Enter your name
   - Click "Join Room"

3. **Check Firebase Console**:
   - Go to Realtime Database in Firebase Console
   - You should see the room and players appearing in real-time
   - Expand the nodes to see the data structure

---

## Debugging Tips

1. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for error messages

2. **Check Firebase Rules**:
   - If you see "Permission denied" errors, check your Database Rules
   - Make sure rules allow read/write access

3. **Enable Console Logging**:
   - Uncomment console.log statements in the code
   - Watch for Firebase connection status

4. **Firebase Console Monitoring**:
   - Go to Realtime Database → Data tab
   - You can manually check what data is stored
   - You can even manually add/edit data for testing

---

## Security Considerations (For Production)

These rules are for **development only**. For production:

1. **Implement Authentication**:
   ```javascript
   // Only authenticated users can read/write
   {
     "rules": {
       "rooms": {
         ".read": "auth != null",
         ".write": "auth != null",
         ...
       }
     }
   }
   ```

2. **Validate Data**:
   - Use Cloud Functions to validate answers
   - Ensure room IDs are valid before players join

3. **Rate Limiting**:
   - Prevent spam room creation
   - Limit database writes per user

4. **Enable HTTPS Only**:
   - In Firebase Console → Database Rules
   - Add: `.write: "root.child('connections').child(auth.uid).val() === true"`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase is not defined" | Make sure firebase-config.js is loaded AFTER Firebase SDK scripts |
| "Permission denied" | Check database rules - make sure they allow read/write |
| Players not seeing updates | Check if listeners are properly set up in code |
| Room not found | Verify room ID is entered correctly, check database for room existence |
| Answers not saving | Check Firebase console logs for write errors |

---

## Next Steps After Setup

1. ✅ Set up Firebase project
2. ✅ Create Realtime Database
3. ✅ Update firebase-config.js with credentials
4. ⏳ Uncomment Firebase API calls in host.js and player.js
5. ⏳ Test the application
6. ⏳ Deploy to Firebase Hosting (optional)

---

## Firebase Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Realtime Database Guide](https://firebase.google.com/docs/database)
- [Security Rules Guide](https://firebase.google.com/docs/database/security)
- [Firebase Console](https://console.firebase.google.com/)

---

## Quick Reference: Firebase API Methods Used

```javascript
// Read data once
database.ref('rooms/ROOM_ID').once('value', (snapshot) => {
  const data = snapshot.val();
});

// Listen for real-time changes
database.ref('rooms/ROOM_ID').on('value', (snapshot) => {
  const data = snapshot.val();
});

// Write data
database.ref('rooms/ROOM_ID').set(data);

// Update specific fields
database.ref('rooms/ROOM_ID').update({
  status: "started"
});

// Delete data
database.ref('rooms/ROOM_ID').remove();
```

---

Feel free to reach out if you have any questions about the Firebase setup!
