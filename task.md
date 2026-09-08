# Build an Advanced Test Series Platform Setp by Step

Build a production-ready online **Test Series Platform** using:

- React.js for frontend with typescript
- Node.js + Express.js for backend
- MySQL for database
- Tailwind CSS for UI
- REST APIs between frontend and backend

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
