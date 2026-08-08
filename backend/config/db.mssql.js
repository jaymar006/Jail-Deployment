const sql = require('mssql');

const mssqlConfig = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || '',
  server: process.env.MSSQL_SERVER || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  database: process.env.MSSQL_DATABASE || 'jail_visitation',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true', // Use true for Azure, false for local SQL Server
    trustServerCertificate: true // Required for local self-signed dev certificates
  }
};

console.log(`🔌 Initializing Microsoft SQL Server connection to ${mssqlConfig.server}:${mssqlConfig.port}/${mssqlConfig.database}`);

const poolPromise = new sql.ConnectionPool(mssqlConfig)
  .connect()
  .then(pool => {
    console.log('✅ Connected to Microsoft SQL Server successfully');
    return pool;
  })
  .catch(err => {
    console.error('❌ Microsoft SQL Server connection failed:', err.message);
    throw err;
  });

function convertSqlForMssql(queryText) {
  let converted = queryText;
  // Convert datetime('now') to GETDATE()
  converted = converted.replace(/datetime\('now'\)/gi, 'GETDATE()');
  converted = converted.replace(/\bNOW\(\)/gi, 'GETDATE()');
  return converted;
}

/**
 * Execute query compatible with mysql2/sqlite3 return format
 */
async function query(sqlQuery, params = [], cb) {
  const hasCallback = typeof params === 'function' || typeof cb === 'function';
  const callback = typeof params === 'function' ? params : cb;
  const effectiveParams = Array.isArray(params) ? params : [];

  const execute = async () => {
    const pool = await poolPromise;
    const request = pool.request();

    let convertedSql = convertSqlForMssql(sqlQuery);

    // Convert positional '?' parameters to MSSQL '@p0', '@p1', etc.
    let paramIndex = 0;
    convertedSql = convertedSql.replace(/\?/g, () => {
      const name = `p${paramIndex++}`;
      return `@${name}`;
    });

    // Bind parameters
    effectiveParams.forEach((val, idx) => {
      request.input(`p${idx}`, val);
    });

    const isSelect = /^\s*select/i.test(convertedSql);
    const result = await request.query(convertedSql);

    if (isSelect) {
      return [result.recordset || []];
    } else {
      const affectedRows = result.rowsAffected.reduce((a, b) => a + b, 0);
      const insertId = result.recordset && result.recordset[0] && result.recordset[0].id ? result.recordset[0].id : null;
      return [{ insertId, affectedRows, changes: affectedRows }];
    }
  };

  if (hasCallback) {
    execute()
      .then(res => callback(null, res[0]))
      .catch(err => callback(err));
    return;
  }

  return execute();
}

module.exports = {
  query,
  poolPromise,
  sql
};
