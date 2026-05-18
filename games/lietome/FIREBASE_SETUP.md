# Firebase Setup For Lie To Me

Lie To Me stores game data under:

```text
lietome/rooms/{ROOM_ID}
```

If room creation fails with `PERMISSION_DENIED`, update your Firebase Realtime Database rules.

In Firebase Console:

1. Go to **Build** > **Realtime Database**.
2. Open the **Rules** tab.
3. Publish rules that include the `lietome` branch:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    },
    "lietome": {
      "rooms": {
        "$roomId": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

The repository also includes `firebase.database.rules.json` at the project root with rules for both QuizBuzz and Lie To Me.

These rules are intentionally open for development and party-game testing. Before production use, add authentication and tighter write validation.
