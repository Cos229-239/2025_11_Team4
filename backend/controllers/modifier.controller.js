const modifierModel = require('../models/modifier.model');
const logger = require('../utils/logger');

// ============================================================================
// MODIFIER GROUPS
// ============================================================================

const getModifierGroups = async (req, res) => {
    try {
        const { restaurant_id } = req.query;

        if (!restaurant_id) {
            return res.status(400).json({
                success: false,
                error: 'restaurant_id is required'
            });
        }

        const groups = await modifierModel.getModifierGroupsByRestaurant(restaurant_id);

        res.json({
            success: true,
            data: groups,
            count: groups.length
        });
    } catch (error) {
        logger.error('Error fetching modifier groups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch modifier groups',
            message: error.message
        });
    }
};

const getModifierGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const group = await modifierModel.getModifierGroupById(id);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Modifier group not found'
            });
        }

        res.json({
            success: true,
            data: group
        });
    } catch (error) {
        logger.error('Error fetching modifier group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch modifier group',
            message: error.message
        });
    }
};

const createModifierGroup = async (req, res) => {
    try {
        const { restaurant_id, name, description, selection_type, min_selections, max_selections, is_required, sort_order } = req.body;

        if (!restaurant_id || !name) {
            return res.status(400).json({
                success: false,
                error: 'restaurant_id and name are required'
            });
        }

        const group = await modifierModel.createModifierGroup({
            restaurant_id,
            name,
            description,
            selection_type,
            min_selections,
            max_selections,
            is_required,
            sort_order
        });

        res.status(201).json({
            success: true,
            data: group,
            message: 'Modifier group created successfully'
        });
    } catch (error) {
        logger.error('Error creating modifier group:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'A modifier group with this name already exists for this restaurant'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create modifier group',
            message: error.message
        });
    }
};

const updateModifierGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const group = await modifierModel.updateModifierGroup(id, updates);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Modifier group not found'
            });
        }

        res.json({
            success: true,
            data: group,
            message: 'Modifier group updated successfully'
        });
    } catch (error) {
        logger.error('Error updating modifier group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update modifier group',
            message: error.message
        });
    }
};

const deleteModifierGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const group = await modifierModel.deleteModifierGroup(id);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Modifier group not found'
            });
        }

        res.json({
            success: true,
            data: group,
            message: 'Modifier group deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting modifier group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete modifier group',
            message: error.message
        });
    }
};

// ============================================================================
// MODIFIERS (Options within a group)
// ============================================================================

const getModifiers = async (req, res) => {
    try {
        const { group_id } = req.query;

        if (!group_id) {
            return res.status(400).json({
                success: false,
                error: 'group_id is required'
            });
        }

        const modifiers = await modifierModel.getModifiersByGroup(group_id);

        res.json({
            success: true,
            data: modifiers,
            count: modifiers.length
        });
    } catch (error) {
        logger.error('Error fetching modifiers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch modifiers',
            message: error.message
        });
    }
};

const createModifier = async (req, res) => {
    try {
        const { group_id, name, price_adjustment, is_default, is_available, sort_order } = req.body;

        if (!group_id || !name) {
            return res.status(400).json({
                success: false,
                error: 'group_id and name are required'
            });
        }

        const modifier = await modifierModel.createModifier({
            group_id,
            name,
            price_adjustment,
            is_default,
            is_available,
            sort_order
        });

        res.status(201).json({
            success: true,
            data: modifier,
            message: 'Modifier created successfully'
        });
    } catch (error) {
        logger.error('Error creating modifier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create modifier',
            message: error.message
        });
    }
};

const updateModifier = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const modifier = await modifierModel.updateModifier(id, updates);

        if (!modifier) {
            return res.status(404).json({
                success: false,
                error: 'Modifier not found'
            });
        }

        res.json({
            success: true,
            data: modifier,
            message: 'Modifier updated successfully'
        });
    } catch (error) {
        logger.error('Error updating modifier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update modifier',
            message: error.message
        });
    }
};

const deleteModifier = async (req, res) => {
    try {
        const { id } = req.params;
        const modifier = await modifierModel.deleteModifier(id);

        if (!modifier) {
            return res.status(404).json({
                success: false,
                error: 'Modifier not found'
            });
        }

        res.json({
            success: true,
            data: modifier,
            message: 'Modifier deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting modifier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete modifier',
            message: error.message
        });
    }
};

// ============================================================================
// MENU ITEM <-> MODIFIER GROUP LINKS
// ============================================================================

const getMenuItemModifiers = async (req, res) => {
    try {
        const { menu_item_id } = req.params;
        const groups = await modifierModel.getModifierGroupsForMenuItem(menu_item_id);

        res.json({
            success: true,
            data: groups,
            count: groups.length
        });
    } catch (error) {
        logger.error('Error fetching menu item modifiers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu item modifiers',
            message: error.message
        });
    }
};

const updateMenuItemModifiers = async (req, res) => {
    try {
        const { menu_item_id } = req.params;
        const { modifier_group_ids } = req.body;

        const groups = await modifierModel.updateMenuItemModifierGroups(menu_item_id, modifier_group_ids || []);

        res.json({
            success: true,
            data: groups,
            message: 'Menu item modifiers updated successfully'
        });
    } catch (error) {
        logger.error('Error updating menu item modifiers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update menu item modifiers',
            message: error.message
        });
    }
};

module.exports = {
    // Modifier Groups
    getModifierGroups,
    getModifierGroupById,
    createModifierGroup,
    updateModifierGroup,
    deleteModifierGroup,
    // Modifiers
    getModifiers,
    createModifier,
    updateModifier,
    deleteModifier,
    // Menu Item Links
    getMenuItemModifiers,
    updateMenuItemModifiers
};
