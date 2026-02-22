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
