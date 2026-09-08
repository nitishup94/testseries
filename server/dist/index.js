import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, initializeDatabase } from './db.js';
const filePath = fileURLToPath(import.meta.url);
const rootDirectory = path.resolve(path.dirname(filePath), '..');
const uploadDirectory = path.join(rootDirectory, 'uploads');
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
            imagePath: `/uploads/${file.filename}`,
        };
    });
    if (uploaded.some((entry) => entry === null))
        return response
            .status(400)
            .json({ message: 'Each filename needs a unique positive number, for example crop-1.png.' });
    response.status(201).json(uploaded.sort((a, b) => a.questionNumber - b.questionNumber));
});
app.get('/api/tests', async (_request, response) => {
    const [rows] = await db.query('SELECT id, course, name, option_format AS optionFormat, duration_minutes AS durationMinutes, available_from AS availableFrom, available_to AS availableTo, marks_per_question AS marksPerQuestion, has_negative_marking AS hasNegativeMarking, negative_marks_per_question AS negativeMarksPerQuestion, status, created_at AS createdAt FROM tests ORDER BY created_at DESC');
    response.json(rows);
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
app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ message: 'Something went wrong. Please try again.' });
});
async function startServer() {
    await initializeDatabase();
    app.listen(Number(process.env.PORT ?? 4000), () => console.log('Database migrated; API listening on port 4000'));
}
void startServer().catch((error) => {
    console.error('Unable to migrate the database or start the API.', error);
    process.exitCode = 1;
});
