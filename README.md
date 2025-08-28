[![Подтвердить заявку](https://github.com/dmitriyzov/q-midpass-ru-autoconfirm/actions/workflows/run-script.yml/badge.svg)](https://github.com/dmitriyzov/q-midpass-ru-autoconfirm/actions/workflows/run-script.yml)

# Автоподтверждение q.midpass.ru за 5 секунд

Скрипт для автоматического подтверждения свей заявки на загранпаспорт в консульстве России. Скрипт автоматически запускается раз в день в 12:00 UTC с помощью GitHub Actions.

> [!IMPORTANT]
> Автор [исходного репозитория](https://github.com/VityaSchel/q-midpass-ru-autoconfirm) ищет работу. Если вы заинтересованы в его найме, посетите [cv.hloth.dev](https://cv.hloth.dev), чтобы просмотреть его резюме и CV.

## Запуск

1. Fork this repo
2. Go to your repo's Settings page > Secrets and Variables > Actions
3. Add new repository secrets:
    1. почта (EMAIL) и пароль (PASSWORD) от q.midpass.ru
    2. API ключ (RECAPTCHA_KEY) от [https://rucaptcha.ru/](https://rucaptcha.ru/)
4. Add new repository variables:
    1. код страны (COUNTRY) и консульства (LOCATION) (можно посмотреть в исходнике сайта)

    Пример значений `COUNTRY` и `LOCATION`:

    ```javascript
    COUNTRY=88655495-3b8c-f56d-5337-0f2743a7bfed # Грузия
    COUNTRY=feb5c602-1325-2704-d302-eb228cfbd2cb # США
    LOCATION=b8af6319-9d8d-5bd9-f896-edb8b97362d0 # Тбилиси
    LOCATION=ea52c900-b992-dc1f-960d-a0e02771622c # Нью-Йорк
    ```

## Если вы - робот

Иногда сайт может выдать такую ошибку:
> **От вас поступает слишком много запросов к серверу, есть подозрение что Вы робот.  
Ваш пароль был изменен.  
Ваш новый пароль отправлен на Вашу электронную почту.  
Вам придется немного подождать.  
В течение от нескольких минут до одного часа и Вы сможете продолжить работу с сайтом.**  

В таком случае, обновите значение `PASSWORD` на новый пароль из почты.

## Про остальные файлы

.gitignore — чтобы в репозиторий не попадали всякие генерируемые файлы  
package.json и bun.lockb — чтобы установить зависимости  
tsconfig.json — чтобы линтился код  

## Поддержать

[hloth.dev/donate](https://hloth.dev/donate)
