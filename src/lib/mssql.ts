import sql from "mssql";

const config: sql.config = {
  server: process.env.MSSQL_SERVER || "localhost",
  database: process.env.MSSQL_DATABASE || "eSSL",
  user: process.env.MSSQL_USER || "sa",
  password: process.env.MSSQL_PASSWORD || "",
  port: parseInt(process.env.MSSQL_PORT || "1433"),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getMssqlPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export interface BiometricPunch {
  UserId: string;
  LogDate: Date;
  Direction: string;
}

export async function fetchBiometricData(
  fromDate: string,
  toDate: string
): Promise<BiometricPunch[]> {
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("fromDate", sql.Date, fromDate)
    .input("toDate", sql.Date, toDate)
    .query(`
      SELECT 
        UserId,
        LogDate,
        Direction
      FROM DeviceLogs_Processed
      WHERE LogDate >= @fromDate AND LogDate <= @toDate
      ORDER BY UserId, LogDate
    `);
  return result.recordset;
}

export async function fetchBiometricDataForUser(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<BiometricPunch[]> {
  const pool = await getMssqlPool();
  const result = await pool
    .request()
    .input("userId", sql.VarChar, userId)
    .input("fromDate", sql.Date, fromDate)
    .input("toDate", sql.Date, toDate)
    .query(`
      SELECT 
        UserId,
        LogDate,
        Direction
      FROM DeviceLogs_Processed
      WHERE UserId = @userId AND LogDate >= @fromDate AND LogDate <= @toDate
      ORDER BY LogDate
    `);
  return result.recordset;
}
