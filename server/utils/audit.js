const { pool } = require('../db/pool');

async function audit(userId, action, entityType, entityId, metadata = {}) {
  try {
    await pool.query(
      `insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
       values ($1,$2,$3,$4,$5)`,
      [userId || null, action, entityType, entityId || null, metadata]
    );
  } catch (err) {
    console.error('audit failed:', err.message);
  }
}

module.exports = { audit };
