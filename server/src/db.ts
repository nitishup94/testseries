import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
};
const databaseName = process.env.DB_NAME ?? 'testseries';
const studyPlannerDatabaseName = process.env.STUDYPLANNER_DB_NAME ?? 'studyplanner';

if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME may only contain letters, numbers, and underscores.');
}
if (!/^[A-Za-z0-9_]+$/.test(studyPlannerDatabaseName)) {
  throw new Error('STUDYPLANNER_DB_NAME may only contain letters, numbers, and underscores.');
}

export const db = mysql.createPool({
  ...connectionConfig,
  database: databaseName,
  waitForConnections: true,
  connectionLimit: 10,
});
export const studyPlannerDb = mysql.createPool({
  ...connectionConfig,
  database: studyPlannerDatabaseName,
  waitForConnections: true,
  connectionLimit: 10,
});

/** Creates the database and applies idempotent schema migrations before serving requests. */
export async function initializeDatabase(): Promise<void> {
  const connection = await mysql.createConnection(connectionConfig);
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
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
    const [existingAdmins] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM admins WHERE username = ? LIMIT 1',
      [defaultUsername],
    );
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
    const [optionFormatColumns] = await connection.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tests' AND COLUMN_NAME = 'option_format'`,
      [databaseName],
    );
    if (!optionFormatColumns.length) {
      await connection.query(
        "ALTER TABLE tests ADD COLUMN option_format ENUM('Alphabetic', 'Numeric', 'Roman') NOT NULL DEFAULT 'Alphabetic' AFTER name",
      );
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
    await connection.query(`CREATE TABLE IF NOT EXISTS test_attempts (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, test_id INT UNSIGNED NOT NULL, student_id INT UNSIGNED NOT NULL,
      status ENUM('Draft','Completed') NOT NULL DEFAULT 'Draft', started_at DATETIME NOT NULL, submitted_at DATETIME NULL,
      expires_at DATETIME NOT NULL, current_question SMALLINT UNSIGNED NOT NULL DEFAULT 1,
      score DECIMAL(8,2) NULL, correct_count SMALLINT UNSIGNED NULL, incorrect_count SMALLINT UNSIGNED NULL, unanswered_count SMALLINT UNSIGNED NULL,
      positive_marks DECIMAL(8,2) NULL, negative_marks DECIMAL(8,2) NULL, accuracy DECIMAL(6,2) NULL, percentage DECIMAL(6,2) NULL, time_taken_seconds INT UNSIGNED NULL,
      CONSTRAINT fk_attempts_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE, CONSTRAINT uq_student_test_attempt UNIQUE (test_id, student_id)
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS test_attempt_answers (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, attempt_id INT UNSIGNED NOT NULL, question_id INT UNSIGNED NOT NULL,
      selected_answer ENUM('A','B','C','D') NULL, visited BOOLEAN NOT NULL DEFAULT FALSE, marked_for_review BOOLEAN NOT NULL DEFAULT FALSE, time_spent_seconds INT UNSIGNED NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_attempt_answers_attempt FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
      CONSTRAINT fk_attempt_answers_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE, CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
    )`);
  } finally {
    await connection.end();
  }
}
