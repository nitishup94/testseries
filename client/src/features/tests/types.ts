export const courses = ['UPSC', 'UPPCS', 'CGL', 'GATE', 'Others'] as const;
export type Course = (typeof courses)[number];
export type Answer = 'A' | 'B' | 'C' | 'D';
export const optionFormats = ['Alphabetic', 'Numeric', 'Roman'] as const;
export type OptionFormat = (typeof optionFormats)[number];
export interface Question {
  questionNumber: number;
  imagePath: string;
  filename?: string;
  correctAnswer: Answer | '';
}
export interface TestDraft {
  id?: number;
  course: Course | '';
  name: string;
  optionFormat: OptionFormat;
  durationMinutes: string;
  availableFrom: string;
  availableTo: string;
  marksPerQuestion: string;
  hasNegativeMarking: boolean;
  negativeMarksPerQuestion: string;
  questions: Question[];
}
export interface TestSummary {
  id: number;
  course: Course;
  name: string;
  durationMinutes: number;
  availableFrom: string;
  availableTo: string;
  marksPerQuestion: number;
  status: 'Published';
  createdAt: string;
  completedCount: number;
  draftCount: number;
}
export interface TestAttemptSummary {
  id: number;
  studentId: number;
  studentName: string;
  status: 'Draft' | 'Completed';
  totalQuestions: number;
  attemptedQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  positiveMarks: number;
  negativeMarks: number;
  finalScore: number;
  rank: number | null;
  timeTakenSeconds: number;
}
export const blankDraft = (): TestDraft => ({
  course: '',
  name: '',
  optionFormat: 'Alphabetic',
  durationMinutes: '',
  availableFrom: '',
  availableTo: '',
  marksPerQuestion: '',
  hasNegativeMarking: false,
  negativeMarksPerQuestion: '',
  questions: [],
});
