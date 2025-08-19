# Автоподтверждение q.midpass.ru за 5 секунд

Скрипт для автоматического подтверждения свей заявки на загранпаспорт в консульстве России.

Мой скрипт написан на JS и puppeteer и хорош тем, что вам нужно посмотреть всего один файл, чтобы удостовериться, что он не наносит никакого вреда. Вообще весь код в одном маленьком файле.

> [!IMPORTANT]
> Я ищу работу! Если вы заинтересованы в моем найме, посетите [cv.hloth.dev](https://cv.hloth.dev), чтобы просмотреть мои резюме и CV.

## Запуск

1. Fork this repo
2. Go to your repo's Settings page > Secrets and Variables > Actions
3. Add new repository secrets:
    3.1. почта (EMAIL) и пароль (PASSWORD) от q.midpass.ru
    3.2. API ключ (RECAPTCHA_KEY) от [https://rucaptcha.ru/](https://rucaptcha.ru/)
4. Add new repository variables:
    4.1. код страны (COUNTRY) и консульства (LOCATION) (можно посмотреть в исходнике сайта)

Скрипт будет автоматически запускаться раз в день в 12 UTC.

    Пример значений `COUNTRY` и `LOCATION`:

    ```javascript
    COUNTRY=88655495-3b8c-f56d-5337-0f2743a7bfed # Грузия
    COUNTRY=feb5c602-1325-2704-d302-eb228cfbd2cb # США
    LOCATION=b8af6319-9d8d-5bd9-f896-edb8b97362d0 # Тбилиси
    LOCATION=ea52c900-b992-dc1f-960d-a0e02771622c # Нью-Йорк
    ```

Иногда сайт может начать говниться и выкинуть такую ошибку:
![qmidpass ошибка бот](https://i.imgur.com/SyqEDe1.png)
Тогда скрипт это поймет и предупредит в консоли

## Про остальные файлы

.gitignore — чтобы в репозиторий не попадали всякие генерируемые файлы
package.json и bun.lockb — чтобы установить зависимости
tsconfig.json — чтобы линтился код

## Поддержать

[hloth.dev/donate](https://hloth.dev/donate)
