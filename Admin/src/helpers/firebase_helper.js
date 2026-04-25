import firebase from "firebase/compat/app";

// Add the Firebase products that you want to use
import "firebase/compat/auth";
import "firebase/compat/firestore";

class FirebaseAuthBackend {
  constructor(firebaseConfig) {
    if (firebaseConfig) {
      // Initialize Firebase only if not already initialized (e.g. by config/firebase.ts)
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
      }
      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          const stored = (() => {
            try {
              const raw = localStorage.getItem("authUser");
              return raw ? JSON.parse(raw) : null;
            } catch (e) {
              return null;
            }
          })();
          if (stored && stored.id && user.isAnonymous) {
            setLoggeedInUser(stored);
            return;
          }
          if (stored && stored.uid === user.uid && stored.firstName != null) {
            setLoggeedInUser(stored);
          } else {
            const parts = (user.displayName || "").trim().split(/\s+/);
            const firstName = parts[0] || "";
            const lastName = parts.slice(1).join(" ") || "";
            setLoggeedInUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              firstName,
              lastName,
              profileImage: user.photoURL,
            });
          }
        } else {
          localStorage.removeItem("authUser");
        }
      });
    }
  }

  /**
   * Registers the user with given details
   */
  registerUser = (email, password) => {
    return new Promise((resolve, reject) => {
      firebase
        .auth()
        .createUserWithEmailAndPassword(email, password)
        .then(
          user => {
            resolve(firebase.auth().currentUser);
          },
          error => {
            reject(this._handleError(error));
          }
        );
    });
  };

  /**
   * Registers the user with given details
   */
  editProfileAPI = (email, password) => {
    return new Promise((resolve, reject) => {
      firebase
        .auth()
        .createUserWithEmailAndPassword(email, password)
        .then(
          user => {
            resolve(firebase.auth().currentUser);
          },
          error => {
            reject(this._handleError(error));
          }
        );
    });
  };

  /**
   * Login user with given details
   */
  loginUser = (email, password) => {
    return new Promise((resolve, reject) => {
      firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .then(
          user => {
            const currentUser = JSON.stringify(firebase.auth().currentUser);
            resolve(currentUser);
          },
          error => {
            reject(this._handleError(error));
          }
        );
    });
  };

  /**
   * forget Password user with given details
   */
  forgetPassword = email => {
    return new Promise((resolve, reject) => {
      firebase
        .auth()
        .sendPasswordResetEmail(email, {
          url:
            window.location.protocol + "//" + window.location.host + "/login",
        })
        .then(() => {
          resolve(true);
        })
        .catch(error => {
          reject(this._handleError(error));
        });
    });
  };

  /**
   * Logout the user
   */
  logout = () => {
    return new Promise((resolve, reject) => {
      firebase
        .auth()
        .signOut()
        .then(() => {
          resolve(true);
        })
        .catch(error => {
          reject(this._handleError(error));
        });
    });
  };

  /**
   * Social Login user with given details (legacy - uses credential from external library)
   */
  socialLoginUser = (data, type) => {
    let credential = {};
    if (type === "google") {
      credential = firebase.auth.GoogleAuthProvider.credential(
        data.idToken,
        data.token
      );
    } else if (type === "facebook") {
      credential = firebase.auth.FacebookAuthProvider.credential(data.token);
    }
    return new Promise((resolve, reject) => {
      if (!!credential) {
        firebase
          .auth()
          .signInWithCredential(credential)
          .then(user => {
            let userL = this.addNewUserToFirestore(user);
            userL = JSON.stringify(userL);
            resolve(userL);
          })
          .catch(error => {
            reject(this._handleError(error));
          });
      } else {
        // reject(this._handleError(error));
      }
    });
  };

  /**
   * Native Google Sign-In using Firebase popup (recommended)
   * Returns { userData, basicDetails } so the app can update profile/settings.
   */
  signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    return new Promise((resolve, reject) => {
      firebase
        .auth()
        .signInWithPopup(provider)
        .then(result => {
          const user = result.user;
          const profile = result.additionalUserInfo?.profile || {};
          const firstName = profile.given_name || profile.first_name || (user.displayName && user.displayName.split(" ")[0]) || "";
          const lastName = profile.family_name || profile.last_name || (user.displayName && user.displayName.split(" ").slice(1).join(" ")) || "";
          const profileImage = user.photoURL || profile.picture || null;

          if (result.additionalUserInfo?.isNewUser) {
            this.addNewUserToFirestore(result);
          }

          const enrichedUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            firstName,
            lastName,
            profileImage,
          };
          setLoggeedInUser(enrichedUser);

          const basicDetails = {
            firstName,
            lastName,
            fullName: user.displayName || `${firstName} ${lastName}`.trim(),
            profile: profileImage,
            email: user.email || "",
            location: "",
          };
          resolve({ userData: enrichedUser, basicDetails });
        })
        .catch(error => {
          reject(this._handleError(error));
        });
    });
  };

  addNewUserToFirestore = (result) => {
    const user = result.user || result;
    const profile = (result.additionalUserInfo && result.additionalUserInfo.profile) || (user.additionalUserInfo && user.additionalUserInfo.profile);
    if (!profile) return;
    const collection = firebase.firestore().collection("users");
    const details = {
      firstName: profile.given_name || profile.first_name,
      lastName: profile.family_name || profile.last_name,
      fullName: profile.name,
      email: profile.email,
      picture: profile.picture,
      createdDtm: firebase.firestore.FieldValue.serverTimestamp(),
      lastLoginTime: firebase.firestore.FieldValue.serverTimestamp(),
    };
    collection.doc(firebase.auth().currentUser.uid).set(details);
    return { user: result.user || user, details };
  };

  /**
   * Returns the authenticated user
   */
  getAuthenticatedUser = () => {
    if (!localStorage.getItem("authUser")) return null;
    return JSON.parse(localStorage.getItem("authUser"));
  };

  /**
   * Handle the error
   * @param {*} error
   */
  _handleError(error) {
    // var errorCode = error.code;
    var errorMessage = error.message;
    return errorMessage;
  }
}

let _fireBaseBackend = null;

const setLoggeedInUser = user => {
  localStorage.setItem("authUser", JSON.stringify(user));
};

/**
 * Initilize the backend
 * @param {*} config
 */
const initFirebaseBackend = config => {
  if (!_fireBaseBackend) {
    _fireBaseBackend = new FirebaseAuthBackend(config);
  }
  return _fireBaseBackend;
};

/**
 * Returns the firebase backend
 */
const getFirebaseBackend = () => {
  return _fireBaseBackend;
};

export { initFirebaseBackend, getFirebaseBackend, setLoggeedInUser };
