CREATE DATABASE IF NOT EXISTS testseries CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE testseries;

CREATE TABLE admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tests (
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
  solution_pdf_path VARCHAR(255) NULL,
  status ENUM('Published', 'Draft') NOT NULL DEFAULT 'Published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE questions (
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
);
