Project Rating System

Overview
Adds a 1–5 star rating system for completed projects. Only contributors can rate, once per contributor per project. Tracks total ratings and average, with read-only accessors.

Technical Implementation
- New error constants: err-invalid-rating, err-not-contributor, err-project-not-complete, err-already-rated
- New maps:
  - ratings-by-project-user: (project-id, user) ? rating
  - rating-stats-by-project: project-id ? { total, sum }
- New functions:
  - public rate-project(project-id, rating)
  - read-only get-project-rating(project-id)
  - read-only get-project-average-rating(project-id)
  - read-only get-user-rating(project-id, user)
- Average is returned scaled by 100 (e.g., 437 ? 4.37 stars). Integer division floors the value.

Testing & Validation
- ? clarinet check passes
- ? npm tests updated and passing
- ? CI: GitHub Actions workflow runs clarinet check on push
- ? Clarity v3 compliant and independent (no cross-contract calls)
