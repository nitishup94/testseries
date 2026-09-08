# Build an Advanced Test Series Platform Setp by Step

Build a production-ready online **Test Series Platform** using:

- React.js for frontend with typescript
- Node.js + Express.js for backend
- MySQL for database
- Tailwind CSS for UI

Check Techstack skills from dir : /.codex/skills

# Part 1: ✅ Completed

- Build Admin area first after build mark as completed part.

## Test Creation Requirements

Create a test creation flow with the following requirements:

1. **Course Selection**
   - First provide a course dropdown.
   - Courses should be static options: **UPSC, UPPCS, CGL, GATE, Others**.

2. **Test Details**
   - After selecting the course, provide inputs for:
     - Test Name
     - Test Duration
     - Available From Date
     - Available To Date
     - Marks Per Question
     - Negative Marking: Yes/No
     - Negative Marks Per Question (show only when Negative Marking is Yes)

3. **Question Image Upload**
   - Provide a large drag-and-drop area where multiple question images can be uploaded at once.
   - Images will follow a format such as `crop-1.png`, `crop-2.png`, `crop-3.png`, etc.
   - Question numbers must be determined from the image filenames, not upload order.
   - Automatically organize images in ascending numerical order.
   - Example: `crop-1.png` becomes Question 1, `crop-2.png` becomes Question 2, etc.
   - After clicking **Proceed**, show the generated question list.

4. **Question Options**
   - Every question should have four static options: **A, B, C, D**.
   - Provide an input for each option.
   - Provide a way to select the correct answer from A, B, C, or D.
   - Admin should be able to enter/edit the options and select the correct answer for every question.

5. **Create Test**
   - Number of questions must be automatically calculated from the uploaded images.
   - After all question options and correct answers are completed, clicking **Submit/Create Test** should create the test with **Published** status.
   - Store the uploaded question images under the respective test.

6. **Admin Test List**
   - Provide a **Test List** section in the admin dashboard.
   - Show all created tests.
   - Admin can view, edit, and update test details, question options, correct answers, and question images.
   - Changes should be saved to the test.

## Part 2: ✅ Completed

## Part 2 Student Dashboard & Test Requirements

### 1. Student Dashboard

Create a student dashboard with three main sections:

- **Pending Tests** — Tests available for the student but not yet completed.
- **Draft Tests** — Tests that the student has started but has not completed.
- **Completed Tests** — Tests already submitted by the student.

Show the **count** of tests for each section. When the student clicks a section, show the complete list of tests belonging to that section.

- Show the latest tests at the top.
- Each test card/list item should display relevant information such as test name, duration, number of questions, total marks, availability, and status.

### 2. Start & Resume Test

- When a student starts a pending test, the test timer should start from that moment.
- If the student has already started a test and leaves it incomplete, it should appear under **Draft Tests**.
- When the student opens a draft test again, it must resume from exactly where they left off.
- The remaining time should continue from the previous session and should not restart from the beginning.
- Previously selected answers, visited questions, marked-for-review questions, and current question should be preserved.

### 3. Test Availability & Timer

Design the test window with a proper test-taking experience.

Include:

- Test header with test name and timer.
- One question displayed at a time.
- Question navigation.
- Previous and Next controls.
- Answer selection.
- Clear Answer option.
- Mark for Review option.
- Question status indicators.
- Answered, unanswered, visited, and marked-for-review states.
- Submit Test option.
- Proper confirmation before final submission.
- Automatically handle test expiration when the timer ends.

The test should follow the configured test availability window.

### 4. Test Submission & Score Calculation

After the student submits the test:

- Calculate the total score according to the configured marks per question.
- Calculate positive marks for correct answers.
- Calculate negative marks for incorrect answers when negative marking is enabled.
- Do not deduct marks for unanswered questions.
- Display the final score clearly.

Show complete result details including:

- Total Questions
- Correct Answers
- Incorrect Answers
- Unanswered Questions
- Positive Marks
- Negative Marks
- Final Score
- Accuracy
- Percentage
- Time Taken

### 5. Completed Test Details

For every completed test, show detailed result information in the student's dashboard/test history.

The student should be able to open a completed test and see:

- Question-wise answers
- Student's selected answer
- Correct answer
- Correct/Incorrect/Skipped status
- Marks obtained for each question
- Total positive marks
- Total negative marks
- Final score
- Accuracy
- Percentage
- Time taken

### 6. Student Performance Analytics

Add performance charts to the student dashboard.

Include:

- **Score Trend Chart** — Show how the student's scores are changing across completed tests.
- **Accuracy Trend Chart** — Show accuracy across completed tests.
- Allow the student to understand whether their performance is improving or declining.

### 7. Question Analysis

After completing/reviewing a test, provide question-level analysis.

For each question, show:

- Whether the student's answer was correct, incorrect, or skipped.
- Correct answer.
- Student's answer.
- Marks obtained.

Also provide comparative question analysis where appropriate, such as:

- Number/percentage of students who answered the question correctly.
- Number/percentage of students who answered incorrectly.
- Number of students who skipped the question.
- Average time taken by students to attempt the question.
- Time taken by the top-performing students to attempt the question.

This should help the student understand which questions were easy, difficult, time-consuming, or commonly answered incorrectly.

### 8. Mobile Compatibility

The complete student experience must be mobile-friendly.

The following should work comfortably on mobile devices:

- Dashboard
- Test lists
- Test cards
- Question display
- Options
- Timer
- Question navigation
- Mark for Review
- Submit confirmation
- Results
- Charts
- Question analysis

The test-taking interface should be easy to use with touch controls and should remain readable without unnecessary horizontal scrolling.

### 9. Overall Student Flow

The complete flow should be:

**Student Dashboard → Pending Test → Start Test → Answer Questions → Save/Resume Progress → Submit Test → Score Calculation → Result → Detailed Analysis → Performance Tracking**

For an incomplete test:

**Student Dashboard → Draft Test → Resume From Previous Position → Continue Test → Submit → Completed Test**

## Existing User Database & Authentication

The existing user system is already available in a separate MySQL database named `studyplanner`. **Do not create, copy, modify, or duplicate the `users` table in the Test Series database.**

Use the existing `studyplanner.users` table as the single source of truth for student accounts and user information.

### Existing User Fields

The existing `users` table contains user information including:

- `id`
- `name`
- `email`
- `pass`
- `mobile`
- `profile_image`
- `role`
- `status`
- `account_status`
- `full_name`
- `password`
- `gender`
- `bio`
- `last_seen`
- `is_online`
- `updated_at`

Use the existing **`users.id`** as the student/user identifier throughout the Test Series system.

### Authentication

Use the existing user authentication system and existing `users` data.

For password authentication, use the existing **`pass`** field. Passwords in this field are generated using PHP's:

`password_hash($password, PASSWORD_DEFAULT)`

Node.js authentication must correctly verify these existing PHP password hashes instead of trying to create a new password format or changing the stored passwords.

Authentication should:

- Validate the user's credentials against the existing `studyplanner.users` database.
- Check that the user account is active before allowing login.
- Respect the existing `role`, `status`, and `account_status` values.
- Generate and maintain the Test Series application's authenticated session/token according to the existing authentication flow.
- Never store a duplicate password or user account in the Test Series database.

### Existing Token-Based Login

The existing application also supports token-based student login using an admin-issued access token.

Maintain compatibility with this existing flow where required:

- Validate the provided access token using the existing user/access-token system.
- Resolve the associated `user_id`.
- Fetch the student from the existing `studyplanner.users` table.
- Verify that the account is active.
- Do not allow admin/super-admin accounts to use student token login.
- Generate the authenticated Test Series session/token containing the existing user identity, especially the `users.id` and account email/username.

The Node.js application should handle the PHP-generated password hashes and existing authentication/token behavior correctly without modifying the existing PHP application.

### Test Series Database

The separate Test Series database must contain **only Test Series-specific data**.

Do not create any user/profile/password table.

Store student-specific Test Series data using the existing `users.id`, such as:

- Test attempts
- Selected answers
- Attempt status
- Start/submission time
- Progress
- Score
- Correct answers
- Wrong answers
- Skipped questions
- Positive marks
- Negative marks
- Percentage
- Accuracy
- Time taken
- Question-wise results
- Other Test Series-specific student activity

The Test Series database should identify students by the existing `studyplanner.users.id`.

Because the user database and Test Series database are separate databases, user relationships can be maintained at the application level rather than creating a cross-database foreign key.

**Important:** Never create a second user table, duplicate user credentials, or duplicate user profiles in the Test Series database. Always fetch current user details from the existing `studyplanner.users` database when user information is required.
