# Lie To Me

A multiplayer bluffing game for Pixel Arcade Lab.

Rooms and scores are stored in Firebase Realtime Database under:

```text
lietome/rooms/{ROOM_ID}
```

To run it with Firebase:

1. Copy `config.example.js` to `config.local.js`.
2. Add your Firebase web app details.
3. Open `index.html`, then choose Host or Player.

The host creates a room, shares the room ID, starts the game, reveals submitted answers, shows votes, reveals the real answer, and advances to the next question.
