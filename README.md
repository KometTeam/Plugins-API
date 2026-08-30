# Komet Plugin API

Полная спецификация формата `.kinet` и Plugin API v1.

## Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Формат пакета](#формат-пакета)
3. [Manifest](#manifest)
4. [Команды и аргументы](#команды-и-аргументы)
5. [Модули JavaScript](#модули-javascript)
6. [Контекст команды](#контекст-команды)
7. [Разрешения](#разрешения)
8. [API reference](#api-reference)
9. [Ошибки](#ошибки)
10. [Lifecycle и лимиты](#lifecycle-и-лимиты)
11. [Обновления](#обновления)
12. [Безопасность](#безопасность)
13. [Полные примеры](#полные-примеры)

По любым ошибкам пишите в [лс канала](https://t.me/TeamKomet?direct)

## Быстрый старт

Минимальный плагин состоит из двух файлов:

```text
hello.kinet
├── manifest.json
└── main.js
```

`manifest.json`:

```json
{
  "schemaVersion": 1,
  "id": "dev.example.hello",
  "name": "Hello",
  "version": "1.0.0",
  "apiVersion": 1,
  "description": "Пример плагина",
  "author": "Example Author",
  "main": "main.js",
  "permissions": ["chat.write"],
  "commands": [
    {
      "name": "/hello",
      "description": "Отправить приветствие",
      "handler": "hello",
      "arguments": [
        {
          "name": "name",
          "description": "Имя пользователя"
        }
      ]
    }
  ]
}
```

`main.js`:

```js
import { chat } from 'komet:api';

export async function hello(context) {
  await chat.sendText(`Привет, ${context.arguments.name}!`);
}
```

Содержимое нужно упаковать в ZIP и изменить расширение архива на `.kinet`.

## Формат пакета

`.kinet` является ZIP-контейнером. Komet определяет формат по содержимому, но при установке из файл пикера требует расширение `.kinet`.

### Разрешённая структура

```text
plugin.kinet
├── manifest.json
├── main.js
└── lib
    ├── format.js
    └── api.js
```

В пакете разрешены:

- один `manifest.json` в корне;
- JavaScript-файлы с расширением `.js`;
- директории для организации JavaScript-модулей.

Другие типы файлов не поддерживаются. Изображения, бинарные данные и конфигурацию следует получать через API или хранить в JavaScript-совместимом виде.

### Ограничения пакета

| Ограничение | Значение |
|---|---:|
| Размер `.kinet` | 5 МБ |
| Суммарный распакованный размер | 10 МБ |
| Количество записей архива | 128 |
| Размер одного файла | 2 МБ |

Пакет отклоняется, если содержит:

- абсолютный путь;
- пустой сегмент пути;
- сегмент `..`;
- обратный выход из директории архива;
- symbolic link;
- два файла с одинаковым путём;
- файл, отличный от `manifest.json` или `.js`;
- отсутствующий `manifest.json`;
- отсутствующий entry-модуль из поля `main`.

## Manifest

Manifest всегда располагается по пути `manifest.json` и кодируется в UTF-8.

### Полный пример

```json
{
  "schemaVersion": 1,
  "id": "dev.example.plugin",
  "name": "Example Plugin",
  "version": "1.2.0",
  "apiVersion": 1,
  "description": "Описание плагина",
  "author": "Example Author",
  "main": "main.js",
  "permissions": [
    "chat.write",
    "ui.notify",
    "storage"
  ],
  "commands": [
    {
      "name": "/example",
      "description": "Пример команды",
      "handler": "example",
      "hidden": false,
      "arguments": [
        {
          "name": "mode",
          "description": "Режим работы",
          "required": false
        },
        {
          "name": "text",
          "description": "Произвольный текст",
          "required": true,
          "rest": true
        }
      ]
    }
  ],
  "updateUrl": "https://example.org/plugin/update.json"
}
```

### Поля верхнего уровня

| Поле | Тип | Обязательно | Описание |
|---|---|---:|---|
| `schemaVersion` | integer | Да | Версия формата manifest. Для текущей спецификации только `1`. |
| `id` | string | Да | Глобальный reverse-domain идентификатор плагина. |
| `name` | string | Да | Отображаемое имя плагина. |
| `version` | string | Да | Версия плагина в формате SemVer. |
| `apiVersion` | integer | Да | Требуемая версия Plugin API. Текущее значение `1`. |
| `description` | string | Нет | Описание плагина. По умолчанию пустая строка. |
| `author` | string | Нет | Имя автора или команды. По умолчанию пустая строка. |
| `main` | string | Да | Путь к главному `.js` ES-модулю. |
| `permissions` | string[] | Да | Запрашиваемые capabilities. Может быть пустым массивом. |
| `commands` | object[] | Да | Список команд. Должен содержать минимум одну команду. |
| `updateUrl` | string | Нет | HTTPS URL manifest обновления. |
| `signature` | object | Нет | Ed25519 подпись manifest и JavaScript-модулей. |

Неизвестные поля сейчас игнорируются, но авторам не следует полагаться на это поведение.

### `id`

Допустимый шаблон:

```regex
^[a-z][a-z0-9]*(\.[a-z0-9]+)+$
```

Примеры:

```text
dev.example.weather
org.sample.tools
com.company.product
```

Недопустимые значения:

```text
weather
Example.Plugin
dev.example.my-plugin
```

Пространство `pw.komet.*` зарезервировано для встроенных плагинов Komet. Пользовательский `.kinet` с таким ID не устанавливается.

### `version`

Версия должна соответствовать форме:

```text
MAJOR.MINOR.PATCH
MAJOR.MINOR.PATCH-prerelease
MAJOR.MINOR.PATCH+build
```

Примеры:

```text
1.0.0
1.2.3-beta.1
2.0.0+20260829
```

### `apiVersion`

Плагин не устанавливается, если запрашивает API новее поддерживаемого приложением.

```json
"apiVersion": 1
```

### `main`

`main` является относительным путём внутри `.kinet` и должен заканчиваться на `.js`.

```json
"main": "main.js"
```

или:

```json
"main": "src/index.js"
```

## Команды и аргументы

### Command object

| Поле | Тип | Обязательно | По умолчанию | Описание |
|---|---|---:|---|---|
| `name` | string | Да | — | Имя slash-команды. Начальный `/` можно опустить. |
| `description` | string | Да | — | Описание в панели подсказок. |
| `handler` | string | Да | — | Имя экспортируемой функции entry-модуля. |
| `arguments` | object[] | Нет | `[]` | Описание полей интерфейса команды. |
| `hidden` | boolean | Нет | `false` | Скрыть команду из подсказок. Ручной запуск остаётся возможным. |

Имя команды после нормализации должно соответствовать:

```regex
^/[A-Za-z][A-Za-z0-9_-]{0,31}$
```

Имена команд сравниваются без учёта регистра. Дубликаты внутри одного manifest запрещены. Если имя уже занято встроенной или ранее зарегистрированной командой, следующая команда с таким именем не добавляется в registry.

### Handler

Handler должен быть именованным export главного модуля.

```js
export async function weather(context) {
}
```

Допустимый шаблон имени handler:

```regex
^[A-Za-z_$][A-Za-z0-9_$]*$
```

### Argument object

| Поле | Тип | Обязательно | По умолчанию | Описание |
|---|---|---:|---|---|
| `name` | string | Да | — | Ключ в `context.arguments`. |
| `description` | string | Нет | `""` | Hint для поля ввода. |
| `required` | boolean | Нет | `true` | Требовать непустое значение перед запуском. |
| `rest` | boolean | Нет | `false` | При ручном запуске получить весь оставшийся текст. |

Имя аргумента должно соответствовать:

```regex
^[A-Za-z][A-Za-z0-9_-]{0,31}$
```

Имена аргументов одной команды должны быть уникальными. Аргумент с `rest: true` может быть только последним.

### Интерфейс аргументов

После выбора команды Komet показывает отдельное поле для каждого аргумента над строкой ввода текста. Обязательные поля проверяются перед запуском. Необязательные поля помечаются в интерфейсе.

Все значения передаются плагину как строки:

```js
context.arguments.city
context.arguments.text
```

### Ручной запуск

Ручной ввод сохраняется для совместимости:

```text
/command first "second value" remaining text
```

Позиционные аргументы разбираются слева направо. Поддерживаются одинарные и двойные кавычки, а также escaping через `\` внутри кавычек.

Для команды:

```json
"arguments": [
  { "name": "format", "required": false },
  { "name": "text", "rest": true }
]
```

вызов:

```text
/render compact hello world
```

даёт:

```js
context.arguments.format === 'compact'
context.arguments.text === 'hello world'
```

Если необязательный позиционный аргумент расположен перед обязательным, при ручном запуске его нельзя пропустить без значения. В UI каждое поле независимо, поэтому это ограничение относится только к ручному синтаксису.

## Модули JavaScript

Плагины используют ES-модули.

```js
import { chat } from 'komet:api';
import { formatMessage } from './lib/format.js';
```

Поддерживаются относительные импорты между `.js` файлами пакета:

```js
import './setup.js';
import value from './value.js';
import { helper } from '../shared/helper.js';
```

Импорт, который после нормализации выходит выше корня плагина, запрещён. Для замены модулей после обновления создаётся новый runtime при следующем запуске команды.

Не следует использовать:

- Node.js built-in modules;
- `fs`, `process`, `child_process`;
- bare imports сторонних npm-пакетов;
- доступ к локальным файлам;
- встроенный `fetch`.

Вместо встроенного `fetch` используется `network.fetch` из `komet:api`.

## Контекст команды

Каждый handler получает один объект `context`.

```ts
interface CommandContext {
  args: string;
  arguments: Record<string, string>;
  reply: ReplyMessage | null;
  apiVersion: number;
}
```

### `context.args`

Исходная строка после имени команды. Для запуска через UI она формируется из заполненных полей.

```js
context.args
```

Это поле предназначено в основном для обратной совместимости. Новым плагинам следует использовать `context.arguments`.

### `context.arguments`

Объект значений, ключи которого соответствуют `commands[].arguments[].name`.

```js
const city = context.arguments.city;
```

Все объявленные аргументы присутствуют в объекте. Незаполненный необязательный аргумент имеет значение пустой строки.

### `context.reply`

Доступен только при разрешении `message.readReply`. В остальных случаях всегда `null`.

```ts
interface ReplyMessage {
  id: string;
  senderId: number;
  text: string | null;
  time: number;
  attachments: Array<{ type: string }>;
}
```

Пример:

```js
if (context.reply) {
  await chat.sendText(`Ответ на: ${context.reply.text || 'вложение'}`);
}
```

`attachments[].type` использует строковые значения Komet, например `photo`, `video`, `audio`, `file`, `contact`, `location`, `sticker`, `poll`, `forward` или `unknown`.

Reply является снимком состояния на момент запуска команды. После успешного выполнения команды выбранный reply очищается.

### `context.apiVersion`

Версия API, предоставленная текущим приложением.

```js
if (context.apiVersion < 1) {
  throw new Error('Unsupported Komet API');
}
```

## Разрешения

Плагин получает только разрешения, перечисленные в manifest и подтверждённые пользователем.

| Название | Что разрешает |
|---|---|
| `chat.write` | `chat.sendText` |
| `chat.edit` | `chat.editText` |
| `chat.photo` | `chat.sendPhoto` |
| `chat.file` | `chat.sendFile` |
| `ui.notify` | `ui.notify` |
| `contact.read` | `contact.getPeer` |
| `message.readReply` | Непустой `context.reply` |
| `network` | `network.fetch` и загрузка media по URL |
| `storage` | `storage.get`, `storage.set`, `storage.remove` |

Вызов метода без permission завершается исключением.

Пример manifest:

```json
"permissions": [
  "network",
  "chat.photo",
  "ui.notify"
]
```

Обновление, которое запрашивает новые разрешения, автоматически не применяется. Пользователь должен установить такую версию заново и подтвердить новый набор прав.

## API reference

Все API экспортируются модулем `komet:api`.

```js
import {
  chat,
  contact,
  network,
  runtime,
  storage,
  ui
} from 'komet:api';
```

### `chat.sendText`

```ts
chat.sendText(text: string): Promise<string>
```

Отправляет текст в текущий чат и возвращает ID сообщения.

Требуемое разрешение: `chat.write`.

Если в текущем чате включено шифрование сообщений, то Komet автоматически шифрует и дешифрует сообщения передаваемые в плагин. Плагин продолжает работать с исходным текстом и не получает ключ шифрования. Собственное сообщение сразу отображается расшифрованным через локальный кеш клиента.

```js
const messageId = await chat.sendText('Hello from plugin');
```

Если приложение находится оффлайн, Komet может вернуть локальный временный ID.

### `chat.editText`

```ts
chat.editText(messageId: string, text: string): Promise<void>
```

Редактирует текстовое сообщение.

Требуемое разрешение: `chat.edit`.

Плагин может редактировать только сообщение, созданное через `chat.sendText` тем же запуском handler.

```js
const id = await chat.sendText('Loading...');
await chat.editText(id, 'Done');
```

Нельзя редактировать:

- сообщения пользователя;
- сообщения других плагинов;
- сообщения из предыдущего запуска того же плагина;
- произвольный ID, полученный из `context.reply`.

### `chat.sendPhoto`

```ts
chat.sendPhoto(options: PhotoOptions): Promise<void>
```

Требуемое разрешение: `chat.photo`.

#### Отправка по URL

```js
await chat.sendPhoto({
  url: 'https://example.org/photo.jpg',
  filename: 'photo.jpg',
  caption: 'Описание'
});
```

Для URL дополнительно требуется разрешение `network`.

#### Отправка из base64

```js
await chat.sendPhoto({
  base64: encodedImage,
  filename: 'photo.png',
  caption: 'Описание'
});
```

#### PhotoOptions

| Поле | Тип | Обязательно | Описание |
|---|---|---:|---|
| `url` | string | Одно из `url`/`base64` | HTTPS URL изображения. |
| `base64` | string | Одно из `url`/`base64` | Данные изображения без `data:` prefix. |
| `filename` | string | Нет | Имя файла. По умолчанию `plugin_photo.jpg`. |
| `caption` | string | Нет | Подпись. По умолчанию пустая строка. |

Максимальный размер изображения после скачивания или декодирования: 15 МБ.

Загрузка изображения по URL выполняется до трёх раз при обрыве соединения. Для каждой попытки создаётся новое соединение с `Connection: close`. Поддерживается до пяти HTTPS redirect; каждый redirect повторно проходит проверку URL и запрет локальных адресов.

Если одновременно заданы `base64` и `url`, используется `base64`.

Метод ожидает завершения загрузки. После завершения временный файл удаляется.

В зашифрованном чате фотография проходит через стандартный пайплайн загрузки фото, так что разработчикам плагинов не надо думать об этом.

### `chat.sendFile`

```ts
chat.sendFile(options: FileOptions): Promise<void>
```

Требуемое разрешение: `chat.file`.

#### Отправка по URL

```js
await chat.sendFile({
  url: 'https://example.org/report.pdf',
  filename: 'report.pdf'
});
```

Для URL дополнительно требуется разрешение `network`.

#### Отправка из base64

```js
await chat.sendFile({
  base64: encodedFile,
  filename: 'data.bin'
});
```

#### FileOptions

| Поле | Тип | Обязательно | Описание |
|---|---|---:|---|
| `url` | string | Одно из `url`/`base64` | HTTPS URL файла. |
| `base64` | string | Одно из `url`/`base64` | Данные файла без `data:` prefix. |
| `filename` | string | Нет | Имя файла. По умолчанию `plugin_file.bin`. |

Максимальный размер файла после скачивания или декодирования: 25 МБ.

Загрузка файла по URL использует те же правила в отнешении редиректов и повторов попыток, что и `chat.sendPhoto`.

Имя файла очищается от неподдерживаемых символов и ограничивается 120 символами. Разрешены латинские и кириллические буквы, цифры, пробел, `.`, `_`, `-`.

Произвольные файлы пока не поддерживают шифрование. В чате с включённым шифрованием `chat.sendFile` завершается ошибкой и не отправляет незашифрованные данные.

### `network.fetch`

```ts
network.fetch(url: string, options?: FetchOptions): Promise<FetchResponse>
```

Выполняет HTTP-запрос.

Требуемое разрешение: `network`.

```js
const response = await network.fetch('https://example.org/api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  body: JSON.stringify({ value: 42 })
});
```

#### FetchOptions

| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| `method` | string | `GET` | `GET`, `POST`, `PUT`, `PATCH` или `DELETE`. |
| `headers` | object | `{}` | HTTP headers. Значения преобразуются в строки. |
| `body` | any | отсутствует | Тело запроса. Рекомендуется передавать строку. |

Следующие headers нельзя задать вручную:

- `Host`;
- `Content-Length`;
- `Connection`;
- `Proxy-Authorization`.

#### FetchResponse

```ts
interface FetchResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  base64: string;
}
```

`body` декодируется как UTF-8 с заменой некорректных последовательностей. Для бинарных ответов следует использовать `base64`.

Komet возвращает ответ для любого HTTP статуса. Проверка `2xx` остаётся обязанностью плагина.

```js
if (response.status < 200 || response.status >= 300) {
  throw new Error(`HTTP ${response.status}`);
}
```

#### Сетевые ограничения

| Ограничение | Значение |
|---|---:|
| Схема | Только HTTPS |
| Таймаут соединения | 10 секунд |
| Ожидание ответа | 15 секунд |
| Чтение ответа | 20 секунд |
| Максимальное тело ответа | 1 МБ |
| Перенаправление в `network.fetch` | Запрещён |

Ограничение перенаправлений в этой таблице относится к `network.fetch`. Загрузка media по URL через `chat.sendPhoto` и `chat.sendFile` следует максимум пяти перенаправлениям с повторной проверкой каждого адреса.

Запрещены `localhost`, поддомены `.localhost`, loopback, link-local и literal private IP-адреса. Проверка literal IP не является полной защитой от DNS rebinding, поэтому разрешение `network` следует выдавать только доверенным плагинам.

### `ui.notify`

```ts
ui.notify(message: string): Promise<void>
```

Показывает toast-подобное уведомление.

Требуемое разрешение: `ui.notify`.

```js
await ui.notify('Операция завершена');
```

### `contact.getPeer`

```ts
contact.getPeer(): Promise<Peer | null>
```

Возвращает безопасный снимок данных собеседника текущего диалога.

Требуемое разрешение: `contact.read`.

```ts
interface Peer {
  id: number;
  displayName: string | null;
  country: string | null;
  registrationTime: number | null;
  updateTime: number | null;
  options: string[];
}
```

В группе, канале или при невозможности получить данные метод может вернуть `null`.

```js
const peer = await contact.getPeer();
if (peer) {
  await chat.sendText(peer.displayName || String(peer.id));
}
```

### `runtime.sleep`

```ts
runtime.sleep(milliseconds: number): Promise<void>
```

Приостанавливает handler.

Допустимый диапазон: от `0` до `10000` миллисекунд включительно.

```js
await runtime.sleep(500);
```

Время ожидания входит в общий 30-секундный timeout команды.

### `runtime.isOnline`

```ts
runtime.isOnline(): Promise<boolean>
```

Возвращает текущее состояние соединения Komet.

```js
if (!(await runtime.isOnline())) {
  await ui.notify('Нет соединения');
  return;
}
```

### `runtime.isActive`

```ts
runtime.isActive(): Promise<boolean>
```

Возвращает `false`, если экран чата, из которого запущена команда, больше не активен.

Полезно для циклов и анимаций:

```js
for (const frame of frames) {
  if (!(await runtime.isActive())) return;
  await chat.editText(id, frame);
  await runtime.sleep(100);
}
```

### `storage.get`

```ts
storage.get(key: string): Promise<unknown>
```

Возвращает значение или `null`, если ключ отсутствует.

Требуемое разрешение: `storage`.

### `storage.set`

```ts
storage.set(key: string, value: JsonValue): Promise<void>
```

Сохраняет JSON-совместимое значение.

```js
await storage.set('settings', {
  units: 'metric',
  notifications: true
});
```

Функции, Symbol, BigInt, cyclic objects и другие значения, не поддерживаемые JSON, использовать нельзя.

### `storage.remove`

```ts
storage.remove(key: string): Promise<void>
```

Удаляет ключ.

```js
await storage.remove('settings');
```

### Ограничения storage

Ключ должен соответствовать:

```regex
^[A-Za-z0-9._-]{1,64}$
```

Хранилище изолировано по plugin ID. Максимальный размер сериализованного JSON всего хранилища одного плагина — 65 536 символов.

## Ошибки

Host API возвращает Promise. Ошибка разрешения, валидации, сети, upload или host-операции приводит к rejected Promise с объектом `Error`.

```js
try {
  await chat.sendFile({
    url: 'https://example.org/report.pdf',
    filename: 'report.pdf'
  });
} catch (error) {
  await ui.notify(`Не удалось отправить файл: ${error.message}`);
}
```

Если handler выбрасывает необработанное исключение, Komet показывает пользователю уведомление `Ошибка плагина: ...`.

Рекомендуется:

- проверять HTTP status;
- оборачивать внешние запросы в `try/catch`;
- показывать понятные сообщения через `ui.notify`;
- не включать токены и секреты в текст ошибок;
- прекращать долгую работу, когда `runtime.isActive()` возвращает `false`.

## Lifecycle и лимиты

Каждый запуск команды получает отдельный QuickJS движок.

Последовательность:

1. Komet создаёт новый runtime.
2. Применяются memory и stack limits.
3. Регистрируется модуль `komet:api`.
4. Загружаются JS-модули плагина.
5. Вызывается handler.
6. После завершения или ошибки runtime закрывается.

Глобальные переменные не сохраняются между запусками. Для постоянного состояния используется `storage`.

### Runtime limits

| Ограничение | Значение |
|---|---:|
| QuickJS heap | 16 МБ |
| GC threshold | 4 МБ |
| QuickJS stack | 256 КБ |
| Время handler | 30 секунд |
| `runtime.sleep` за один вызов | 10 секунд |

Таймаут закрывает движок. Незавершённые операции после закрытия не должны считаться выполненными.

## Удаление

Установленный пользователем плагин можно удалить на экране управления плагинами. Удаление очищает:

- директорию плагина и все JS-модули;
- сохранённые permissions;
- source URL;
- закреплённый ключ автора;
- namespaced storage плагина.

Встроенные плагины Komet удалить нельзя, но их можно отключить.

## Обновления

Для поддержки обновлений manifest плагина должен содержать `updateUrl`.

```json
"updateUrl": "https://example.org/plugin/update.json"
```

Update manifest:

```json
{
  "version": "1.1.0",
  "packageUrl": "plugin-1.1.0.kinet",
  "size": 12345,
  "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
```

### Поля update manifest

| Поле | Тип | Обязательно | Описание |
|---|---|---:|---|
| `version` | string | Да | Новая SemVer-версия. |
| `packageUrl` | string | Да | Абсолютный или относительный HTTPS URL `.kinet`. |
| `size` | integer | Да | Ожидаемый размер пакета в байтах. `0` отключает проверку размера. |
| `sha256` | string | Да | SHA-256 пакета в lowercase hex. Пустая строка отключает проверку digest. |

Для production рекомендуется всегда указывать ненулевой `size` и полный SHA-256.

Перед применением Komet проверяет:

- что версия новее установленной;
- SemVer, включая prerelease identifiers;
- HTTPS для package URL;
- plugin ID внутри пакета;
- совпадение версии пакета и update manifest;
- размер;
- SHA-256;
- отсутствие новых разрешений.
- continuity ключа подписи для уже подписанного плагина.

Если новая версия удаляет разрешения, сохранится только пересечение старых grants с новым manifest.

## Безопасность

### Что sandbox не предоставляет

Плагину недоступны напрямую:

- `MessagesModule` и raw protocol;
- account ID и токены сессии;
- локальная файловая система;
- process API;
- shell-команды;
- platform channels;
- произвольное редактирование сообщений;
- встроенные сетевые библиотеки runtime.

### Сеть

Разрешение `network` предоставляет доступ к публичным HTTPS-ресурсам через ограниченный host API. Это сильное разрешение: плагин может отправить полученные через API данные на внешний сервер.

Не помещайте секреты в manifest или JavaScript-код. `.kinet` является обычным ZIP и легко распаковывается.

### Подпись пакетов

`.kinet` может содержать подпись Ed25519 в `manifest.json`:

```json
"signature": {
  "algorithm": "ed25519",
  "publicKey": "base64-encoded-32-byte-public-key",
  "value": "base64-encoded-64-byte-signature"
}
```

Подпись покрывает:

- канонический manifest без поля `signature`;
- путь и SHA-256 каждого JavaScript-модуля;
- разрешения;
- команды и аргументы;
- plugin ID, версию, автора и update URL.

Порядок файлов и служебные metadata ZIP не входят в подпись.

Komet проверяет подпись до установки. Если поле `signature` присутствует, но ключ, длина подписи или криптографическая проверка некорректны, пакет отклоняется.

При первой установке подписанного плагина Komet сохраняет публичный ключ автора. Все последующие установки и обновления того же plugin ID должны быть подписаны тем же ключом. Переход с unsigned-версии на signed разрешён. Переход с signed-версии на unsigned или другой ключ запрещён.

Fingerprint является сокращённым SHA-256 публичного ключа и отображается в интерфейсе. Он имеет формат восьми групп по четыре hex-символа:

```text
ABCD:1234:5678:90EF:ABCD:1234:5678:90EF
```

Подпись доказывает неизменность пакета и владение соответствующим приватным ключом, но не подтверждает реальное имя автора. Fingerprint следует сверять через доверенный сайт, каталог или другой независимый канал.

### CLI подписи

Генерация ключа:

```bash
dart run tool/kinet_sign.dart generate-key author-key.json
```

Подпись пакета на месте:

```bash
dart run tool/kinet_sign.dart sign plugin.kinet author-key.json
```

Подпись в новый файл:

```bash
dart run tool/kinet_sign.dart sign plugin.kinet author-key.json plugin-signed.kinet
```

Проверка:

```bash
dart run tool/kinet_sign.dart verify plugin-signed.kinet
```

Файл ключа содержит приватный 32-байтовый Ed25519 seed. CLI отказывается перезаписывать существующий key-файл и устанавливает права `0600` на Unix-системах. Ключ нельзя публиковать, добавлять в `.kinet` или хранить в репозитории. В пакет помещаются только публичный ключ и подпись.

SHA-256 в update manifest защищает от случайного повреждения и подмены файла относительно самого manifest, но не доказывает личность автора. Доверие к обновлению основано на HTTPS и контроле автором домена `updateUrl`.

### Разрешения

Запрашивайте минимальный набор permissions. Например, плагину случайных изображений нужны:

```json
["network", "chat.photo", "ui.notify"]
```

Ему не нужны `chat.write`, `chat.edit`, `contact.read` или `storage`.

## Полные примеры


### Погода: network + text

```js
import { chat, network, ui } from 'komet:api';

export async function weather(context) {
  const city = context.arguments.city.trim();
  const response = await network.fetch(
    `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=ru`,
    { headers: { Accept: 'application/json' } }
  );

  if (response.status !== 200) {
    await ui.notify(`wttr.in вернул HTTP ${response.status}`);
    return;
  }

  const data = JSON.parse(response.body);
  const current = data.current_condition?.[0];
  if (!current) {
    await ui.notify('Погода не найдена');
    return;
  }

  await chat.sendText(
    `${city}: ${current.weatherDesc?.[0]?.value || '—'}, ${current.temp_C} °C`
  );
}
```

### Счётчик запусков: storage

Manifest permissions:

```json
["chat.write", "storage"]
```

JavaScript:

```js
import { chat, storage } from 'komet:api';

export async function count() {
  const previous = await storage.get('count');
  const next = typeof previous === 'number' ? previous + 1 : 1;
  await storage.set('count', next);
  await chat.sendText(`Команда запущена ${next} раз`);
}
```

### Работа с reply

Manifest permissions:

```json
["chat.write", "message.readReply", "ui.notify"]
```

JavaScript:

```js
import { chat, ui } from 'komet:api';

export async function quote(context) {
  if (!context.reply) {
    await ui.notify('Ответьте командой на сообщение');
    return;
  }

  const text = context.reply.text || '[вложение]';
  await chat.sendText(`> ${text}`);
}
```

### Отправка JSON как файла

Manifest permissions:

```json
["chat.file"]
```

JavaScript:

```js
import { chat } from 'komet:api';

export async function exportData() {
  await chat.sendFile({
    base64: 'eyJnZW5lcmF0ZWQiOnRydWUsInZhbHVlIjo0Mn0=',
    filename: 'export.json'
  });
}
```

[СПАСИБО ЗА ВНИМАНИЕ!](https://www.youtube.com/watch?v=ja0KEXYLmOg)
