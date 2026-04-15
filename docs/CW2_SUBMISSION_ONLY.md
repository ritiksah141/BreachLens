# CW2 Submission Only Checklist

Deadline: 12:00 PM (Noon), Friday 1 May 2026
Submission location: CW2 Submission link in Blackboard Assessment area

Filename convention used in this checklist:
- `<StudentID>_<Module>_CW2_<Deliverable>.ext`
- Example student ID used: `B00925357`
- Module code used: `COM661`

---

## Required Files

### 1) Frontend Code Zip
- Include all frontend code needed to build and run.
- Remove node_modules before zipping.
- Keep package.json (and lock file if present) so the app can be rebuilt.

Recommended zip name:
- B00925357_COM661_CW2_Frontend_Code.zip

Minimum expected root content in zip:
- angular.json
- package.json
- package-lock.json (if used)
- tsconfig files
- src folder
- any modified config/assets files

Do not include:
- node_modules
- dist
- coverage
- .angular cache

---

### 2) Video Submission (Max 5 minutes)
Video must include all three:
- Introduce application area.
- Demonstrate application in browser.
- Walk through code you developed/modified.

Recommended file name:
- B00925357_COM661_CW2_Demo.mp4

Time penalty scheme for videos longer than 5 minutes:

| Duration Over 5 Minutes | Penalty |
|---|---|
| 0 to 10 percent over | No penalty |
| >10 to 19 percent over | Reduce total mark by 5 percent |
| >20 to 29 percent over | Reduce total mark by 10 percent |
| >30 to 39 percent over | Reduce total mark by 15 percent |
| >40 to 49 percent over | Reduce total mark by 20 percent |
| >=50 percent over | Max total mark capped at 40 percent |

---

### 3) PDF Code Listings (Frontend Only)
- One PDF containing code listings for frontend files you developed or modified.
- Do not include untouched Angular scaffold files.

Recommended file name:
- B00925357_COM661_CW2_Frontend_Code_Listings.pdf

---

### 4) Separate PDF Documents
Submit separate PDFs for:
- API endpoints summary used by frontend, clearly marking endpoints added or modified since CW1.
- Application testing summary.
- Application documentation.

Recommended file names:
- B00925357_COM661_CW2_API_Endpoints_Summary.pdf
- B00925357_COM661_CW2_Testing_Summary.pdf
- B00925357_COM661_CW2_Application_Documentation.pdf

---

### 5) Self-Evaluation Sheet
- Submit the completed self-evaluation sheet provided by the module teacher.

Recommended file name:
- B00925357_COM661_CW2_Self_Evaluation.pdf

---

## Final Pre-Upload Validation (Submission Day)

- Frontend tests pass.
- Frontend production build passes.
- Zip opens correctly and contains no node_modules.
- Video duration is 5:00 or less.
- All PDFs open and are readable.
- File names are consistent and professional.
- All required items are uploaded to the CW2 Blackboard link before noon.

---

## Quick Frontend Packaging Commands

Run from repository root:

1. Validate app:
   - cd frontend
   - npm run test -- --watch=false --browsers=ChromeHeadless
   - npm run build

2. Create clean zip source (without node_modules/dist/coverage):
   - cd ..
   - rm -rf frontend/node_modules frontend/dist frontend/coverage frontend/.angular
   - zip -r B00925357_COM661_CW2_Frontend_Code.zip frontend -x "*.DS_Store"

If you still need local dependencies after zipping, reinstall with:
- cd frontend
- npm install
