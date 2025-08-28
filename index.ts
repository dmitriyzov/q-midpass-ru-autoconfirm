import fs from 'fs'
import puppeteer from 'puppeteer-extra'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

const email = process.env.EMAIL || (() => { throw new Error('Вставьте EMAIL в config.conf') })()
const password = process.env.PASSWORD || (() => { throw new Error('Вставьте PASSWORD в config.conf') })()
const rucaptchaKey = process.env.RUCAPTCHA_KEY || (() => { throw new Error('Вставьте RUCAPTCHA_KEY в config.conf') })()
const country = process.env.COUNTRY || (() => { throw new Error('Вставьте код страны (COUNTRY) в config.conf') })()
const location = process.env.LOCATION || (() => { throw new Error('Вставьте код учреждения (LOCATION) в config.conf') })()

puppeteer.use(StealthPlugin())
puppeteer.use(RecaptchaPlugin({ provider: { id: '2captcha', token: rucaptchaKey }, visualFeedback: true }))

async function rucaptchaRequest<T>(endpoint: string, body: Record<string, any>): Promise<T> {
  return await fetch('https://api.rucaptcha.com/' + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: rucaptchaKey,
      ...body
    }),
  }).then(res => res.json() as Promise<T>)
}

async function solveCaptcha(base64: string): Promise<{ taskId: number, solution: string } | null> {
  var { errorId, taskId } = await rucaptchaRequest<{ errorId: number, taskId: number }>('createTask', {
    task: { type: 'ImageToTextTask', body: base64, case: true, minLength: 6, maxLength: 6, numeric: 4 }
  })

  if (errorId !== 0) throw new Error(`Ошибка при создании задачи на решение капчи: ${errorId}`)
  
  await new Promise(resolve => setTimeout(resolve, 10000))

  var solution: { text: string } | undefined
  
  do {
    var { solution, errorId } = await rucaptchaRequest<{ solution?: { text: string }, errorId: number }>('getTaskResult', { taskId })
    if (errorId !== 0) {
      if (errorId === 12) {
        return null
      } else {
        throw new Error(`Ошибка при получении решения капчи: ${errorId}`)
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 2500))
    }
  } while (solution === undefined)
    
  return { solution: solution.text, taskId }
}

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
})
const page = await browser.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
await page.setViewport({ width: 941, height: 704 })

let authorized = false
for(let attempts = 0; attempts < 3; attempts++) {
  console.log("Заходим на главную страницу...")
  await page.goto('https://q.midpass.ru/')

  await (await page.waitForSelector('div.register_form:has(input#CountryId) > select'))?.select(country)
  await (await page.waitForSelector('div.register_form:has(input#ServiceProviderId) > select'))?.select(location)
  await page.$eval('input#Email', (el: HTMLInputElement, email) => el.value = email, email)
  await page.$eval('input#Password', (el: HTMLInputElement, password) => el.value = password, password)

  await new Promise(resolve => setTimeout(resolve, 500))

  const captchaBase64 = await page.$eval('img#imgCaptcha', (el: HTMLImageElement) => {
    const canvas = document.createElement('canvas')
    canvas.getContext('2d')!.drawImage(el, 0, 0)
    return canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, '')
  })

  console.log(`Разгадываем капчу авторизации, попытка № ${attempts + 1}...`);
  if (process.env.LOG_CAPTCHA_BASE64 === "true") {
    console.log(captchaBase64.slice(-50))
  }
  const authCaptcha = await solveCaptcha(captchaBase64)

  if (authCaptcha === null) {
    console.error(`Не смогли разгадать капчу авторизации с ${attempts+1}й попытки.`)
    continue
  }

  console.log('Разгадали капчу авторизации:', authCaptcha.solution);

  // DEBUG
  // fs.writeFileSync(`captchas/rucaptcha/${authCaptcha.solution}.png`, captchaBase64, 'base64')
  // await page.close()
  // process.exit(0)

  await page.$eval('input#Captcha', (el: HTMLInputElement, solution: string) => el.value = solution, authCaptcha.solution)
  
  await new Promise(resolve => setTimeout(resolve, 100))
  
  console.log("Кликаем 'Войти'...")
  await (await page.waitForSelector('button[onclick="javascript:LogOn();"]'))?.click()
  await page.waitForNavigation()
  
  const isCaptchaError = await page.evaluate(() => {
    const captchaErrorElement = document.querySelector('#captchaError')
    return captchaErrorElement && captchaErrorElement.textContent !== null && captchaErrorElement.textContent.trim().length > 0
  })

  if (isCaptchaError) {
    console.error(`Неверно введена капча авторизации с ${attempts + 1}й попытки`)
    await rucaptchaRequest('reportIncorrect', { taskId: authCaptcha.taskId })
  } else {
    await rucaptchaRequest('reportCorrect', { taskId: authCaptcha.taskId })
    authorized = true
    break
  }
}

if (!authorized) throw new Error('Не удалось авторизоваться')

const isBanPage = await page.evaluate(() => window.location.pathname.endsWith('Account/BanPage'))

if (isBanPage) {
  await browser.close()
  throw new Error('Аккаунт заблокировали, обновите PASSWORD на новый пароль из почты.')
}

console.log('Авторизировались!')

// DEBUG
// await page.close()
// process.exit(0)

console.log("Переходим на страницу Листа ожидания...")
await page.goto('https://q.midpass.ru/ru/Appointments/WaitingList')
const checkbox = await page.waitForSelector('.datagrid-body input[type=checkbox]') as import('puppeteer').ElementHandle<HTMLInputElement>
await new Promise(resolve => setTimeout(resolve, 100))
checkbox.click()
await new Promise(resolve => setTimeout(resolve, 100))
const confirm = await page.waitForSelector('a#confirmAppointments') as import('puppeteer').ElementHandle<HTMLAnchorElement>
await new Promise(resolve => setTimeout(resolve, 100))

let confirmed

for(let attempts = 0; attempts < 3; attempts++) {
  console.log("Кликаем 'Подтвердить'...")
  confirm.click()
  await new Promise(resolve => setTimeout(resolve, 1000))

  const confirmCaptchaBase64 = await page.evaluate(() => {
    const captcha = document.querySelector('img#imgCaptcha') as HTMLImageElement
    if (captcha && captcha.src) {
      const canvas = document.createElement('canvas')
      canvas.getContext('2d')!.drawImage(captcha, 0, 0)
      return canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, '')
    }
  })
  
  if (confirmCaptchaBase64) {
    console.log(`Разгадываем капчу подтверждения, попытка № ${attempts + 1}...`);
    
    if (process.env.LOG_CAPTCHA_BASE64 === "true") {
      console.log(confirmCaptchaBase64.slice(-50))
    }
    
    const confirmCaptcha = await solveCaptcha(confirmCaptchaBase64)
    
    if (confirmCaptcha === null) {
      console.error('Не смогли разгадать капчу подтверждения')
      await page.$eval('a[href="javascript:RefreshCaptcha();"', (el: HTMLAnchorElement) => el.click())
      await new Promise(resolve => setTimeout(resolve, 2000))
      continue
    }

    console.log('Разгадали капчу подтверждения:', confirmCaptcha.solution)

    // DEBUG
    // fs.writeFileSync(`captchas/rucaptcha/2-confirm/${confirmCaptcha.solution}.png`, confirmCaptchaBase64, 'base64')
    // await page.close()
    // process.exit(0)

    console.log('Вводим капчу подтверждения...')

    await page.$eval('input#captchaValue', (el: HTMLInputElement, solution: string) => el.value = solution, confirmCaptcha.solution)
    await new Promise(resolve => setTimeout(resolve, 100))
    await page.$eval('.dialog-button a', (el: HTMLAnchorElement) => el.click())

    await new Promise(resolve => setTimeout(resolve, 2000))

    const isCaptchaError = await new Promise(resolve => {
      const interval = setInterval(async () => {
        const text = await page.evaluate(() => {
          const responseElement = document.querySelector('.messager-window > div > div')
          if (!responseElement || !responseElement.textContent || !responseElement.textContent.trim()) return null
          return responseElement.textContent.trim()
        })

        if(text === null) return
        clearInterval(interval)

        if (text === 'Не заполнено "Символы с картинки"') {
          resolve(true)
        } else if (text === 'Заявка подтверждена.') {
          resolve(false)
        } else {
          throw new Error('Неизвестный текст в ответе: ' + text)
        }
      }, 300)
    })

    if (isCaptchaError) {
      await page.$eval('.messager-window a', (el: HTMLAnchorElement) => el.click())
      console.error(`Неверно введена капча подтверждения с ${attempts + 1}й попытки`)
      await rucaptchaRequest('reportIncorrect', { taskId: confirmCaptcha.taskId })
    } else {
      await rucaptchaRequest('reportCorrect', { taskId: confirmCaptcha.taskId })
      confirmed = true
      await page.waitForSelector('.datagrid-body [field=PlaceInQueueString]')
      console.log(await page.$eval('.datagrid-body td[field=PlaceInQueueString]', (el: HTMLTableCellElement) => el.textContent))
      console.log('Заявка подтверждена!')
      break
    }
  }
}

if (!confirmed) throw new Error('Не удалось подтвердить заявку.')

await page.close()
process.exit(0)