# Lessons Learned - RecruitPRO

## Authentication & Security

### Case-Insensitive Email Handling
- **Issue**: Users were unable to login if they used a different case than what was used during registration.
- **Lesson**: Standardize all emails to lowercase in both registration and authentication routes in the backend.

### Cross-Service SSO
- **Lesson**: Use a unified identity model. Sharing the JWT ensures that an authenticated user in the recruiter platform is recognized in the LMS.

## User Experience (UX)

### Decoupling Onboarding from Login
- **Lesson**: Implement "Lazy Profile Creation". Allow users to register with just an email, and prompt them to complete their profile via the dashboard later.

### Persistence of In-Progress Profiles
- **Lesson**: Use `onboarding_step` in the database to allow users to return exactly where they left off in multi-step forms.

## Technical Implementation

### Skill Normalization
- **Lesson**: Technical skills must be normalized (e.g., using ROME codes) to avoid matching gaps caused by spelling variations.

### Real-time Completeness Scoring
- **Lesson**: Calculating a weighted completeness score during onboarding provides immediate feedback and encourages profile completion.
