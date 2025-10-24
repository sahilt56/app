// src/services/pocketbase.js
// PocketBase Integration Service (FIXED VERSION)

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Enable auto cancellation of pending requests
pb.autoCancellation(false);

class ChatService {
 constructor() {
 this.pb = pb;
 }
 

 // ==================== AUTHENTICATION ====================

 // Login with email/password
 async login(email, password) {
 try {
 const authData = await pb.collection('users').authWithPassword(email, password);
 await this.updateUserStatus('online');
 return authData;
 } catch (error) {
 console.error('Login error:', error);
 throw error;
 }
 }

 // Signup new user
 async signup(email, password, name) {
 try {
 const userData = {
  email: email,
  password: password,
  passwordConfirm: password,
  emailVisibility: true,
  displayName: name,
  status: 'offline',
  lastSeen: new Date().toISOString()
 };
 const user = await pb.collection('users').create(userData);
 await this.login(email, password);
 return user;
 } catch (error) {
 console.error('Signup error:', error);
 throw error;
 }
 }

 // Logout
 async logout() {
 try {
 await this.updateUserStatus('offline');
 pb.authStore.clear();
 } catch (error) {
 console.error('Logout error:', error);
 }
 }

 // Request password reset email
 async requestPasswordReset(email) {
 try {
 await pb.collection('users').requestPasswordReset(email);
 } catch (error) {
 console.error('Password reset request error:', error);
 throw error;
 }
 }
 
 // Confirm password reset
 async confirmPasswordReset(token, newPassword) {
 try {
 await pb.collection('users').confirmPasswordReset(
  token,
  newPassword,
  newPassword // passwordConfirm ke liye
 );
 } catch (error) {
 console.error('Password reset confirm error:', error);
 throw error;
 }
 }
// Delete the currently authenticated user's account
  async deleteCurrentUserAccount() {
    try {
      const userId = this.getCurrentUser()?.id;
      if (!userId) {
        throw new Error("User not authenticated.");
      }

      console.log('Attempting to delete user:', userId);
      // Delete the user record from the 'users' collection
      await pb.collection('users').delete(userId);
      console.log('✅ User record deleted successfully.');

      // Clear the local authentication store
      pb.authStore.clear();

    } catch (error) {
      console.error('❌ Delete account error:', error);
      // Add specific checks if needed, e.g., PocketBase might prevent deletion if related records exist and cascade delete isn't set up.
      throw error; // Re-throw error for UI handling
    }
  }
 // Check if user is authenticated
 isAuthenticated() {
 return pb.authStore.isValid;
 }

 // Get current user
 getCurrentUser() {
 return pb.authStore.model;
 }

 // ==================== USER MANAGEMENT ====================

 // Get all users except current user
 async getAllUsers() {
 try {
 const currentUserId = this.getCurrentUser()?.id;
 const users = await pb.collection('users').getFullList({
  sort: '-created',
  filter: `id != "${currentUserId}"`
 });
 return users;
 } catch (error) {
 console.error('Get users error:', error);
 return [];
 }
 }

 // Get only users the current user has chatted with
  async getChattedUsers() {
    try {
      const currentUserId = this.getCurrentUser()?.id;
      if (!currentUserId) return [];

      // 1. Get all chats the user is part of
      const userChats = await this.getUserChats(); // We already have this function

      // 2. Extract unique participant IDs (excluding the current user)
      const participantIds = new Set();
      userChats.forEach(chat => {
        chat.participants?.forEach(participantId => {
          if (participantId !== currentUserId) {
            participantIds.add(participantId);
          }
        });
      });

      if (participantIds.size === 0) {
          return []; // No chats found, return empty array
      }

      // 3. Build a filter to fetch these users
      const filter = Array.from(participantIds).map(id => `id = "${id}"`).join(' || ');

      // 4. Fetch user details
      const chattedUsers = await pb.collection('users').getFullList({
        filter: filter,
        sort: 'displayName' // Optional: sort by name
      });

      return chattedUsers;
    } catch (error) {
      console.error('Get chatted users error:', error);
      return [];
    }
  }

 // Search users by name
 async searchUsers(query) {
 try {
 const currentUserId = this.getCurrentUser()?.id;
 const users = await pb.collection('users').getFullList({
  filter: `displayName ~ "${query}" && id != "${currentUserId}"`
 });
 return users;
 } catch (error) {
 console.error('Search users error:', error);
 return [];
 }
 }
 // Search user by exact email (excluding current user)
  // Search user by exact email (excluding current user) - UPDATED
  async searchUserByEmail(email) {
    try {
      const currentUserId = this.getCurrentUser()?.id;
      if (!email || !currentUserId) return null;

      // Use single quotes for the email string in the filter
      const trimmedEmail = email.trim();
      // Temporarily search only by email
      const filter = `email = '${trimmedEmail}'`;
      console.log("Searching with filter (excluding self check removed):", filter); // Modified log// Log the filter being used

      // Let's use getFullList to see how many results we actually get
      const results = await pb.collection('users').getFullList({ filter: filter });
      console.log("Search results count:", results.length); // Log the number of results

      if (results.length === 1) {
        console.log("Found exactly one user:", results[0]);
        return results[0]; // Found the user
      } else {
        // Either 0 or somehow more than 1 (shouldn't happen with unique emails)
        console.log(`Did not find exactly one user with email ${trimmedEmail}. Found: ${results.length}`);
        return null; // User not found or ambiguous result
      }

    } catch (error) {
      // getFullList might throw error for other reasons (like invalid filter syntax, though unlikely here)
      console.error('Search user by email error:', error);
      return null;
    }
  }

 // Update user status
 async updateUserStatus(status) {
 try {
 const userId = this.getCurrentUser()?.id;
 if (!userId) return;

 await pb.collection('users').update(userId, {
  status: status,
  lastSeen: new Date().toISOString()
 });
 } catch (error) {
 console.error('Update status error:', error);
 }
 }
 
 // Update user avatar
 async updateUserAvatar(file) {
 try {
 const userId = this.getCurrentUser()?.id;
 if (!userId || !file) return;

 const formData = new FormData();
 formData.append('avatar', file);

 const updatedUser = await pb.collection('users').update(userId, formData);
 
 pb.authStore.save(pb.authStore.token, updatedUser);

 return updatedUser;
 } catch (error) {
 console.error('Update avatar error:', error);
 throw error;
 }
 }
 // Update user display name
 async updateDisplayName(newName) {
 try {
  const userId = this.getCurrentUser()?.id;
  if (!userId || !newName) return;

  // 'users' collection ko update karein
  const updatedUser = await pb.collection('users').update(userId, {
   displayName: newName
  });
  
  // Update the local authStore
  pb.authStore.save(pb.authStore.token, updatedUser);

  return updatedUser;
 } catch (error) {
  console.error('Update display name error:', error);
  throw error;
 }
 }

 // Subscribe to user status changes
 subscribeToUsers(callback) {
 pb.collection('users').subscribe('*', (e) => {
 callback(e);
 });
 }

 // Unsubscribe from user updates
 unsubscribeFromUsers() {
 pb.collection('users').unsubscribe('*');
 }
 // src/services/pocketbase.js



  // ==================== CONTACT MANAGEMENT ====================

  // Get all contacts for the current user
  async getContacts() {
    try {
      const currentUserId = this.getCurrentUser()?.id;
      if (!currentUserId) return [];

      const contacts = await pb.collection('contacts').getFullList({
        filter: `owner = "${currentUserId}"`,
        expand: 'contactUser', // Important: Fetch the full user details
        sort: '+contactUser.displayName' // Sort alphabetically by contact's name
      });
      return contacts;
    } catch (error) {
      console.error('Get contacts error:', error);
      return [];
    }
  }

  // Add a user as a contact
  async addContact(contactUserId) {
    try {
      const currentUserId = this.getCurrentUser()?.id;
      if (!currentUserId || !contactUserId || currentUserId === contactUserId) {
        throw new Error("Invalid operation");
      }

      // Check if contact already exists
      const existingFilter = `owner = "${currentUserId}" && contactUser = "${contactUserId}"`;
      try {
        await pb.collection('contacts').getFirstListItem(existingFilter);
        // If getFirstListItem succeeds, it means contact already exists
        console.log("Contact already exists.");
        return null; // Indicate contact already exists
      } catch (error) {
        // Expect a 404 error if contact doesn't exist, proceed if so
        if (error.status !== 404) {
          throw error; // Re-throw unexpected errors
        }
      }

      // Create new contact record
      const data = {
        owner: currentUserId,
        contactUser: contactUserId
      };
      const record = await pb.collection('contacts').create(data);
      console.log('✅ Contact added:', record.id);
      return record;
    } catch (error) {
      console.error('Add contact error:', error);
      throw error;
    }
  }

  // Delete a contact relationship
  async deleteContact(contactUserId) {
    try {
      const currentUserId = this.getCurrentUser()?.id;
      if (!currentUserId || !contactUserId) {
           throw new Error("Invalid operation");
      }

      // Find the specific contact record to delete
      const filter = `owner = "${currentUserId}" && contactUser = "${contactUserId}"`;
      const record = await pb.collection('contacts').getFirstListItem(filter); // Find the ID

      if (record) {
        await pb.collection('contacts').delete(record.id);
        console.log('✅ Contact deleted:', record.id);
      } else {
         console.warn("Contact record not found for deletion.");
      }
    } catch (error) {
         // Handle 404 gracefully if trying to delete non-existent contact
         if (error.status === 404) {
             console.warn("Contact record not found for deletion (error catch).");
             return; // Don't throw error if not found
         }
      console.error('Delete contact error:', error);
      throw error;
    }
  }


 // ==================== CHAT MANAGEMENT ====================

 // Update user's typing status
  async updateUserTypingStatus(chatId = null) { // Pass null to clear status
    try {
      const userId = this.getCurrentUser()?.id;
      if (!userId) return;

      // Update the 'isTypingIn' field for the current user
      // If chatId is null, it clears the relation
      await pb.collection('users').update(userId, {
        'isTypingIn': chatId
      });
      // console.log(`Set typing status for chat: ${chatId}`); // Optional log
    } catch (error) {
      // Avoid logging errors if it's just clearing a non-existent status
      if (!(error.status === 404 && chatId === null)) {
          console.error('Update typing status error:', error);
      }
    }
  }

 // Get or create chat between two users
 async getOrCreateChat(otherUserId) {
    try {
        const currentUserId = this.getCurrentUser()?.id;

        console.log('🔍 Looking for chat between:', currentUserId, 'and', otherUserId); // <--- CHECK THIS LOG

        const existingChats = await pb.collection('chats').getFullList({
            filter: `(participants.id ?= "${currentUserId}" && participants.id ?= "${otherUserId}") && isGroup = false`,
            expand: 'participants',
            sort: '-created'
        });

        console.log('Found existing chats:', existingChats.length); // <--- CHECK THIS LOG

        if (existingChats.length > 0) {
            console.log('✅ Using existing chat:', existingChats[0].id); // <--- CHECK THIS LOG
            return existingChats[0];
        }

        console.log('➕ Creating new chat...'); // <--- CHECK THIS LOG

        // Ensure we have a valid current user
        if (!currentUserId) {
            throw new Error('Cannot create chat: no authenticated user');
        }

        // Create the chat with both participants
        const newChat = await pb.collection('chats').create({
            participants: [currentUserId, otherUserId],
            isGroup: false,
            lastMessage: '',
            lastMessageTime: new Date().toISOString()
        });

        // Fetch full chat with expanded participants
        const fullChat = await pb.collection('chats').getOne(newChat.id, {
            expand: 'participants'
        });

        return fullChat;
 } catch (error) {
 console.error('❌ Get/Create chat error:', error);
 throw error;
 }
 }

 // Get all chats for current user
 async getUserChats() {
 try {
 const currentUserId = this.getCurrentUser()?.id;
 const chats = await pb.collection('chats').getFullList({
  filter: `participants.id ?= "${currentUserId}"`,
  expand: 'participants',
  sort: '-lastMessageTime'
 });
 return chats;
  } catch (error) {
 console.error('Get chats error:', error);
 return [];
 }
 }

 // Subscribe to chat changes
 subscribeToChats(callback) {
 const currentUserId = this.getCurrentUser()?.id;
 console.log('📡 Subscribing to chats for user:', currentUserId);
 
 pb.collection('chats').subscribe('*', async (e) => {
 console.log('📨 Chat subscription event:', e.action, 'Chat ID:', e.record.id);
 
 const participants = e.record.participants || [];
 const isParticipant = participants.includes(currentUserId);
 
 console.log('Am I participant?', isParticipant);
 
 if (isParticipant) {
  console.log('✅ Yes! Notifying app...');
  callback(e);
 } else {
  console.log('❌ No, ignoring this chat update');
 }
 }, {
 expand: 'participants'
 });
 }

 // Unsubscribe from chats
 unsubscribeFromChats() {
 pb.collection('chats').unsubscribe('*');
 }
 // Delete a chat
 async deleteChat(chatId) {
 try {
  await pb.collection('chats').delete(chatId);
  console.log('✅ Chat deleted:', chatId);
  // Optional: Delete associated messages too (more complex)
 } catch (error) {
  console.error('❌ Delete chat error:', error);
  throw error; // Re-throw error so UI can handle it
 }
 }


  // ==================== MESSAGE MANAGEMENT ====================

 // Send message (Text or File) - (FIXED WITH FORMDATA)
 // src/services/pocketbase.js - UPDATED sendMessage
async sendMessage(chatId, content, type = 'text', file = null, replyToId = null, isForwarded = false) {
    if (!this.pb.authStore.isValid) throw new Error("Authentication required.");

    const data = new FormData();
    data.append('chat', chatId);
    data.append('sender', this.pb.authStore.model.id);
    data.append('content', content);
    data.append('type', type);
    data.append('isRead', false);

    // ✅ NEW: Handle Reply and Forward
    if (replyToId) {
        data.append('replyToId', replyToId);
    }
    if (isForwarded) {
        data.append('isForwarded', true);
    }

    if (file) {
        data.append('file', file);
    }

    try {
        // 'replyToId' को एक्सपैंड करने के लिए, हमें इसे यहाँ परिभाषित करना होगा
        const record = await this.pb.collection('messages').create(data, {
            expand: 'sender,replyToId'
        });
        return record;
    } catch (e) {
        console.error("PocketBase Send Message Error:", e);
        throw e;
    }
}

 // Get messages for a chat
 // src/services/pocketbase.js - UPDATED getChatMessages
async getChatMessages(chatId) {
    if (!this.pb.authStore.isValid) throw new Error("Authentication required.");

    try {
        const messages = await this.pb.collection('messages').getFullList({
            filter: `chat='${chatId}'`,
            sort: 'created',
            // ✅ EXPAND replyToId, ताकि आप संदेश के अंदर रिप्लाई संदर्भ देख सकें
            expand: 'sender,replyToId' 
        });
        return messages;
    } catch (e) {
        console.error("PocketBase Get Messages Error:", e);
        return [];
    }
}

 // Subscribe to messages in a chat
 subscribeToMessages(chatId, callback) {
 console.log('Subscribing to messages for chat:', chatId);
 
 // Subscribe to ALL messages, filter in callback
 pb.collection('messages').subscribe('*', async (e) => {
 console.log('Raw message event:', e.action, e.record.id);
 callback(e);
 });
 }

 // Unsubscribe from messages
 unsubscribeFromMessages() {
 console.log('Unsubscribing from messages');
 pb.collection('messages').unsubscribe('*');
 }

  // Mark message as read
 async markAsRead(messageId) {
 try {
 await pb.collection('messages').update(messageId, {
  isRead: true
 });
 } catch (error) {
 console.error('Mark as read error:', error);
 }
 }
 // src/services/pocketbase.js

// ... (after markAsRead function) ...

// Delete a message
async deleteMessage(messageId) {
 try {
 await pb.collection('messages').delete(messageId);
} catch (error) {
 console.error('Delete message error:', error);
 throw error;
 }
 }

// Edit a message
 // Edit a message
async editMessage(messageId, newContent) {
try {
// 1. Get the message first to check its status
const message = await pb.collection('messages').getOne(messageId);

// 2. Check if it's already read
if (message.isRead) {
 // 3. If read, throw an error to stop the edit
 throw new Error("Cannot edit a message that has already been read.");
}

// 4. If not read, proceed with the update
const data = {
 content: newContent,
 isEdited: true
};
await pb.collection('messages').update(messageId, data);

} catch (error) {
console.error('Edit message error:', error);
throw error; // Re-throw the error for the UI
}
}

// src/services/pocketbase.js - NEW reactMessage
async reactMessage(messageId, emoji) {
    if (!this.pb.authStore.isValid) throw new Error("Authentication required.");
    
    // रिएक्शन को सेट या क्लियर करें (यदि वही इमोजी दोबारा भेजा जाए तो हटा दें)
    const currentMsg = await this.pb.collection('messages').getOne(messageId);
    let newReaction = currentMsg.reaction === emoji ? '' : emoji;

    const data = {
        reaction: newReaction
    };

    try {
        await this.pb.collection('messages').update(messageId, data);
        return newReaction;
    } catch (e) {
        console.error("PocketBase React Message Error:", e);
        throw e;
    }
}
// src/services/pocketbase.js - NEW forwardMessage
async forwardMessage(chatId, content, type, file) {
    // यह अनिवार्य रूप से sendMessage को isForwarded: true के साथ कॉल करता है
    return this.sendMessage(chatId, content, type, file, null, true);
}

// ==================== FILE MANAGEMENT ====================
// ... (rest of the code)

 // ==================== FILE MANAGEMENT ====================

 // Get file URL (FIXED to use getURL)
 getFileUrl(record, filename) {
 // YEH LINE FIX KAR DI GAYI HAI
 return pb.files.getURL(record, filename);
 }
}

// Create singleton instance
const chatService = new ChatService();

// Export instance
export default chatService;

// Also export PocketBase instance if needed
export { pb };