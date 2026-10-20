# Fitness

İstifadəçilərin idman zalında etdikləri məşqlərin nəticələrini izləməsi üçün tətbiq.

| Servis          | Texnologiya                         | Port  |
|-----------------|-------------------------------------|-------|
| `fitness-web`   | Vite + React + MUI + Zustand (nginx) | 8080  |
| `fitness-api`   | NestJS + TypeORM, JWT auth          | 3000  |
| `db`            | PostgreSQL 16                       | 5432  |
| `fitness-mobile`| React Native + Expo (Android)       | —     |

Android tətbiqi docker-ə daxil deyil — işə salmaq və APK yığmaq üçün [fitness-mobile/README.md](fitness-mobile/README.md).

## İşə salmaq

```bash
cp .env.example .env   # istəyə bağlı
docker compose up -d --build
```

- Web: http://localhost:8080
- Admin panel: http://admin.localhost:8080 — ilk giriş: `admin@fitness.local` / `admin12345`
- API: http://localhost:3000/api (web tətbiqi `/api`-ni nginx vasitəsilə API-yə ötürür)

## İmkanlar

- **Əzələ xəritəsi** (əsas səhifə) — real anatomik 3D kişi modeli (BodyParts3D, CC BY 4.0), istənilən bucağa fırlanır; 16 əzələ 6 qrupa bölünüb. Hover qrupu vurğulayır, klik `/exercises?muscle=<qrup>&focus=<əzələ>` açır (mobil: 1-ci toxunuş seçir). WebGL olmayanda 2D vektor xəritə (`components/bodymap/BodyMap.tsx`) göstərilir. Modelin yenidən qurulması: `tools/bodymap/README.md`.
- **Əsas səhifə** — həftəlik/aylıq məşq sayı, həcm (kg), ardıcıl həftə seriyası, çəki, aktiv proqramın icrası və bu günün planı, 12 həftəlik həcm qrafiki, əzələ qrupları üzrə paylanma, şəxsi rekordlar (təxmini 1RM).
- **Məşqlər** — hərəkət / set / təkrar / çəki ilə məşq jurnalı, aylar üzrə baxış.
- **Proqramlar** — həftəlik (7 gün) və aylıq (4 həftə) planlar. Hər gün üçün hərəkətlər, set×təkrar və hədəf çəki. Təqvim görünüşündə hər gün *Tamamlandı / Buraxıldı / Bu gün / Gələcək* statusu; "Qeyd et" planı məşq formasına doldurur və nəticə proqram gününə bağlanır.
- **Hərəkətlər** — hazır kataloq + öz hərəkətləriniz, hər hərəkət üzrə irəliləyiş qrafiki.
- **Bədən ölçüləri** — çəki, yağ faizi, BMI, hədəf çəki.
- Glass dizayn, işıqlı / qaranlıq tema.

## Admin panel (`admin.` subdomeni)

Eyni `fitness-web` build-i host adına baxır: `admin.*` ilə açılanda admin paneli yüklənir (nginx həmin host üçün `X-Robots-Tag: noindex` qaytarır).

- **İcmal** — istifadəçi sayları, həftəlik qeydiyyat qrafiki, rollar üzrə paylanma.
- **İstifadəçilər** — axtarış, rol/status filtri, yaratmaq, redaktə, rol təyini, bloklamaq, şifrə sıfırlamaq, silmək (bütün məlumatları ilə).
- **Rollar** — `admin` və `user` sistem rolları + istənilən sayda öz rolunuz (ilk açılışda nümunə `moderator` yaradılır).
- **Səlahiyyətlər** — rol × səlahiyyət matrisi, checkbox ilə dəyişmək.

| Səlahiyyət         | Nə verir |
|--------------------|----------|
| `admin.access`     | Admin panelə giriş, icmal |
| `users.read`       | İstifadəçi siyahısı |
| `users.write`      | Yaratmaq, redaktə, rol təyini, bloklamaq, şifrə sıfırlamaq |
| `users.delete`     | İstifadəçini silmək |
| `roles.read` / `roles.write` | Rollara baxmaq / idarə etmək |
| `permissions.read` | Səlahiyyətlər matrisi |

Qoruma qaydaları:
- Səlahiyyətlər hər sorğuda DB-dən oxunur — bloklanmış istifadəçinin tokeni dərhal etibarsız olur.
- Özünüzdə olmayan səlahiyyəti nə rola verə, nə də belə səlahiyyəti olan rolu başqasına təyin edə bilərsiniz (yalnız tam administrator `admin` rolunu təyin edir).
- Öz hesabınızı bloklamaq/silmək, öz `admin` rolunuzu götürmək və sonuncu aktiv administratoru itirmək mümkün deyil.
- `admin` rolu həmişə bütün səlahiyyətlərə malikdir; sistem rolları silinmir.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` yalnız sistemdə aktiv administrator olmayanda tətbiq olunur (həm ilk quraşdırma, həm bərpa üçün).

**Production:** `admin.example.com` DNS qeydini eyni serverə yönləndirin. Lokal olaraq `admin.localhost` brauzerlərdə avtomatik `127.0.0.1`-ə gedir.

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

# admin (admin.access + göstərilən səlahiyyət)
GET    /api/admin/overview
GET    /api/admin/users?search=&roleId=&status=&page=&pageSize=   (users.read)
POST   /api/admin/users   PATCH /api/admin/users/:id   PUT /api/admin/users/:id/password   (users.write)
DELETE /api/admin/users/:id                                        (users.delete)
GET    /api/admin/roles   (roles.read)    POST|PATCH|DELETE /api/admin/roles[/:id]   (roles.write)
GET    /api/admin/permissions                                      (permissions.read)
```

## Lokal inkişaf

```bash
docker compose up -d db
cd fitness-api && npm install && npm run start:dev
cd fitness-web && npm install && npm run dev   # http://localhost:5173, admin: http://admin.localhost:5173
```

## Qeydlər

- Cədvəllər TypeORM `synchronize` ilə avtomatik yaradılır (`DB_SYNC=true`). Production üçün migrasiyalara keçib `DB_SYNC=false` edin.
- `JWT_SECRET` və `ADMIN_PASSWORD`-u production-da mütləq dəyişin.
- "Bu gün" və "bu həftə" API konteynerinin `TZ` dəyərinə görə hesablanır (default `Asia/Baku`).
