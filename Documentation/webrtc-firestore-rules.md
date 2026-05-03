## Firestore rules for WebRTC signaling

Add these rules to your Firebase project (Firestore rules) to lock down the signaling
documents so **only the two participants** can read/write.

The current PHP-login video call MVP uses MySQL user IDs in `participants` and
signs into Firebase anonymously for signaling. For cross-device production-build
testing, use the temporary `webrtcCalls` rule below with Firebase Anonymous Auth
enabled. For a fully locked-down production rule, add a backend Firebase custom
token endpoint so `request.auth.uid` equals the PHP/MySQL user ID.

This app uses:

- `webrtcSignals/{signalId}` (doc) with `participants: [uidA, uidB]`
- subcollections: `offers`, `answers`, `candidates`
- `webrtcCalls/{callId}` (doc) for 1-to-1 video calls with `participants: [uidA, uidB]`
- subcollections: `callerCandidates`, `receiverCandidates`

### Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isParticipant(signalDoc) {
      return request.auth != null
        && signalDoc.data.participants is list
        && signalDoc.data.participants.size() == 2
        && signalDoc.data.participants.hasAny([request.auth.uid]);
    }

    match /webrtcSignals/{signalId} {
      allow read, update, delete: if isParticipant(resource);

      // Allow create only if the creator is one of the participants and exactly 2 participants are set
      allow create: if request.auth != null
        && request.resource.data.participants is list
        && request.resource.data.participants.size() == 2
        && request.resource.data.participants.hasAny([request.auth.uid]);

      match /{subCollection}/{docId} {
        allow read, write: if isParticipant(get(/databases/$(database)/documents/webrtcSignals/$(signalId)));
      }
    }

    match /webrtcCalls/{callId} {
      // Temporary for deployed cross-device testing with anonymous Firebase auth.
      // Replace with `isParticipant(...)` after Firebase custom tokens are added.
      allow read, create, update, delete: if request.auth != null;

      match /{subCollection}/{docId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

