import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { normalizeContactObject } from '../../utils/userUtils';

// Async thunks
export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async ({ search = '', page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await api.get('/contacts', {
        params: { search, page, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch contacts');
    }
  }
);

export const addContact = createAsyncThunk(
  'contacts/addContact',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.post('/contacts', { contact_id: userId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add contact');
    }
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ contactId, ...updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/contacts/${contactId}`, updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update contact');
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (contactId, { rejectWithValue }) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      return contactId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete contact');
    }
  }
);

export const blockContact = createAsyncThunk(
  'contacts/blockContact',
  async ({ contactId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/contacts/${contactId}/block`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to block contact');
    }
  }
);

export const unblockContact = createAsyncThunk(
  'contacts/unblockContact',
  async ({ contactId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/contacts/${contactId}/unblock`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unblock contact');
    }
  }
);

export const importContacts = createAsyncThunk(
  'contacts/importContacts',
  async (contactsData, { rejectWithValue }) => {
    try {
      const response = await api.post('/contacts/import', { contacts: contactsData });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to import contacts');
    }
  }
);

export const exportContacts = createAsyncThunk(
  'contacts/exportContacts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/contacts/export');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export contacts');
    }
  }
);

export const syncContacts = createAsyncThunk(
  'contacts/syncContacts',
  async (phoneNumbers, { rejectWithValue }) => {
    try {
      const response = await api.post('/contacts/sync', { phoneNumbers });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync contacts');
    }
  }
);

export const searchUsers = createAsyncThunk(
  'contacts/searchUsers',
  async ({ query }, { rejectWithValue }) => {
    try {
      const response = await api.get('/contacts/search', {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

// Initial state
const initialState = {
  contacts: [],
  searchResults: [],
  activeContact: null,
  onlineContacts: [],
  typingContacts: [],
  blockedContacts: [],
  favoriteContacts: [],
  recentContacts: [],
  loading: false,
  searchLoading: false,
  error: null,
  searchError: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalContacts: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    search: '',
    showOnlineOnly: false,
    showFavoritesOnly: false,
    sortBy: 'name', // name, last_message, created_at
    sortOrder: 'asc', // asc, desc
  },
  importProgress: {
    isImporting: false,
    imported: 0,
    total: 0,
    errors: [],
  },
  syncStatus: {
    isSyncing: false,
    lastSyncAt: null,
    newContacts: 0,
  },
};

// Slice
const contactSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.searchError = null;
    },
    setActiveContact: (state, action) => {
      state.activeContact = action.payload;
    },
    clearActiveContact: (state) => {
      state.activeContact = null;
    },
    updateContactOnlineStatus: (state, action) => {
      const { contactId, isOnline, lastSeen } = action.payload;
      
      // Update contact in contacts array
      const contactIndex = state.contacts.findIndex(c => c.id === contactId);
      if (contactIndex !== -1) {
        state.contacts[contactIndex].is_online = isOnline;
        state.contacts[contactIndex].last_seen = lastSeen;
      }
      
      // Update active contact
      if (state.activeContact?.id === contactId) {
        state.activeContact.is_online = isOnline;
        state.activeContact.last_seen = lastSeen;
      }
      
      // Update online contacts list
      if (isOnline) {
        if (!state.onlineContacts.includes(contactId)) {
          state.onlineContacts.push(contactId);
        }
      } else {
        state.onlineContacts = state.onlineContacts.filter(id => id !== contactId);
      }
    },
    updateContactTypingStatus: (state, action) => {
      const { contactId, isTyping } = action.payload;
      
      if (isTyping) {
        if (!state.typingContacts.includes(contactId)) {
          state.typingContacts.push(contactId);
        }
      } else {
        state.typingContacts = state.typingContacts.filter(id => id !== contactId);
      }
    },
    updateContactLastMessage: (state, action) => {
      const { contactId, lastMessage, lastMessageAt } = action.payload;
      
      const contactIndex = state.contacts.findIndex(c => c.id === contactId);
      if (contactIndex !== -1) {
        state.contacts[contactIndex].last_message = lastMessage;
        state.contacts[contactIndex].last_message_at = lastMessageAt;
        
        // Move to top of list
        const contact = state.contacts[contactIndex];
        state.contacts.splice(contactIndex, 1);
        state.contacts.unshift(contact);
      }
    },
    addToRecentContacts: (state, action) => {
      const contactId = action.payload;
      
      // Remove if already exists
      state.recentContacts = state.recentContacts.filter(id => id !== contactId);
      
      // Add to beginning
      state.recentContacts.unshift(contactId);
      
      // Keep only last 10 recent contacts
      if (state.recentContacts.length > 10) {
        state.recentContacts = state.recentContacts.slice(0, 10);
      }
    },
    toggleFavoriteContact: (state, action) => {
      const contactId = action.payload;
      
      const contactIndex = state.contacts.findIndex(c => c.id === contactId);
      if (contactIndex !== -1) {
        const isFavorite = !state.contacts[contactIndex].is_favorite;
        state.contacts[contactIndex].is_favorite = isFavorite;
        
        if (isFavorite) {
          if (!state.favoriteContacts.includes(contactId)) {
            state.favoriteContacts.push(contactId);
          }
        } else {
          state.favoriteContacts = state.favoriteContacts.filter(id => id !== contactId);
        }
      }
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
    sortContacts: (state, action) => {
      const { sortBy, sortOrder } = action.payload;
      
      state.contacts.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'name':
            const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
            const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
            comparison = nameA.localeCompare(nameB);
            break;
          case 'last_message':
            const dateA = new Date(a.last_message_at || 0);
            const dateB = new Date(b.last_message_at || 0);
            comparison = dateB - dateA; // Recent first by default
            break;
          case 'created_at':
            const createdA = new Date(a.created_at);
            const createdB = new Date(b.created_at);
            comparison = createdB - createdA; // Recent first by default
            break;
          default:
            return 0;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      state.filters.sortBy = sortBy;
      state.filters.sortOrder = sortOrder;
    },
    resetContactsState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch Contacts
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        const { contacts = [], pagination = {} } = action.payload?.data || {};
        
        // Normalize all contacts
        const normalizedContacts = contacts.map(contact => normalizeContactObject(contact));
        
        const page = action.meta.arg?.page || 1;
        if (page === 1) {
          state.contacts = normalizedContacts;
        } else {
          state.contacts.push(...normalizedContacts);
        }
        
        state.pagination = pagination;
        state.error = null;
        
        // Update related arrays
        state.onlineContacts = normalizedContacts
          .filter(c => c.isOnline)
          .map(c => c.id);
        
        state.favoriteContacts = normalizedContacts
          .filter(c => c.is_favorite)
          .map(c => c.id);
        
        state.blockedContacts = normalizedContacts
          .filter(c => c.is_blocked)
          .map(c => c.id);
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Add Contact
    builder
      .addCase(addContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addContact.fulfilled, (state, action) => {
        state.loading = false;
        const contact = action.payload?.data?.contact;
        if (contact) {
          const normalizedContact = normalizeContactObject(contact);
          state.contacts.unshift(normalizedContact);
        }
        state.error = null;
      })
      .addCase(addContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Contact
    builder
      .addCase(updateContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        state.loading = false;
        const updatedContact = action.payload?.data?.contact;
        if (updatedContact) {
          const normalizedContact = normalizeContactObject(updatedContact);
          const index = state.contacts.findIndex(c => c.id === updatedContact.id);
          
          if (index !== -1) {
            state.contacts[index] = normalizedContact;
          }
        }
        
        if (state.activeContact?.id === updatedContact.id) {
          state.activeContact = normalizeContactObject(updatedContact);
        }
        
        state.error = null;
      })
      .addCase(updateContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Contact
    builder
      .addCase(deleteContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.loading = false;
        const contactId = action.payload;
        
        state.contacts = state.contacts.filter(c => c.id !== contactId);
        state.onlineContacts = state.onlineContacts.filter(id => id !== contactId);
        state.favoriteContacts = state.favoriteContacts.filter(id => id !== contactId);
        state.blockedContacts = state.blockedContacts.filter(id => id !== contactId);
        state.recentContacts = state.recentContacts.filter(id => id !== contactId);
        
        if (state.activeContact?.id === contactId) {
          state.activeContact = null;
        }
        
        state.error = null;
      })
      .addCase(deleteContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Block Contact
    builder
      .addCase(blockContact.fulfilled, (state, action) => {
        const contact = action.payload;
        const index = state.contacts.findIndex(c => c.id === contact.id);
        
        if (index !== -1) {
          state.contacts[index] = contact;
        }
        
        if (!state.blockedContacts.includes(contact.id)) {
          state.blockedContacts.push(contact.id);
        }
      });

    // Unblock Contact
    builder
      .addCase(unblockContact.fulfilled, (state, action) => {
        const contact = action.payload;
        const index = state.contacts.findIndex(c => c.id === contact.id);
        
        if (index !== -1) {
          state.contacts[index] = contact;
        }
        
        state.blockedContacts = state.blockedContacts.filter(id => id !== contact.id);
      });

    // Search Users
    builder
      .addCase(searchUsers.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload?.data?.users || [];
        state.searchError = null;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
      });

    // Import Contacts
    builder
      .addCase(importContacts.pending, (state) => {
        state.importProgress.isImporting = true;
        state.importProgress.errors = [];
        state.error = null;
      })
      .addCase(importContacts.fulfilled, (state, action) => {
        state.importProgress.isImporting = false;
        const { imported, errors } = action.payload;
        state.importProgress.imported = imported.length;
        state.importProgress.errors = errors;
        
        // Add imported contacts to the list
        state.contacts.unshift(...imported);
        state.error = null;
      })
      .addCase(importContacts.rejected, (state, action) => {
        state.importProgress.isImporting = false;
        state.error = action.payload;
      });

    // Sync Contacts
    builder
      .addCase(syncContacts.pending, (state) => {
        state.syncStatus.isSyncing = true;
        state.error = null;
      })
      .addCase(syncContacts.fulfilled, (state, action) => {
        state.syncStatus.isSyncing = false;
        state.syncStatus.lastSyncAt = new Date().toISOString();
        state.syncStatus.newContacts = action.payload.newContacts?.length || 0;
        
        // Add new contacts
        if (action.payload.newContacts?.length > 0) {
          state.contacts.unshift(...action.payload.newContacts);
        }
        
        state.error = null;
      })
      .addCase(syncContacts.rejected, (state, action) => {
        state.syncStatus.isSyncing = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setActiveContact,
  clearActiveContact,
  updateContactOnlineStatus,
  updateContactTypingStatus,
  updateContactLastMessage,
  addToRecentContacts,
  toggleFavoriteContact,
  updateFilters,
  clearSearchResults,
  sortContacts,
  resetContactsState,
} = contactSlice.actions;

// Aliases for compatibility
export const getContact = setActiveContact; // Alias for setting active contact
export const removeContact = deleteContact; // Alias for deleteContact
export const fetchRecentContacts = fetchContacts; // Alias for fetchContacts

export default contactSlice.reducer;