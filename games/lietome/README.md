# Lie To Me

A multiplayer bluffing game for Pixel Arcade Lab.

Rooms and scores are stored in Firebase Realtime Database under:

```text
lietome/rooms/{ROOM_ID}
```

To run it with Firebase:

1. Copy `config.example.js` to `config.local.js`.
2. Add your Firebase web app details.
3. Make sure your Realtime Database rules allow `lietome/rooms`.
4. Open `index.html`, then choose Host or Player.

If you see `PERMISSION_DENIED` when creating a room, follow `FIREBASE_SETUP.md`.

The host creates a room, shares the room ID, starts the game, reveals submitted answers, shows votes, reveals the real answer, and advances to the next question.
