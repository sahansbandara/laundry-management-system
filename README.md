# SmartFold — Laundry Management System

**Stack:** Spring Boot + H2 + Vanilla HTML/CSS/JS

## Run
1. `./gradlew bootRun`
2. Open `frontend/login.html`

## Database
- Go to `http://localhost:42876/h2-console`
- JDBC URL: `jdbc:h2:mem:lms`  |  User: `sa`  |  Password: *(blank)*

## Demo credentials
- **Admin:** `admin@smartfold.lk` / `1234`
- **Customers:**
  - `nimali@smartfold.lk` / `1234`
  - `ruwan@smartfold.lk`  / `1234`
  - `kamal@smartfold.lk`  / `1234`

## Notes
- Service types & units are **select-only**.
- Messages are text-only and refresh every **5s**.
- Tasks board shows lanes horizontally; move via action buttons.
