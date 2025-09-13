const express = require('express');
const router = express.Router();

const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/auth');
const { validateContact } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(apiLimiter);

// Contacts CRUD
router.get('/', contactController.getContacts);

// Search users (for finding new contacts)
router.get('/search', contactController.searchUsers);

// Export contacts
router.get('/export', contactController.exportContacts);

router.post('/',
  validateContact,
  contactController.addContact
);

router.put('/:id',
  contactController.updateContact
);

router.delete('/:id',
  contactController.removeContact
);

// Contact details and management
router.get('/user/:userId',
  contactController.getContactDetails
);

// Contact discovery
router.post('/find-by-phone',
  contactController.getContactsByPhone
);

module.exports = router;