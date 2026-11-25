# Informe de incidencias · Gestor de tareas

**Estudiante:** Kayser Marcos
**Fecha:** 25/11/2026  
**Proyecto / rama Git:** Gestor de tareas (Expo Router + React Native) · rama `fix/incidencias`  
**Entorno (Expo SDK, Android, dispositivo):** Expo SDK 57 · React Native 0.86.3 · React 19.2.3 · TypeScript 6 · Windows · app probada en navegador (Expo web, `npm run web`) · Node v24.20.0


## Resumen ejecutivo
Se auditó una app de gestión de tareas (buscar, filtrar por estado, agregar, completar, eliminar y simular un error de API). La línea base de pruebas automáticas dio **3 tests fallidos y 6 pasados**, y el `typecheck` pasaba sin errores. Se reprodujeron en el navegador los defectos del taller y se encontraron **6 incidencias de código**, más **1 incidencia de entorno** (dependencias desalineadas con el SDK 57) que impedía instalar el proyecto.

Cada incidencia se diagnosticó con una herramienta (consola, DevTools o test), se corrigió con un cambio mínimo y se cerró con un commit propio. En las incidencias 5 y 6, que no tenían pruebas, primero se escribió un test que falla y después se aplicó la corrección. Al cerrar la incidencia 6, las 6 incidencias estaban corregidas, con 12 de 12 tests en verde y `typecheck` sin errores (ver tabla de commits al final).

**Estado final:** 17 de 17 tests en verde y `typecheck` sin errores. Los tests adicionales se sumaron al conectar la app con la API (`taskService.test.ts`).

## Herramientas generales
- `npm run typecheck` detectó la llave sobrante; VS Code también marcaba errores en rojo.
- `git log`, `git status` y `git diff` se usaron para revisar commits y cambios.
- `findstr` se usó para confirmar correcciones en el código.
- Los logs de npm y Expo, junto con `expo-doctor`, ayudaron a diagnosticar la incidencia de dependencias.

## Incidencia 1
- **Título de incidencia:** La búsqueda no actualiza la lista al escribir
- **Pasos para reproducir:** abrir la app en web, escribir `login` en «Buscar por nombre…» sin tocar ningún filtro.
- **Esperado / observado:** esperado, la lista se reduce a «Validar login». Observado, la lista no cambia al escribir; la búsqueda recién se aplica cuando se toca un filtro de estado.
- **Herramienta usada (DevTools / consola / test):** app en el navegador (`npm run web`) y lectura del código.
- **Hipótesis y evidencia:** el filtro se calcula con `useMemo`; se sospechó que no se recalculaba cuando cambiaba `query`. Al tocar «Pendientes» la búsqueda sí se aplicaba. `findstr` mostró que las dependencias eran `[tasks, status]`, sin `query`.
- **Archivo y función involucrada:** `app/index.tsx`, `TaskManagerScreen`, el `useMemo` de `visibleTasks`.
- **Causa raíz:** el arreglo de dependencias era `[tasks, status]` y no incluía `query`, así que React reutilizaba el resultado anterior.
- **Corrección aplicada:** se agregó `query`: `[tasks, query, status]`.
- **Prueba de regresión:** los tests de `filterTasks` cubren la lógica, no la pantalla. La pantalla queda cubierta indirectamente por `TaskManagerScreen.test.tsx`. Pendiente: un test específico de escritura en el buscador (opcional).
- **Estado:** Corregido (commit `452954a`).

## Incidencia 2
- **Título de incidencia:** La búsqueda distingue mayúsculas y no ignora espacios
- **Pasos para reproducir:** con la Incidencia 1 corregida, buscar `VALIDAR` y luego `  login  ` (con espacios).
- **Esperado / observado:** esperado, ambas encuentran «Validar login». Observado, 0 resultados en las dos. Este defecto estaba tapado por el de la Incidencia 1.
- **Herramienta usada (DevTools / consola / test):** `npm test` y la app.
- **Hipótesis y evidencia:** la comparación era literal. Los tests `busca sin distinguir entre minúsculas y mayúsculas` e `ignora espacios antes y después de la búsqueda` fallaban con `Expected length: 1, Received length: 0`.
- **Archivo y función involucrada:** `src/utils/taskFilters.ts`, `filterTasks`.
- **Causa raíz:** `task.title.includes(query)` compara sin normalizar: no pasa a minúsculas ni hace `trim`.
- **Corrección aplicada:** `const normalizedQuery = query.trim().toLowerCase();` y comparación contra `task.title.toLowerCase()`.
- **Prueba de regresión:** los 2 tests existentes de `taskFilters.test.ts` pasaron de fallar a pasar.
- **Estado:** Corregido (commit `eae90b7`).

## Incidencia 3
- **Título de incidencia:** Se puede agregar una tarea compuesta solo de espacios
- **Pasos para reproducir:** escribir 3 espacios en «Nueva tarea» y tocar Agregar.
- **Esperado / observado:** esperado, mensaje «Ingresá un nombre válido para continuar.» y ninguna tarea creada. Observado, se crea una tarea con título vacío.
- **Herramienta usada (DevTools / consola / test):** app en el navegador y `npm test`.
- **Hipótesis y evidencia:** la validación solo mide la longitud. El test `rechaza un título compuesto solo de espacios` recibía `true` y esperaba `false`.
- **Archivo y función involucrada:** `src/utils/taskValidation.ts`, `isValidTaskTitle`.
- **Causa raíz:** `title.length > 0` cuenta los espacios como caracteres válidos.
- **Corrección aplicada:** `title.trim().length > 0`.
- **Prueba de regresión:** `taskValidation.test.ts`, que pasó de fallar a pasar (9 de 9 tests en verde en ese punto).
- **Estado:** Corregido (commit `914ac09`).

## Incidencia 4
- **Título de incidencia:** El check de una tarea no responde y los contadores no cambian
- **Pasos para reproducir:** tocar el check de «Validar login».
- **Esperado / observado:** esperado, la tarea se marca y COMPLETADAS pasa de 2 a 3. Observado, no cambia nada.
- **Herramienta usada (DevTools / consola / test):** app en el navegador y lectura del código.
- **Hipótesis y evidencia:** observado en el navegador: al tocar el check no cambiaban la tarea ni los contadores. La inspección del código mostró que se mutaba el objeto y se reutilizaba el mismo arreglo.
- **Archivo y función involucrada:** `app/index.tsx`, `toggleTask`.
- **Causa raíz:** `toggleTask` mutaba el objeto (`found.completed = !found.completed`) y llamaba `setTasks(tasks)` con el mismo arreglo. React compara por referencia, no detecta cambio y no re-renderiza.
- **Corrección aplicada:** `setTasks(previous => previous.map(task => task.id === id ? { ...task, completed: !task.completed } : task))`, que crea objetos nuevos sin mutar los existentes. Se agregó `testID="completed-count"` al contador para poder testearlo.
- **Prueba de regresión:** `__tests__/TaskManagerScreen.test.tsx` → `actualiza los contadores al marcar una tarea como completada`.
- **Estado:** Corregido (commit `2d5aedb`).

## Incidencia 5
- **Título de incidencia:** El indicador de carga no desaparece tras un error de API
- **Pasos para reproducir:** tocar «⚠ Simular error API» y esperar.
- **Esperado / observado:** esperado, aparece el mensaje de error y se oculta «Consultando tareas…». Observado, el spinner queda visible para siempre y la lista queda vacía.
- **Herramienta usada (DevTools / consola / test):** consola del navegador y `npm test`.
- **Hipótesis y evidencia:** el estado `loading` no se apagaba en el camino de error. La consola mostraba `[taskService] No se cargaron las tareas Error: HTTP 503: servidor temporalmente indisponible (simulado)`. El test falló con `expect(...).toBeNull()` recibiendo el elemento «Consultando tareas…» (resultado: 10 pasados, 1 fallido).
- **Archivo y función involucrada:** `app/index.tsx`, `loadTasks`.
- **Causa raíz:** `setLoading(false)` estaba solo dentro del `try`; cuando `fetchTasks` lanzaba una excepción, el `catch` mostraba el error pero nunca apagaba `loading`.
- **Corrección aplicada:** se movió `setLoading(false)` a un bloque `finally`, que se ejecuta siempre.
- **Prueba de regresión:** `TaskManagerScreen.test.tsx` → `oculta el indicador de carga cuando la API falla`.
- **Estado:** Corregido, 11 de 11 tests en verde (commit `313de5d`).

## Incidencia 6
- **Título de incidencia:** Al cambiar de filtro queda expandida una tarjeta que no se abrió
- **Pasos para reproducir:** tocar «+» en «Validar login» y luego el filtro «Completadas».
- **Esperado / observado:** esperado, ninguna tarjeta queda abierta. Observado, queda abierta «Corregir navegación».
- **Herramienta usada (DevTools / consola / test):** app en el navegador y `npm test`.
- **Hipótesis y evidencia:** después de abrir una tarea y cambiar el filtro, se veía expandida otra tarjeta. El test falló con `expect(...).toBeNull()` al encontrar el detalle de `t02` (resultado: 11 pasados, 1 fallido).
- **Archivo y función involucrada:** `app/index.tsx`, `FlatList`, prop `keyExtractor`.
- **Causa raíz:** `keyExtractor={(_item, index) => String(index)}` usa el índice como key, así que React reutiliza la tarjeta de la misma posición con su estado interno.
- **Corrección aplicada:** `keyExtractor={(item) => item.id}`.
- **Prueba de regresión:** `TaskManagerScreen.test.tsx` → `no arrastra la tarjeta expandida a otra tarea al cambiar de filtro`.
- **Estado:** Corregido, 12 de 12 tests en verde (commit `153d842`).

## Otras incidencias (opcional)

### Dependencias desalineadas con el SDK 57 (entorno)
- **Síntoma:** `npm install` fallaba con `ERESOLVE unable to resolve dependency tree`; `npx expo install --fix` también fallaba.
- **Causas (tres):**
  1. Faltaba `react-test-renderer`; npm instalaba la última (19.3.1), que exige `react@^19.3.1`, y el proyecto usa `react@19.2.3`.
  2. `react-native@0.86.0` estaba por debajo del mínimo que pide `jest-expo` (`@react-native/jest-preset` 0.86.3).
  3. `react-dom@19.3.1` entraba al árbol con el mismo conflicto de `react`.
- **Corrección:** se fijaron `react-test-renderer@19.2.3`, `react-native@0.86.3` y `react-dom@19.2.3`; se actualizaron `expo-status-bar` a `~57.0.1` y `typescript` a `~6.0.3`, según `npx expo install --check`. Las advertencias de `react-native-worklets` son solo `warn` y no afectan.
- **Nota de proceso:** `npx expo install --fix` debe correrse **después** de `npm install`; antes de eso `npx` intenta bajar `expo@58`.

### Preparación de la preview web
- Se agregaron `react-native-web@~0.21.0`, el script `"web": "expo start --web"` y `"web": { "bundler": "metro", "output": "single" }` en `app.json`. Resultado: la app corre en `http://localhost:8081`. Commit `f9730d8`.

### Errores propios durante las correcciones (aprendizaje)
- **Llave `}` sobrante** al reemplazar el cuerpo de `toggleTask`: dejó `addTask`, `deleteTask` y el `return` fuera del componente. Detectada con `npm run typecheck`; VS Code también marcaba errores en rojo.
- **`loadTasks` pegada dentro del `useEffect`**: la versión nueva quedó definida adentro del efecto en lugar de llamarse, así que las tareas nunca se cargaban (TAREAS: 0) y 2 tests fallaban con `Unable to find an element with testID: toggle-t01`. `typecheck` pasaba porque el código era válido; lo detectaron los tests y se resolvió reemplazando el bloque completo.
- **Primera corrida de Jest muy lenta** (timeout de 5 s por caché en frío en Windows); se resolvió con la segunda corrida y con un timeout de 20 s en los tests de pantalla.

### Script `start` incompatible con el entorno
- **Síntoma:** `npm start` muestra `Development build: Unable to determine the default URI scheme for deep linking into the app. Ensure that the expo-dev-client package is installed.`
- **Causa:** el script `start` usa `expo start --dev-client`, pero el entorno no tenía disponible `expo-dev-client`.
- **Alternativa usada:** `npm run web` (preview en el navegador). Pendiente de decidir: instalar `expo-dev-client` o cambiar el script y documentarlo en el README.

### Defectos menores detectados (pendientes)
- `addTask` guarda el título sin `trim`.
- El mensaje de `feedback` no se limpia.
- Import `ScrollView` y dependencia `expo-constants` sin uso.
- Eliminar tarea no pide confirmación.
- `loadTasks` puede ejecutarse dos veces en paralelo (condición de carrera).

## Pruebas
| Prueba | Antes | Después | Evidencia |
|---|---|---|---|
| Búsqueda | Tests `mayúsculas` e `ignora espacios` fallaban (length 0 vs 1); la lista no cambiaba al escribir | Pasan; la lista filtra al escribir | `npm test` (línea base: 3 fallidos, 6 pasados) |
| Validación | Test `rechaza un título compuesto solo de espacios` fallaba (`true` vs `false`) | Pasa; 9 de 9 | `npm test` |
| Actualización de estado | En el navegador, al tocar el check no cambiaban la tarea ni los contadores | Pasa el test `actualiza los contadores al marcar una tarea como completada` | Observación en el navegador y test de regresión posterior |
| Error de servicio | Spinner infinito; test: el elemento «Consultando tareas…» seguía presente | Pasa; 11 de 11 | `TaskManagerScreen.test.tsx` y consola `[taskService]` |
| Tarjeta expandida | `details-t02` presente sin haberlo abierto; 11 pasados y 1 fallido | Pasa; 12 de 12 | `TaskManagerScreen.test.tsx` |

## Conclusión y control de cambios
- **Commit final de código (hash):** `bd9a465`
- **Mensaje del commit:** feat(api): conectar gestor de tareas con backend

Historial de commits en la rama `fix/incidencias`:

| Hash | Mensaje |
|---|---|
| `78951a4` | chore: estado inicial del proyecto (respaldo) *(en `master`)* |
| `f9730d8` | feat(web): agregar react-native-web y script web para la preview |
| `452954a` | fix(busqueda): incluir query en las dependencias de useMemo |
| `eae90b7` | fix(busqueda): ignorar mayúsculas y espacios en filterTasks |
| `914ac09` | fix(validacion): rechazar títulos compuestos solo de espacios |
| `2d5aedb` | fix(estado): no mutar tareas en toggleTask y agregar test de regresión |
| `313de5d` | fix(carga): apagar loading con finally al fallar la API |
| `153d842` | fix(lista): usar id de la tarea como key en el FlatList |
| `bd9a465` | feat(api): conectar gestor de tareas con backend |

- **Qué aprendí y cómo lo aplicaría a mi app final:**
  - Reproducir el error antes de tocar el código, y escribir primero el test que falla, da una prueba objetiva del «antes» y del «después».
  - Un bug puede tapar a otro (la Incidencia 1 ocultaba la 2): conviene corregir de a uno y volver a probar.
  - En React, el estado no se muta: se crean objetos y arreglos nuevos, y las `key` de las listas deben ser identificadores estables, no el índice.
  - Todo lo que apaga un estado de carga va en `finally`.
  - `typecheck` no detecta errores de lógica (una función pegada en el lugar equivocado compila bien): hacen falta tests.
  - Un commit por incidencia y mensajes claros permiten explicar cada corrección y volver atrás si algo se rompe.
  - Lo que más me ayudó fue reproducir cada error antes de tocar el código y confirmarlo con una prueba que fallaba antes de la corrección, porque así pude demostrar el «antes» y el «después» de cada cambio. Aprendí tres cosas de React que no voy a repetir: no mutar el estado, usar un id estable como `key` en lugar del índice y apagar el indicador de carga en un `finally`. También vi que `typecheck` no alcanza: cuando pegué `loadTasks` en el lugar equivocado compilaba bien y las tareas dejaron de cargarse, y fueron los tests los que lo detectaron. En mi app final voy a escribir pruebas de regresión desde el principio, hacer un commit por cada problema y revisar las versiones de las dependencias antes de construir.
