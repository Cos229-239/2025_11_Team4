const adminService = require('../services/admin.service');
const logger = require('../utils/logger');

class AdminController {

    async listEmployees(req, res) {
        try {
            const { restaurant_id } = req.query;
            const employees = await adminService.listEmployees(restaurant_id);
            res.json({ success: true, employees });
        } catch (error) {
            logger.error('Error fetching employees', { error });
            res.status(500).json({ success: false, message: 'Failed to fetch employees' });
        }
    }

    async createEmployee(req, res) {
        try {
            const employee = await adminService.createEmployee(req.body);
            res.status(201).json({ success: true, employee });
        } catch (error) {
            logger.error('Error creating employee', { error });
            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
            res.status(500).json({ success: false, message: 'Failed to create employee' });
        }
    }

    async updateEmployee(req, res) {
        try {
            const { id } = req.params;
            const updated = await adminService.updateEmployee(id, req.body);
            if (!updated) {
                return res.json({ success: true, message: 'No changes', employee: null }); // Or 404 if not found? Original code said "No changes" -> success
            }
            res.json({ success: true, employee: updated });
        } catch (error) {
            logger.error('Error updating employee', { error });
            res.status(500).json({ success: false, message: 'Failed to update employee' });
        }
    }

    async deleteEmployee(req, res) {
        try {
            const { id } = req.params;
            const deleted = await adminService.deleteEmployee(id, req.user.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Employee not found or not an employee' });
            }
            res.json({ success: true, message: 'Employee deleted' });
        } catch (error) {
            logger.error('Error deleting employee', { error });
            if (error.message === 'Cannot delete yourself') {
                return res.status(400).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Failed to delete employee' });
        }
    }

    // Restaurants
    async getMyRestaurants(req, res) {
        try {
            const restaurants = await adminService.getMyRestaurants(req.user.id, req.userRoles || req.user.role);
            res.json({ success: true, restaurants });
        } catch (error) {
            logger.error('Error fetching restaurants', { error });
            res.status(500).json({ success: false, message: 'Failed to fetch restaurants' });
        }
    }

    async updateRestaurant(req, res) {
        try {
            const { id } = req.params;
            const updated = await adminService.updateRestaurant(id, req.body);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Restaurant not found' });
            }
            res.json({ success: true, restaurant: updated });
        } catch (error) {
            logger.error('Error updating restaurant', { error });
            res.status(500).json({ success: false, message: 'Failed to update restaurant' });
        }
    }

    async createRestaurant(req, res) {
        try {
            const created = await adminService.createRestaurant(req.body);
            res.status(201).json({ success: true, restaurant: created });
        } catch (error) {
            logger.error('Error creating restaurant', { error });
            res.status(500).json({ success: false, message: 'Failed to create restaurant' });
        }
    }

    async deleteRestaurant(req, res) {
        try {
            const { id } = req.params;
            const deleted = await adminService.deleteRestaurant(id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Restaurant not found' });
            }
            res.json({ success: true, message: 'Restaurant deleted' });
        } catch (error) {
            logger.error('Error deleting restaurant', { error });
            res.status(500).json({ success: false, message: 'Failed to delete restaurant' });
        }
    }

    // Settings
    async getSettings(req, res) {
        try {
            const { restaurant_id } = req.query;
            if (!restaurant_id) return res.status(400).json({ success: false, message: 'Restaurant ID required' });

            const settings = await adminService.getSettings(restaurant_id);
            res.json({ success: true, settings });
        } catch (error) {
            logger.error('Error fetching settings', { error });
            res.status(500).json({ success: false, message: 'Failed to fetch settings' });
        }
    }

    async updateSettings(req, res) {
        try {
            const { restaurant_id } = req.body;
            if (!restaurant_id) return res.status(400).json({ success: false, message: 'Restaurant ID required' });

            const settings = await adminService.updateSettings(req.body);
            res.json({ success: true, settings });
        } catch (error) {
            logger.error('Error saving settings', { error });
            res.status(500).json({ success: false, message: 'Failed to save settings' });
        }
    }

    // Analytics
    async getAnalytics(req, res) {
        try {
            const { restaurantId } = req.params;
            const { range } = req.query;
            const data = await adminService.getAnalytics(restaurantId, range);
            res.json({ success: true, ...data });
        } catch (error) {
            logger.error('Error fetching analytics', { error });
            res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
        }
    }
}

module.exports = new AdminController();
