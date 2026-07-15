# STORE HUB Firebase Data Structure

This document maps the current STORE HUB prototype to a production Firebase
shape. The UI currently uses local demo state so it can run without Firebase
credentials.

## Collections

### stores

Each document represents one store in the hierarchy:

- `brand`: `GENTLE MONSTER` | `TAMBURINS` | `ATiiSSU`
- `country`: country display name
- `city`: city display name
- `name`: store name
- `status`: `Active` | `Inactive`
- `createdAt`: server timestamp
- `updatedAt`: server timestamp

Only stores with `status = Active` should be exposed to the staff QR flow.

### reports

Each document stores a submitted VOC or safety report:

- `storeId`: reference or id from `stores`
- `brand`: denormalized brand for fast HQ filtering
- `country`: denormalized country
- `city`: denormalized city
- `storeName`: denormalized store name
- `type`: `Safety` (신규 제보는 Safety만 허용; 과거 데이터에 `General`이 있을 수 있음)
- `urgency`: `Critical` | `High` | `Normal` | `Low`
- `status`: `New` | `In Review` | `Resolved`
- `content`: report text
- `photoUrls`: array of Firebase Storage URLs
- `createdAt`: server timestamp
- `updatedAt`: server timestamp

Store hierarchy fields are denormalized on reports because Reports filtering is
the central HQ workflow.

### notices

Each document stores one HQ notice:

- `title`: notice title
- `body`: notice body
- `target`: `Global`, brand, country, or city
- `status`: `Draft` | `Published`
- `createdAt`: server timestamp
- `publishedAt`: server timestamp or null

The staff QR flow should show only `Published` notices matching `Global`, the
selected store brand, country, or city.

### settings

Use one document, for example `settings/system`:

- `recentStoreEnabled`: boolean
- `photoOptional`: boolean
- `safetyEscalationEnabled`: boolean
- `supportedLanguages`: array of language codes

Recent store memory remains browser-local because it is a device preference, not
authoritative product data.

## Recommended Indexes

- `stores`: `brand`, `country`, `city`, `status`
- `reports`: `brand`, `country`, `city`, `storeId`, `type`, `urgency`, `status`, `createdAt`
- `notices`: `status`, `target`, `publishedAt`

## Storage

Report photos should be uploaded to Firebase Storage under:

```text
reports/{reportId}/{fileName}
```

The `reports.photoUrls` field should store the resulting download URLs or
secured storage paths, depending on the chosen access model.
