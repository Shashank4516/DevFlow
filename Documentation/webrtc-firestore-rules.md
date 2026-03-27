## Firestore rules for WebRTC signaling

Add these rules to your Firebase project (Firestore rules) to lock down the signaling
documents so **only the two participants** can read/write.

This app uses:

- `webrtcSignals/{signalId}` (doc) with `participants: [uidA, uidB]`
- subcollections: `offers`, `answers`, `candidates`

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
  }
}
```

