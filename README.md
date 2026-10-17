# Fitness

İstifadəçilərin idman zalında etdikləri məşqlərin nəticələrini izləməsi üçün tətbiq.

| Servis          | Texnologiya                         | Port  |
|-----------------|-------------------------------------|-------|
| `fitness-web`   | Vite + React + MUI + Zustand (nginx) | 8080  |
| `fitness-api`   | NestJS + TypeORM, JWT auth          | 3000  |
| `db`            | PostgreSQL 16                       | 5432  |

## İşə salmaq

```bash
cp .env.example .env   # istəyə bağlı
docker compose up -d --build
```

- Web: http://localhost:8080
- API: http://localhost:3000/api (web tətbiqi `/api`-ni nginx vasitəsilə API-yə ötürür)

## İmkanlar

- **Əsas səhifə** — həftəlik/aylıq məşq sayı, həcm (kg), ardıcıl həftə seriyası, çəki, aktiv proqramın icrası və bu günün planı, 12 həftəlik həcm qrafiki, əzələ qrupları üzrə paylanma, şəxsi rekordlar (təxmini 1RM).
- **Məşqlər** — hərəkət / set / təkrar / çəki ilə məşq jurnalı, aylar üzrə baxış.
- **Proqramlar** — həftəlik (7 gün) və aylıq (4 həftə) planlar. Hər gün üçün hərəkətlər, set×təkrar və hədəf çəki. Təqvim görünüşündə hər gün *Tamamlandı / Buraxıldı / Bu gün / Gələcək* statusu; "Qeyd et" planı məşq formasına doldurur və nəticə proqram gününə bağlanır.
- **Hərəkətlər** — hazır kataloq + öz hərəkətləriniz, hər hərəkət üzrə irəliləyiş qrafiki.
- **Bədən ölçüləri** — çəki, yağ faizi, BMI, hədəf çəki.
- Glass dizayn, işıqlı / qaranlıq tema.

## API

Bütün endpoint-lər (`/auth/*` və `/health` xaric) `Authorization: Bearer <token>` tələb edir.

```
POST   /api/auth/register         { name, email, password }
POST   /api/auth/login            { email, password }
GET    /api/users/me     PATCH /api/users/me
GET    /api/stats/dashboard
GET    /api/stats/exercises/:id
GET    /api/exercises    POST /api/exercises    DELETE /api/exercises/:id
GET    /api/workouts?from=&to=    POST /api/workouts    GET|PUT|DELETE /api/workouts/:id
GET    /api/programs     POST /api/programs     GET|PUT|DELETE /api/programs/:id
POST   /api/programs/:id/activate
GET    /api/metrics      POST /api/metrics      DELETE /api/metrics/:id
```

## Lokal inkişaf

```bash
docker compose up -d db
cd fitness-api && npm install && npm run start:dev
cd fitness-web && npm install && npm run dev   # http://localhost:5173, /api -> :3000
```

## Qeydlər

- Cədvəllər TypeORM `synchronize` ilə avtomatik yaradılır (`DB_SYNC=true`). Production üçün migrasiyalara keçib `DB_SYNC=false` edin.
- `JWT_SECRET`-i production-da mütləq dəyişin.
- "Bu gün" və "bu həftə" API konteynerinin `TZ` dəyərinə görə hesablanır (default `Asia/Baku`).
