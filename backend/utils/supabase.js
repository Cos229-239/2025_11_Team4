const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    logger.warn('⚠️ Supabase credentials missing. Storage features may not work.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

module.exports = supabase;
