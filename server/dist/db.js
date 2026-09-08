import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
const connectionConfig = {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
};
const databaseName = process.env.DB_NAME ?? 'testseries';
if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error('DB_NAME may only contain letters, numbers, and underscores.');
}
export const db = mysql.createPool({
    ...connectionConfig,
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 10,
});
/** Creates the database and applies idempotent schema migrations before serving requests. */
export async function initializeDatabase() {
    const connection = await mysql.createConnection(connectionConfig);
    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`USE \`${databaseName}\``);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(80) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
        const defaultUsername = process.env.ADMIN_DEFAULT_USERNAME ?? 'admin';
        const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD ?? 'Admin@123';
        const [existingAdmins] = await connection.query('SELECT id FROM admins WHERE username = ? LIMIT 1', [defaultUsername]);
        if (!existingAdmins.length) {
            const passwordHash = await bcrypt.hash(defaultPassword, 12);
            await connection.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [
                defaultUsername,
                passwordHash,
            ]);
            console.log(`Created default admin account: ${defaultUsername}`);
        }
        await connection.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        course ENUM('UPSC', 'UPPCS', 'CGL', 'GATE', 'Others') NOT NULL,
        name VARCHAR(180) NOT NULL,
        option_format ENUM('Alphabetic', 'Numeric', 'Roman') NOT NULL DEFAULT 'Alphabetic',
        duration_minutes SMALLINT UNSIGNED NOT NULL,
        available_from DATETIME NOT NULL,
        available_to DATETIME NOT NULL,
        marks_per_question DECIMAL(6,2) NOT NULL,
        has_negative_marking BOOLEAN NOT NULL DEFAULT FALSE,
        negative_marks_per_question DECIMAL(6,2) NULL,
        status ENUM('Published', 'Draft') NOT NULL DEFAULT 'Published',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
        const [optionFormatColumns] = await connection.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tests' AND COLUMN_NAME = 'option_format'`, [databaseName]);
        if (!optionFormatColumns.length) {
            await connection.query("ALTER TABLE tests ADD COLUMN option_format ENUM('Alphabetic', 'Numeric', 'Roman') NOT NULL DEFAULT 'Alphabetic' AFTER name");
        }
        await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        test_id INT UNSIGNED NOT NULL,
        question_number SMALLINT UNSIGNED NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer ENUM('A', 'B', 'C', 'D') NOT NULL,
        CONSTRAINT fk_questions_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
        CONSTRAINT uq_test_question_number UNIQUE (test_id, question_number)
      )
    `);
    }
    finally {
        await connection.end();
    }
}
