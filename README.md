# Счастливый час

Веб-планировщик встреч для команды. Участники отмечают свободные интервалы, приложение показывает общие пересечения и позволяет выбрать финальный слот.

## Запуск

```bash
npm install
npm run dev
```

Открой `http://localhost:3000`.

## Google Sheets

Без переменных окружения приложение использует локальный файл `.data/happy-hour.json`.

Для Google Sheets:

1. Создай Google Sheet.
2. В таблице создай два листа:

- `meetings`
- `availability`

3. Создай service account в Google Cloud и включи Google Sheets API.
4. Поделись таблицей с email service account с правом `Editor`.
5. Создай `.env.local` по примеру `.env.example`:

```bash
GOOGLE_SHEETS_ID=spreadsheet_id_from_url
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

6. Проверь доступ и создай заголовки:

```bash
npm run setup:sheets
```

Для Vercel добавь эти же переменные в Project Settings → Environment Variables.
