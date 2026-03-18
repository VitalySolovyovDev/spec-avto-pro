const mysql = require('mysql2/promise');
const { getMysqlConfig } = require('./config');

const SUBSCRIBERS_TABLE_NAME = 'telegram_subscribers';
const CREATE_SUBSCRIBERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${SUBSCRIBERS_TABLE_NAME} (
    chat_id BIGINT NOT NULL,
    username VARCHAR(255) NULL,
    first_name VARCHAR(255) NULL,
    last_name VARCHAR(255) NULL,
    status ENUM('active', 'stopped') NOT NULL DEFAULT 'active',
    subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id),
    KEY telegram_subscribers_status_idx (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

let poolPromise = null;

async function createPool() {
  const pool = mysql.createPool(getMysqlConfig());

  try {
    await pool.query(CREATE_SUBSCRIBERS_TABLE_SQL);
    return pool;
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = createPool().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }

  return poolPromise;
}

async function ensureMysqlReady() {
  await getPool();
}

module.exports = {
  CREATE_SUBSCRIBERS_TABLE_SQL,
  SUBSCRIBERS_TABLE_NAME,
  ensureMysqlReady,
  getPool,
};
