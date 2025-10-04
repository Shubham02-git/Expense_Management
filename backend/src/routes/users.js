const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticate, authorize, adminOrOwner, managerAccess } = require('../middleware/auth');
const { validateUserUpdate, validateUUID, validatePagination } = require('../middleware/validation');

// All user routes require authentication
router.use(authenticate);

// GET /api/users - List users (Admin only or managers can see their team)
router.get('/', validatePagination, authorize('admin', 'manager'), userController.getUsers);

// GET /api/users/hierarchy - Get organizational hierarchy (Admin/Manager only)
router.get('/hierarchy', authorize('admin', 'manager'), userController.getUserHierarchy);

// GET /api/users/:id - Get specific user (Admin, or manager can see direct reports, or own profile)
router.get('/:id', validateUUID, managerAccess, userController.getUserById);

// POST /api/users - Create new user (Admin only)
router.post('/', authorize('admin'), validateUserUpdate, userController.createUser);

// PUT /api/users/:id - Update user (Admin or own profile)
router.put('/:id', validateUUID, adminOrOwner, validateUserUpdate, userController.updateUser);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', validateUUID, authorize('admin'), userController.deleteUser);

module.exports = router;