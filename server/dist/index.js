import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, initializeDatabase, studyPlannerDb } from './db.js';
const filePath = fileURLToPath(import.meta.url);
const rootDirectory = path.resolve(path.dirname(filePath), '..');
const uploadDirectory = path.join(rootDirectory, 'uploads');
const publicUploadBasePath = process.env.PUBLIC_BASE_PATH ?? '/testseries/server';
const resolveUploadUrl = (filename) => `${publicUploadBasePath}/uploads/${filename}`;
const courses = ['UPSC', 'UPPCS', 'CGL', 'GATE', 'Others'];
const answers = ['A', 'B', 'C', 'D'];
const optionFormats = ['Alphabetic', 'Numeric', 'Roman'];
const storage = multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
    storage,
    limits: { files: 200, fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadDirectory));
app.use(`${publicUploadBasePath}/uploads`, express.static(uploadDirectory));
const jwtSecret = process.env.JWT_SECRET ?? 'development-only-secret-change-before-production';
function requireAdmin(request, response, next) {
    const token = request.header('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) {
        response.status(401).json({ message: 'Sign in as an administrator to continue.' });
        return;
    }
    try {
        const payload = jwt.verify(token, jwtSecret);
        if (typeof payload === 'string' ||
            typeof payload.sub !== 'string' ||
            typeof payload.username !== 'string') {
            response.status(401).json({ message: 'Your sign-in session is invalid.' });
            return;
        }
        request.admin = {
            id: Number(payload.sub),
            username: payload.username,
        };
        next();
    }
    catch {
        response
            .status(401)
            .json({ message: 'Your sign-in session has expired. Please sign in again.' });
    }
}
function isCourse(value) {
    return typeof value === 'string' && courses.includes(value);
}
function isAnswer(value) {
    return typeof value === 'string' && answers.includes(value);
}
function isOptionFormat(value) {
    return typeof value === 'string' && optionFormats.includes(value);
}
app.post('/api/auth/login', async (request, response, next) => {
    try {
        const { username, password } = request.body;
        if (typeof username !== 'string' || typeof password !== 'string') {
            response.status(400).json({ message: 'Username and password are required.' });
            return;
        }
        const [admins] = await db.execute('SELECT id, username, password_hash AS passwordHash FROM admins WHERE username = ? LIMIT 1', [username.trim()]);
        const admin = admins[0];
        if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
            response.status(401).json({ message: 'Invalid username or password.' });
            return;
        }
        const token = jwt.sign({ username: admin.username }, jwtSecret, {
            subject: String(admin.id),
            expiresIn: '8h',
        });
        response.json({ token, admin: { id: admin.id, username: admin.username } });
    }
    catch (error) {
        next(error);
    }
});
function requireStudent(request, response, next) {
    const token = request.header('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token)
        return void response.status(401).json({ message: 'Please sign in to continue.' });
    try {
        const payload = jwt.verify(token, jwtSecret);
        if (payload.kind !== 'student' ||
            typeof payload.sub !== 'string' ||
            typeof payload.email !== 'string')
            throw new Error('Invalid token');
        request.student = {
            id: Number(payload.sub),
            name: String(payload.name ?? 'Student'),
            email: payload.email,
        };
        next();
    }
    catch {
        response
            .status(401)
            .json({ message: 'Your student session has expired. Please sign in again.' });
    }
}
app.post('/api/student/auth/login', async (request, response, next) => {
    try {
        const { email, password } = request.body;
        if (typeof email !== 'string' || typeof password !== 'string')
            return void response.status(400).json({ message: 'Email and password are required.' });
        const [users] = await studyPlannerDb.query('SELECT id, name, full_name AS fullName, email, pass, role, status, account_status AS accountStatus FROM users WHERE email=? LIMIT 1', [email.trim()]);
        const user = users[0];
        const active = user &&
            String(user.status ?? '').toLowerCase() !== 'inactive' &&
            String(user.accountStatus ?? '').toLowerCase() !== 'inactive';
        if (!active ||
            ['admin', 'super-admin', 'super_admin'].includes(String(user.role).toLowerCase()) ||
            !(await bcrypt.compare(password, String(user.pass).replace(/^\$2y\$/, '$2a$'))))
            return void response
                .status(401)
                .json({ message: 'Invalid credentials or inactive account.' });
        const name = String(user.fullName || user.name || 'Student');
        const token = jwt.sign({ kind: 'student', email: user.email, name }, jwtSecret, {
            subject: String(user.id),
            expiresIn: '8h',
        });
        response.json({ token, student: { id: user.id, name, email: user.email } });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/student/auth/studyplanner-sso', async (request, response, next) => {
    try {
        const { token } = request.body;
        if (typeof token !== 'string' || !token.trim())
            return void response.status(400).json({ message: 'StudyPlanner token is required.' });
        const studyPlannerSecret = process.env.STUDYPLANNER_JWT_SECRET ?? 'mynameisnitish';
        let payload;
        try {
            payload = jwt.verify(token, studyPlannerSecret);
        }
        catch {
            return void response.status(401).json({ message: 'Invalid StudyPlanner token.' });
        }
        const email = String(payload.username ?? payload.email ?? '')
            .trim()
            .toLowerCase();
        if (!email)
            return void response
                .status(400)
                .json({ message: 'StudyPlanner token is missing user email.' });
        const [users] = await studyPlannerDb.query('SELECT id, name, full_name AS fullName, email, pass, role, status, account_status AS accountStatus FROM users WHERE email=? LIMIT 1', [email]);
        const user = users[0];
        if (!user)
            return void response.status(404).json({ message: 'User not found in Test Series.' });
        const active = String(user.status ?? '').toLowerCase() !== 'inactive' &&
            String(user.accountStatus ?? '').toLowerCase() !== 'inactive';
        if (!active ||
            ['admin', 'super-admin', 'super_admin'].includes(String(user.role).toLowerCase()))
            return void response
                .status(401)
                .json({ message: 'This account is not allowed in Test Series.' });
        const name = String(user.fullName || user.name || 'Student');
        const sessionToken = jwt.sign({ kind: 'student', email: user.email, name }, jwtSecret, {
            subject: String(user.id),
            expiresIn: '8h',
        });
        response.json({ token: sessionToken, student: { id: user.id, name, email: user.email } });
    }
    catch (error) {
        next(error);
    }
});
app.use('/api/student', requireStudent);
app.get('/api/student/dashboard', async (request, response, next) => {
    try {
        const studentId = request.student.id;
        const [tests] = await db.query(`SELECT t.id,t.name,t.course,t.duration_minutes AS durationMinutes,t.marks_per_question AS marksPerQuestion,t.available_from AS availableFrom,t.available_to AS availableTo,COUNT(q.id) AS questionCount, a.id AS attemptId,a.status,a.expires_at AS expiresAt,a.remaining_time_seconds AS remainingTimeSeconds,a.score,a.accuracy,a.percentage FROM tests t LEFT JOIN questions q ON q.test_id=t.id LEFT JOIN test_attempts a ON a.test_id=t.id AND a.student_id=? WHERE t.status='Published' GROUP BY t.id,a.id ORDER BY t.created_at DESC`, [studentId]);
        const now = Date.now();
        const pending = tests.filter((t) => !t.attemptId &&
            new Date(t.availableFrom).getTime() <= now &&
            new Date(t.availableTo).getTime() >= now);
        const draft = tests
            .filter((t) => t.status === 'Draft')
            .map((t) => ({
            ...t,
            remainingTimeSeconds: t.remainingTimeSeconds !== null && t.remainingTimeSeconds !== undefined
                ? Math.max(0, Number(t.remainingTimeSeconds))
                : t.expiresAt
                    ? Math.max(0, Math.ceil((new Date(t.expiresAt).getTime() - now) / 1000))
                    : null,
        }));
        const completed = tests.filter((t) => t.status === 'Completed');
        response.json({
            student: request.student,
            pending,
            draft,
            completed,
            analytics: completed.map((t) => ({
                name: t.name,
                score: Number(t.score),
                accuracy: Number(t.accuracy),
                percentage: Number(t.percentage),
            })),
        });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/student/tests/:testId/start', async (request, response, next) => {
    try {
        const studentId = request.student.id, testId = Number(request.params.testId);
        const [tests] = await db.execute("SELECT id,duration_minutes AS durationMinutes,available_from AS availableFrom,available_to AS availableTo FROM tests WHERE id=? AND status='Published'", [testId]);
        const test = tests[0];
        if (!test ||
            new Date(test.availableFrom) > new Date() ||
            new Date(test.availableTo) < new Date())
            return void response.status(403).json({ message: 'This test is not currently available.' });
        const [existing] = await db.execute('SELECT id,status FROM test_attempts WHERE test_id=? AND student_id=?', [testId, studentId]);
        if (existing[0]?.status === 'Completed')
            return void response.status(409).json({ message: 'This test is already completed.' });
        let attemptId = existing[0]?.id;
        if (!attemptId) {
            const totalSeconds = Number(test.durationMinutes) * 60;
            const expiresAt = new Date(Date.now() + totalSeconds * 1000);
            const [result] = await db.execute('INSERT INTO test_attempts (test_id,student_id,started_at,expires_at,remaining_time_seconds) VALUES (?,?,NOW(),?,?)', [testId, studentId, expiresAt, totalSeconds]);
            attemptId = result.insertId;
        }
        response.json({ attemptId });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/student/attempts/:attemptId', async (request, response, next) => {
    try {
        const [attempts] = await db.execute(`SELECT a.*,t.name,t.course,t.duration_minutes AS durationMinutes,t.available_to AS availableTo,t.option_format AS optionFormat,t.marks_per_question AS marksPerQuestion,t.has_negative_marking AS hasNegativeMarking,t.negative_marks_per_question AS negativeMarksPerQuestion FROM test_attempts a JOIN tests t ON t.id=a.test_id WHERE a.id=? AND a.student_id=?`, [request.params.attemptId, request.student.id]);
        const attempt = attempts[0];
        if (!attempt)
            return void response.status(404).json({ message: 'Attempt not found.' });
        const [questions] = await db.execute(`SELECT q.id,q.question_number AS questionNumber,q.image_path AS imagePath,q.option_a AS optionA,q.option_b AS optionB,q.option_c AS optionC,q.option_d AS optionD,q.correct_answer AS correctAnswer,aa.selected_answer AS selectedAnswer,aa.visited,aa.marked_for_review AS markedForReview,COALESCE(aa.time_spent_seconds,0) AS timeSpentSeconds FROM questions q LEFT JOIN test_attempt_answers aa ON aa.question_id=q.id AND aa.attempt_id=? WHERE q.test_id=? ORDER BY q.question_number`, [attempt.id, attempt.test_id]);
        const remainingTimeSeconds = Number(attempt.remaining_time_seconds ??
            Math.max(0, Math.ceil((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)));
        response.json({
            ...attempt,
            remainingTimeSeconds,
            questions,
        });
    }
    catch (error) {
        next(error);
    }
});
app.put('/api/student/attempts/:attemptId/progress', async (request, response, next) => {
    try {
        const { currentQuestion, answers, remainingTimeSeconds, freezeCountdown } = request.body;
        const [owned] = await db.execute("SELECT id, expires_at, remaining_time_seconds FROM test_attempts WHERE id=? AND student_id=? AND status='Draft'", [request.params.attemptId, request.student.id]);
        if (!owned.length)
            return void response.status(404).json({ message: 'Draft attempt not found.' });
        const currentRemaining = remainingTimeSeconds !== undefined &&
            remainingTimeSeconds !== null &&
            Number.isFinite(Number(remainingTimeSeconds))
            ? Math.max(0, Number(remainingTimeSeconds))
            : Math.max(0, Math.ceil((new Date(owned[0].expires_at).getTime() - Date.now()) / 1000));
        if (freezeCountdown) {
            const frozenExpiresAt = new Date(Date.now() + currentRemaining * 1000);
            await db.execute('UPDATE test_attempts SET current_question=?, expires_at=?, remaining_time_seconds=? WHERE id=?', [currentQuestion, frozenExpiresAt, currentRemaining, request.params.attemptId]);
        }
        else {
            await db.execute('UPDATE test_attempts SET current_question=?, remaining_time_seconds=? WHERE id=?', [currentQuestion, currentRemaining, request.params.attemptId]);
        }
        for (const a of answers)
            await db.execute('INSERT INTO test_attempt_answers (attempt_id,question_id,selected_answer,visited,marked_for_review,time_spent_seconds) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE selected_answer=VALUES(selected_answer),visited=VALUES(visited),marked_for_review=VALUES(marked_for_review),time_spent_seconds=VALUES(time_spent_seconds)', [
                request.params.attemptId,
                a.questionId,
                a.selectedAnswer ?? null,
                a.visited,
                a.markedForReview,
                a.timeSpentSeconds,
            ]);
        response.json({ saved: true, remainingTimeSeconds: currentRemaining });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/student/attempts/:attemptId/submit', async (request, response, next) => {
    try {
        const [rows] = await db.execute(`SELECT a.*,t.duration_minutes AS durationMinutes,t.marks_per_question AS marks,t.has_negative_marking AS negativeEnabled,t.negative_marks_per_question AS negative,q.id AS questionId,q.correct_answer AS correctAnswer,aa.selected_answer AS selectedAnswer,aa.time_spent_seconds AS timeSpentSeconds FROM test_attempts a JOIN tests t ON t.id=a.test_id JOIN questions q ON q.test_id=t.id LEFT JOIN test_attempt_answers aa ON aa.attempt_id=a.id AND aa.question_id=q.id WHERE a.id=? AND a.student_id=? AND a.status='Draft'`, [request.params.attemptId, request.student.id]);
        if (!rows.length)
            return void response.status(404).json({ message: 'Draft attempt not found.' });
        let correct = 0, incorrect = 0, unanswered = 0;
        for (const row of rows) {
            if (!row.selectedAnswer)
                unanswered++;
            else if (row.selectedAnswer === row.correctAnswer)
                correct++;
            else
                incorrect++;
        }
        const positive = correct * Number(rows[0].marks), negative = rows[0].negativeEnabled ? incorrect * Number(rows[0].negative) : 0, score = positive - negative, total = rows.length, testDurationSeconds = Number(rows[0].durationMinutes) * 60, activeSeconds = rows.reduce((sum, row) => sum + Math.max(0, Number(row.timeSpentSeconds ?? 0)), 0), timeTakenSeconds = Math.min(Math.max(0, activeSeconds), testDurationSeconds || activeSeconds);
        await db.execute("UPDATE test_attempts SET status='Completed',submitted_at=NOW(),score=?,correct_count=?,incorrect_count=?,unanswered_count=?,positive_marks=?,negative_marks=?,accuracy=?,percentage=?,time_taken_seconds=? WHERE id=?", [
            score,
            correct,
            incorrect,
            unanswered,
            positive,
            negative,
            total ? (correct / total) * 100 : 0,
            total ? (score / (total * Number(rows[0].marks))) * 100 : 0,
            Math.floor(timeTakenSeconds),
            request.params.attemptId,
        ]);
        response.json({
            score,
            correct,
            incorrect,
            unanswered,
            positiveMarks: positive,
            negativeMarks: negative,
            accuracy: total ? (correct / total) * 100 : 0,
            percentage: total ? (score / (total * Number(rows[0].marks))) * 100 : 0,
            timeTakenSeconds: Math.floor(timeTakenSeconds),
        });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/student/attempts/:attemptId/analysis', async (request, response, next) => {
    try {
        const [owned] = await db.execute("SELECT test_id AS testId FROM test_attempts WHERE id=? AND student_id=? AND status='Completed'", [request.params.attemptId, request.student.id]);
        if (!owned[0])
            return void response.status(404).json({ message: 'Completed attempt not found.' });
        const [rows] = await db.execute(`SELECT q.id AS questionId, COUNT(aa.id) AS totalAttempts, SUM(aa.selected_answer=q.correct_answer) AS correctCount, SUM(aa.selected_answer IS NOT NULL AND aa.selected_answer<>q.correct_answer) AS incorrectCount, SUM(aa.selected_answer IS NULL) AS skippedCount, AVG(aa.time_spent_seconds) AS averageTimeSeconds, MIN(CASE WHEN ranked.score_rank <= 10 THEN aa.time_spent_seconds END) AS topPerformerTimeSeconds FROM questions q LEFT JOIN test_attempt_answers aa ON aa.question_id=q.id LEFT JOIN (SELECT id,RANK() OVER (ORDER BY score DESC) AS score_rank FROM test_attempts WHERE test_id=? AND status='Completed') ranked ON ranked.id=aa.attempt_id WHERE q.test_id=? GROUP BY q.id`, [owned[0].testId, owned[0].testId]);
        response.json(rows.map((row) => ({
            ...row,
            totalAttempts: Number(row.totalAttempts),
            correctCount: Number(row.correctCount || 0),
            incorrectCount: Number(row.incorrectCount || 0),
            skippedCount: Number(row.skippedCount || 0),
            averageTimeSeconds: Math.round(Number(row.averageTimeSeconds || 0)),
            topPerformerTimeSeconds: row.topPerformerTimeSeconds === null ? null : Number(row.topPerformerTimeSeconds),
        })));
    }
    catch (error) {
        next(error);
    }
});
app.use('/api/tests', requireAdmin);
app.use('/api/uploads', requireAdmin);
function readTest(body) {
    if (typeof body !== 'object' || body === null)
        return null;
    const value = body;
    if (!isCourse(value.course) ||
        !isOptionFormat(value.optionFormat) ||
        typeof value.name !== 'string' ||
        !value.name.trim() ||
        !Array.isArray(value.questions))
        return null;
    const durationMinutes = Number(value.durationMinutes), marksPerQuestion = Number(value.marksPerQuestion);
    if (!Number.isFinite(durationMinutes) ||
        durationMinutes <= 0 ||
        !Number.isFinite(marksPerQuestion) ||
        marksPerQuestion < 0)
        return null;
    const questions = [];
    for (const item of value.questions) {
        if (typeof item !== 'object' || item === null)
            return null;
        const q = item;
        if (!Number.isInteger(Number(q.questionNumber)) ||
            typeof q.imagePath !== 'string' ||
            !q.imagePath ||
            !isAnswer(q.correctAnswer))
            return null;
        questions.push({
            questionNumber: Number(q.questionNumber),
            imagePath: q.imagePath,
            correctAnswer: q.correctAnswer,
        });
    }
    if (!questions.length ||
        new Set(questions.map((question) => question.questionNumber)).size !== questions.length)
        return null;
    const hasNegativeMarking = Boolean(value.hasNegativeMarking);
    const negativeMarks = hasNegativeMarking ? Number(value.negativeMarksPerQuestion) : null;
    if (hasNegativeMarking && (!Number.isFinite(negativeMarks) || negativeMarks < 0))
        return null;
    return {
        course: value.course,
        name: value.name.trim(),
        optionFormat: value.optionFormat,
        durationMinutes,
        availableFrom: String(value.availableFrom),
        availableTo: String(value.availableTo),
        marksPerQuestion,
        hasNegativeMarking,
        negativeMarksPerQuestion: negativeMarks,
        questions,
    };
}
async function saveTest(input, id) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        let testId = id;
        const values = [
            input.course,
            input.name,
            input.optionFormat,
            input.durationMinutes,
            input.availableFrom,
            input.availableTo,
            input.marksPerQuestion,
            input.hasNegativeMarking,
            input.negativeMarksPerQuestion,
        ];
        if (testId) {
            await connection.execute("UPDATE tests SET course=?, name=?, option_format=?, duration_minutes=?, available_from=?, available_to=?, marks_per_question=?, has_negative_marking=?, negative_marks_per_question=?, status='Published' WHERE id=?", [...values, testId]);
            await connection.execute('DELETE FROM questions WHERE test_id=?', [testId]);
        }
        else {
            const [result] = await connection.execute("INSERT INTO tests (course,name,option_format,duration_minutes,available_from,available_to,marks_per_question,has_negative_marking,negative_marks_per_question,status) VALUES (?,?,?,?,?,?,?,?,?,'Published')", values);
            testId = result.insertId;
        }
        await connection.query('INSERT INTO questions (test_id,question_number,image_path,option_a,option_b,option_c,option_d,correct_answer) VALUES ?', [
            input.questions.map((q) => [
                testId,
                q.questionNumber,
                q.imagePath,
                'Option A',
                'Option B',
                'Option C',
                'Option D',
                q.correctAnswer,
            ]),
        ]);
        await connection.commit();
        return testId;
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
app.post('/api/uploads/questions', upload.array('images', 200), (request, response) => {
    const files = request.files;
    if (!files?.length)
        return response.status(400).json({ message: 'Upload at least one question image.' });
    const seen = new Set();
    const uploaded = files.map((file) => {
        const match = file.originalname.match(/(?:^|[-_\s])(\d+)(?=\.[^.]+$)/);
        const questionNumber = match ? Number(match[1]) : NaN;
        if (!Number.isInteger(questionNumber) || questionNumber < 1 || seen.has(questionNumber))
            return null;
        seen.add(questionNumber);
        return {
            questionNumber,
            filename: file.originalname,
            imagePath: resolveUploadUrl(file.filename),
        };
    });
    if (uploaded.some((entry) => entry === null))
        return response
            .status(400)
            .json({ message: 'Each filename needs a unique positive number, for example crop-1.png.' });
    response.status(201).json(uploaded.sort((a, b) => a.questionNumber - b.questionNumber));
});
app.get('/api/tests', async (_request, response) => {
    const [rows] = await db.query(`SELECT t.id, t.course, t.name, t.option_format AS optionFormat, t.duration_minutes AS durationMinutes, t.available_from AS availableFrom, t.available_to AS availableTo, t.marks_per_question AS marksPerQuestion, t.has_negative_marking AS hasNegativeMarking, t.negative_marks_per_question AS negativeMarksPerQuestion, t.status, t.created_at AS createdAt,
      COALESCE(SUM(a.status = 'Completed'), 0) AS completedCount,
      COALESCE(SUM(a.status = 'Draft'), 0) AS draftCount
     FROM tests t LEFT JOIN test_attempts a ON a.test_id = t.id
     GROUP BY t.id ORDER BY t.created_at DESC`);
    response.json(rows.map((row) => ({
        ...row,
        completedCount: Number(row.completedCount),
        draftCount: Number(row.draftCount),
    })));
});
app.get('/api/tests/:id/attempts', async (request, response, next) => {
    try {
        const testId = Number(request.params.id);
        const [attempts] = await db.execute(`SELECT a.id, a.student_id AS studentId, a.status, a.score, a.positive_marks AS positiveMarks, a.negative_marks AS negativeMarks,
        a.correct_count AS correctCount, a.incorrect_count AS incorrectCount, a.unanswered_count AS unansweredCount,
        a.time_taken_seconds AS timeTakenSeconds, a.started_at AS startedAt, a.submitted_at AS submittedAt,
        t.duration_minutes * 60 AS durationSeconds, t.marks_per_question AS marksPerQuestion,
        t.has_negative_marking AS hasNegativeMarking, t.negative_marks_per_question AS negativeMarksPerQuestion,
        COUNT(q.id) AS totalQuestions,
        COALESCE(SUM(aa.selected_answer IS NOT NULL), 0) AS attemptedQuestions,
        COALESCE(SUM(aa.selected_answer = q.correct_answer), 0) AS calculatedCorrect,
        COALESCE(SUM(aa.selected_answer IS NOT NULL AND aa.selected_answer <> q.correct_answer), 0) AS calculatedIncorrect
       FROM test_attempts a
       JOIN tests t ON t.id = a.test_id
       LEFT JOIN questions q ON q.test_id = t.id
       LEFT JOIN test_attempt_answers aa ON aa.attempt_id = a.id AND aa.question_id = q.id
       WHERE a.test_id = ?
       GROUP BY a.id, t.id`, [testId]);
        const studentIds = attempts.map((attempt) => Number(attempt.studentId));
        const names = new Map();
        if (studentIds.length) {
            const [students] = await studyPlannerDb.query("SELECT id, COALESCE(NULLIF(full_name, ''), NULLIF(name, ''), email) AS name FROM users WHERE id IN (?)", [studentIds]);
            for (const student of students)
                names.set(Number(student.id), String(student.name));
        }
        const completed = attempts
            .filter((attempt) => attempt.status === 'Completed')
            .sort((a, b) => Number(b.score) - Number(a.score) ||
            Number(a.timeTakenSeconds) - Number(b.timeTakenSeconds) ||
            new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
        const ranks = new Map();
        completed.forEach((attempt, index) => ranks.set(Number(attempt.id), index + 1));
        response.json(attempts
            .map((attempt) => {
            const completedAttempt = attempt.status === 'Completed';
            const correct = Number(completedAttempt ? attempt.correctCount : attempt.calculatedCorrect);
            const incorrect = Number(completedAttempt ? attempt.incorrectCount : attempt.calculatedIncorrect);
            const totalQuestions = Number(attempt.totalQuestions);
            const attemptedQuestions = Number(completedAttempt
                ? totalQuestions - Number(attempt.unansweredCount)
                : attempt.attemptedQuestions);
            const negativeMarks = completedAttempt
                ? Number(attempt.negativeMarks)
                : Number(attempt.hasNegativeMarking)
                    ? incorrect * Number(attempt.negativeMarksPerQuestion)
                    : 0;
            const positiveMarks = completedAttempt
                ? Number(attempt.positiveMarks)
                : correct * Number(attempt.marksPerQuestion);
            return {
                id: Number(attempt.id),
                studentId: Number(attempt.studentId),
                studentName: names.get(Number(attempt.studentId)) ?? `Student #${attempt.studentId}`,
                status: attempt.status,
                totalQuestions,
                attemptedQuestions,
                correctCount: correct,
                incorrectCount: incorrect,
                unansweredCount: totalQuestions - attemptedQuestions,
                positiveMarks,
                negativeMarks,
                finalScore: completedAttempt ? Number(attempt.score) : positiveMarks - negativeMarks,
                rank: ranks.get(Number(attempt.id)) ?? null,
                timeTakenSeconds: completedAttempt
                    ? Number(attempt.timeTakenSeconds)
                    : Math.min(Number(attempt.durationSeconds), Math.max(0, Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000))),
            };
        })
            .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
            a.studentName.localeCompare(b.studentName)));
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/tests/:id', async (request, response) => {
    const [tests] = await db.execute('SELECT id, course, name, option_format AS optionFormat, duration_minutes AS durationMinutes, available_from AS availableFrom, available_to AS availableTo, marks_per_question AS marksPerQuestion, has_negative_marking AS hasNegativeMarking, negative_marks_per_question AS negativeMarksPerQuestion, status FROM tests WHERE id=?', [request.params.id]);
    if (!Array.isArray(tests) || !tests.length)
        return response.status(404).json({ message: 'Test not found.' });
    const [questions] = await db.execute('SELECT id, question_number AS questionNumber, image_path AS imagePath, correct_answer AS correctAnswer FROM questions WHERE test_id=? ORDER BY question_number', [request.params.id]);
    response.json({ ...tests[0], questions });
});
app.post('/api/tests', async (request, response) => {
    const input = readTest(request.body);
    if (!input)
        return response.status(400).json({
            message: 'Complete all test details and choose one correct answer for every question.',
        });
    response.status(201).json({ id: await saveTest(input), status: 'Published' });
});
app.put('/api/tests/:id', async (request, response) => {
    const input = readTest(request.body);
    if (!input)
        return response.status(400).json({
            message: 'Complete all test details and choose one correct answer for every question.',
        });
    await saveTest(input, Number(request.params.id));
    response.json({ id: Number(request.params.id), status: 'Published' });
});
app.delete('/api/tests/:id', async (request, response, next) => {
    try {
        const testId = Number(request.params.id);
        if (!Number.isInteger(testId) || testId <= 0)
            return void response.status(400).json({ message: 'A valid test id is required.' });
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.execute('SELECT id, name FROM tests WHERE id=?', [testId]);
            if (!rows.length)
                return void response.status(404).json({ message: 'Test not found.' });
            const [questions] = await connection.execute('SELECT image_path AS imagePath FROM questions WHERE test_id=?', [testId]);
            await connection.execute('DELETE FROM tests WHERE id=?', [testId]);
            for (const question of questions) {
                const imagePath = String(question.imagePath ?? '').trim();
                if (!imagePath)
                    continue;
                const pathname = imagePath.startsWith('http') ? new URL(imagePath).pathname : imagePath;
                const filename = path.basename(decodeURIComponent(pathname));
                if (!filename)
                    continue;
                const filePath = path.join(uploadDirectory, filename);
                try {
                    await fs.unlink(filePath);
                }
                catch {
                    // Ignore missing file or already removed files.
                }
            }
            await connection.commit();
            response.json({ id: testId, deleted: true, name: String(rows[0].name) });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        next(error);
    }
});
app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ message: 'Something went wrong. Please try again.' });
});
async function startServer() {
    await initializeDatabase();
    app.listen(Number(process.env.PORT ?? 4001), () => console.log('Database migrated; API listening on port 4001'));
}
void startServer().catch((error) => {
    console.error('Unable to migrate the database or start the API.', error);
    process.exitCode = 1;
});
