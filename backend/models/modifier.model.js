const db = require('../config/database');

// ============================================================================
// MODIFIER GROUPS
// ============================================================================

const getModifierGroupsByRestaurant = async (restaurantId) => {
    const result = await db.query(
        `SELECT mg.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'price_adjustment', m.price_adjustment,
                        'is_default', m.is_default,
                        'is_available', m.is_available,
                        'sort_order', m.sort_order
                    ) ORDER BY m.sort_order
                ) FILTER (WHERE m.id IS NOT NULL), '[]'
            ) as modifiers
        FROM modifier_groups mg
        LEFT JOIN modifiers m ON m.group_id = mg.id
        WHERE mg.restaurant_id = $1
        GROUP BY mg.id
        ORDER BY mg.sort_order, mg.name`,
        [restaurantId]
    );
    return result.rows;
};

const getModifierGroupById = async (id) => {
    const result = await db.query(
        `SELECT mg.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'price_adjustment', m.price_adjustment,
                        'is_default', m.is_default,
                        'is_available', m.is_available,
                        'sort_order', m.sort_order
                    ) ORDER BY m.sort_order
                ) FILTER (WHERE m.id IS NOT NULL), '[]'
            ) as modifiers
        FROM modifier_groups mg
        LEFT JOIN modifiers m ON m.group_id = mg.id
        WHERE mg.id = $1
        GROUP BY mg.id`,
        [id]
    );
    return result.rows[0];
};

const createModifierGroup = async (data) => {
    const { restaurant_id, name, description, selection_type, min_selections, max_selections, is_required, sort_order } = data;
    const result = await db.query(
        `INSERT INTO modifier_groups
            (restaurant_id, name, description, selection_type, min_selections, max_selections, is_required, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [restaurant_id, name, description, selection_type || 'single', min_selections || 0, max_selections || 1, is_required || false, sort_order || 0]
    );
    return result.rows[0];
};

const updateModifierGroup = async (id, data) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'description', 'selection_type', 'min_selections', 'max_selections', 'is_required', 'sort_order'];

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            fields.push(`${key} = $${paramCount}`);
            values.push(data[key]);
            paramCount++;
        }
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
        `UPDATE modifier_groups SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
    );
    return result.rows[0];
};

const deleteModifierGroup = async (id) => {
    const result = await db.query(
        'DELETE FROM modifier_groups WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

// ============================================================================
// MODIFIERS (Options within a group)
// ============================================================================

const getModifiersByGroup = async (groupId) => {
    const result = await db.query(
        'SELECT * FROM modifiers WHERE group_id = $1 ORDER BY sort_order, name',
        [groupId]
    );
    return result.rows;
};

const createModifier = async (data) => {
    const { group_id, name, price_adjustment, is_default, is_available, sort_order } = data;
    const result = await db.query(
        `INSERT INTO modifiers (group_id, name, price_adjustment, is_default, is_available, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [group_id, name, price_adjustment || 0, is_default || false, is_available !== false, sort_order || 0]
    );
    return result.rows[0];
};

const updateModifier = async (id, data) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'price_adjustment', 'is_default', 'is_available', 'sort_order'];

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            fields.push(`${key} = $${paramCount}`);
            values.push(data[key]);
            paramCount++;
        }
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
        `UPDATE modifiers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
    );
    return result.rows[0];
};

const deleteModifier = async (id) => {
    const result = await db.query(
        'DELETE FROM modifiers WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

// ============================================================================
// MENU ITEM <-> MODIFIER GROUP LINKS
// ============================================================================

const getModifierGroupsForMenuItem = async (menuItemId) => {
    const result = await db.query(
        `SELECT mg.*, mimr.sort_order as link_sort_order,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'price_adjustment', m.price_adjustment,
                        'is_default', m.is_default,
                        'is_available', m.is_available,
                        'sort_order', m.sort_order
                    ) ORDER BY m.sort_order
                ) FILTER (WHERE m.id IS NOT NULL), '[]'
            ) as modifiers
        FROM menu_item_modifier_groups mimr
        JOIN modifier_groups mg ON mg.id = mimr.modifier_group_id
        LEFT JOIN modifiers m ON m.group_id = mg.id
        WHERE mimr.menu_item_id = $1
        GROUP BY mg.id, mimr.sort_order
        ORDER BY mimr.sort_order, mg.name`,
        [menuItemId]
    );
    return result.rows;
};

const linkModifierGroupToMenuItem = async (menuItemId, modifierGroupId, sortOrder = 0) => {
    const result = await db.query(
        `INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (menu_item_id, modifier_group_id) DO UPDATE SET sort_order = $3
        RETURNING *`,
        [menuItemId, modifierGroupId, sortOrder]
    );
    return result.rows[0];
};

const unlinkModifierGroupFromMenuItem = async (menuItemId, modifierGroupId) => {
    const result = await db.query(
        'DELETE FROM menu_item_modifier_groups WHERE menu_item_id = $1 AND modifier_group_id = $2 RETURNING *',
        [menuItemId, modifierGroupId]
    );
    return result.rows[0];
};

const updateMenuItemModifierGroups = async (menuItemId, modifierGroupIds) => {
    // Delete existing links
    await db.query('DELETE FROM menu_item_modifier_groups WHERE menu_item_id = $1', [menuItemId]);

    // Insert new links
    if (modifierGroupIds && modifierGroupIds.length > 0) {
        const values = modifierGroupIds.map((groupId, index) => `($1, $2, $3)`).join(', ');
        const params = [menuItemId];

        for (let i = 0; i < modifierGroupIds.length; i++) {
            await db.query(
                'INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES ($1, $2, $3)',
                [menuItemId, modifierGroupIds[i], i]
            );
        }
    }

    return getModifierGroupsForMenuItem(menuItemId);
};

module.exports = {
    // Modifier Groups
    getModifierGroupsByRestaurant,
    getModifierGroupById,
    createModifierGroup,
    updateModifierGroup,
    deleteModifierGroup,
    // Modifiers
    getModifiersByGroup,
    createModifier,
    updateModifier,
    deleteModifier,
    // Menu Item Links
    getModifierGroupsForMenuItem,
    linkModifierGroupToMenuItem,
    unlinkModifierGroupFromMenuItem,
    updateMenuItemModifierGroups
};
