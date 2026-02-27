// appwrite-sync.js
const client = new Appwrite.Client()
  .setEndpoint('https://cloud.appwrite.io/v1')          // ← Replace with YOUR endpoint
  .setProject('YOUR_PROJECT_ID_HERE');                  // ← Replace with your Project ID

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);

// Your database & collection IDs
const DATABASE_ID = 'roomodata';      // or whatever you set
const COLLECTION_ID = 'rooms';

// Get or create anonymous user ID (persist in localStorage for same device)
async function getUserId() {
  try {
    const user = await account.get(); // If session exists
    return user.$id;
  } catch (error) {
    // No session → create anonymous
    const session = await account.createAnonymousSession();
    return session.userId;
  }
}

// Save room data (call this when user saves/edits)
async function saveRoom(roomJson) {
  const userId = await getUserId();
  try {
    // Upsert: update if exists, create if new (use document ID as userId for 1-room-per-user simplicity)
    await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      userId,                     // Document ID = userId → easy 1-to-1
      {
        userId: userId,
        roomData: roomJson,       // your full room object/string
        updatedAt: new Date().toISOString()
      },
      ['read("users")', 'write("users")']  // permissions if needed
    );
    console.log('Room saved to cloud');
  } catch (err) {
    if (err.code === 409) { // Conflict = already exists → update instead
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        userId,
        { roomData: roomJson, updatedAt: new Date().toISOString() }
      );
      console.log('Room updated');
    } else {
      console.error('Save error:', err);
    }
  }
}

// Load room data on page load
async function loadRoom() {
  const userId = await getUserId();
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, userId);
    return doc.roomData; // Load to your UI
  } catch (err) {
    console.log('No saved room yet or error:', err);
    return null; // Use local fallback
  }
}

// Realtime sync: listen for changes (works across devices for same userId)
function subscribeToRoomUpdates(callback) {
  const unsubscribe = client.subscribe(
    `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
    (response) => {
      if (response.events.includes('databases.*.collections.*.documents.*.update') ||
          response.events.includes('databases.*.collections.*.documents.*.create')) {
        callback(response.payload.roomData); // Update UI live
      }
    }
  );
  // Call unsubscribe() when component unmounts/page leaves
  return unsubscribe;
}

// Example usage:
// On page load: 
// const saved = await loadRoom();
// if (saved) loadToUI(saved);
// subscribeToRoomUpdates((newData) => loadToUI(newData));

// When user saves: saveRoom(yourRoomJson);

// ... (client init same)

const DATABASE_ID = 'roomodata';     // ← Your Database ID
const TABLE_ID = 'rooms';            // ← Your Table ID (not collection)


// In saveRoom / loadRoom / subscribe, replace COLLECTION_ID with TABLE_ID

// Example create/update uses .createDocument() / .updateDocument() — API is the same, just terminology changed to table/document

// Realtime subscribe example (adjust path if needed)
client.subscribe(
  `databases.${DATABASE_ID}.collections.${TABLE_ID}.documents`,  // Note: SDK still uses "collections" internally in some paths
  (response) => {
    // payload has .payload.roomData etc.
  }
);
