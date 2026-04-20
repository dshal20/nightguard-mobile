# Unit Testing Plan for NightGuard Mobile

This document outlines a comprehensive unit testing strategy for the `nightguard-mobile` project, organized by features and components. Each suite corresponds to a specific file in the codebase.

## 1. Contexts & Lib (`tests/contexts/`, `tests/lib/`)

### `AuthContext.test.tsx` (tests `contexts/AuthContext.tsx`)
*   **State Management:** Verify the initial authentication state (loading, user null).
*   **Login Flow:** Test successful and failed login attempts.
*   **Logout Flow:** Test successful logout and state clearance.
*   **Session Retry:** Verify `retryGetMe` fetches user details correctly.

### `api.test.ts` (tests `lib/api.ts`)
*   **Endpoints:** Ensure API endpoints are called with the correct base URL and paths.
*   **Headers:** Verify authorization headers are attached correctly.
*   **Error Handling:** Test responses for 4xx and 5xx errors and verify proper exception throwing.

### `auth-actions.test.ts` (tests `lib/auth-actions.ts`)
*   **Sign-in/Sign-up:** Verify that login and registration payloads are correctly formatted.

## 2. Screens / Pages (`tests/app/`)

### `auth.test.tsx` (tests `app/auth.tsx`)
*   **Rendering:** Assert that the login form is rendered by default.
*   **Mode Switching:** Test toggling between login and signup modes.
*   **Input Handling:** Verify that email, password, and full name inputs update the state correctly.
*   **Submission:** Simulate form submission and verify `onSubmit` calls the correct context methods.
*   **Validation:** Verify confirm password validation on the signup form.

### `id-scanner.test.tsx` (tests `app/id-scanner.tsx`)
*   **Permissions:** Test camera permission requests on mount.
*   **Scanning:** Simulate a successful barcode scan and verify the display of scanned data.
*   **Decisions:** Test "ADMITTED" and "DENIED" button interactions.
*   **Reset:** Verify the "Scan Again" button resets the scanner state properly.

### `settings.test.tsx` (tests `app/settings.tsx`)
*   **Profile Loading:** Assert that user profile details are loaded on mount.
*   **Photo Picker:** Test interactions for "Camera" and "Photo Library" options.
*   **Navigation:** Verify the back button navigates correctly.
*   **Sign Out:** Assert the "Sign Out" button triggers the context's sign-out method.

### `(tabs)/home.test.tsx` (tests `app/(tabs)/home.tsx`)
*   **Dashboard Loading:** Verify that dashboard metrics load and render correctly.
*   **New Report:** Assert the "New Report" button opens the `NewReportModal`.
*   **Refresh:** Test the pull-to-refresh functionality for the dashboard.

### `(tabs)/incidents.test.tsx` (tests `app/(tabs)/incidents.tsx`)
*   **List Rendering:** Verify the incidents list is fetched and displayed.
*   **Refresh:** Test the pull-to-refresh functionality for the incidents list.

### `(tabs)/offenders.test.tsx` (tests `app/(tabs)/offenders.tsx`)
*   **List Rendering:** Verify the offenders list is fetched and displayed.
*   **Search/Filter:** Test inputting a search query updates the displayed list.
*   **Refresh:** Test the pull-to-refresh functionality for the offenders list.

## 3. Components (`tests/components/`)

### `dashboard-bottom-nav.test.tsx` (tests `components/dashboard-bottom-nav.tsx`)
*   **Navigation:** Verify that pressing the tab icons navigates to the correct routes (`/home`, `/incidents`, `/offenders`, `/settings`).
*   **New Report Action:** Verify the center "New Report" button triggers the `onNewReport` callback.

### `ProfileCompletionModal.test.tsx` (tests `components/ProfileCompletionModal.tsx`)
*   **Input Handling:** Test updating the "First Name" and "Last Name" fields.
*   **Submission:** Assert the "Submit" button sends the profile data correctly.

### `new-report/NewReportModal.test.tsx` (tests `components/new-report/NewReportModal.tsx`)
*   **Form Inputs:** Verify updates to description, severity, and type fields.
*   **Keywords:** Test adding a keyword (via text input or "Enter") and removing an existing keyword.
*   **Offender Picker:** Assert the "Add Offender" button opens the offender picker sheet.
*   **Photos/Videos:** Test the add photo/video interaction.
*   **Submission:** Simulate a full report submission and verify all data points are collected.

### `new-report/AddOffenderSheet.test.tsx` (tests `components/new-report/AddOffenderSheet.tsx`)
*   **Form Inputs:** Verify updates to first name, last name, physical markers, and notes.
*   **Submission:** Assert the form submission calls the correct API or callback.
