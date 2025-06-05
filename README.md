# 🚆 Railway Reservation System

A Node.js + Express backend for a smart **railway ticket reservation system** with support for:
- Booking confirmed, RAC, and waiting tickets
- Intelligent berth allocation (including children, elderly, women)
- Automatic promotion of passengers on cancellation
- Dockerized setup for easy deployment

---

## 🛠 Tech Stack

- Node.js + Express
- PostgreSQL
- Knex.js
- Docker + Docker Compose

---

## 📁 Project Structure

src/
├── controllers/ # ticketController.js
├── db/
│ ├── connection.js
│ ├── migrations/
│ └── seeders/
├── routes/ # ticketRoutes.js
├── services/ # ticketService.js
└── index.js

docker-compose.yml
Dockerfile
.env
knexfile.js

yaml
Copy
Edit

---

## 📦 Environment Setup

Create a `.env` file in the project root:

```env
# .env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=railway_db
DB_HOST=postgres
DB_PORT=5432
DB_NAME=railway_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3000
```

## 🚀 Run Locally with Docker
Make sure you have Docker and Docker Compose installed.

1. Build and start the service
```
docker-compose up --build
```
2. Run migrations
```
docker compose exec api npx knex migrate:latest --knexfile knexfile.js
```
3. Seed data (berths and sample passengers)
```
docker compose exec api node src/db/seeders/seedBerths.js
docker compose exec api node src/db/seeders/seedPassengers.js
```

### 📮 API Usage (Sample Requests)
Book a Ticket

```
curl --location 'http://localhost:3000/api/v1/book' \
--header 'Content-Type: application/json' \
--data '{
  "passengers": [
    { "name": "Mark", "age": 24, "gender": "male" }
  ]
}'
```

Sample Response

```
{
  "message": "Ticket Booked (waiting)",
  "ticket_id": "5d7c230c-...",
  "passengers": [
    {
      "name": "Mark",
      "age": 24,
      "gender": "male",
      "is_child": false,
      "status": "waiting",
      "berth": "W10"
    }
  ]
}
```

Cancel a Ticket

```
curl --location --request POST 'http://localhost:3000/api/v1/cancel/<ticket_id>'
Sample Response

```
{
  "message": "Ticket cancelled and promotions (if any) completed.",
  "promoted": {
    "racToConfirmed": ["ef05..."],
    "waitingToRac": ["6358..."]
  }
}
```

Get All Booked Tickets

curl --location 'http://localhost:3000/api/v1/booked'
Sample Response

```
{
  "total": 1,
  "tickets": [
    {
      "ticket_id": "5506...",
      "status": "confirmed",
      "passengers": [
        {
          "id": "de37...",
          "name": "Alex",
          "age": 24,
          "gender": "male",
          "is_child": false,
          "berth_number": "C7",
          "berth_type": "upper"
        }
      ]
    }
  ]
}
```

Get Current Availability
```
curl --location 'http://localhost:3000/api/v1/available'
Sample Response
```
{
  "confirmed_left": 0,
  "rac_left": 0,
  "waiting_left": 1
}
```
### 🎥 Demo Video
👉 Click here to watch the demo

(Replace with actual link, or upload video to YouTube, Loom, or Google Drive and paste it above.)

### 📌 Notes
Passengers under 5 are not allocated a berth.

Cancellations automatically trigger berth promotions in this order:

RAC → Confirmed

Waiting → RAC

Designed to handle concurrency with database transactions.

🧑‍💻 Author
Rishabh Nagar
Feel free to reach out for any queries or suggestions.

