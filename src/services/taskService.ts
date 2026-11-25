import type { Task } from '../types/task';

type ApiTask = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
};

export type TaskInput = Pick<Task, 'title' | 'description' | 'completed'>;

const TASKS_PATH = '/tasks/';
const TASKS_PAGE_SIZE = 100;

function getApiUrl(path: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Falta configurar EXPO_PUBLIC_API_URL.');
  }
  return `${baseUrl}${path}`;
}

function fromApiTask(task: ApiTask): Task {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description ?? '',
    priority: 'media',
    completed: task.completed,
  };
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Error del servidor (HTTP ${response.status}).`);
  }

  return response;
}

/**
 * Obtiene todas las tareas del backend, recorriendo páginas de hasta 100 registros.
 * @param simulateFailure Si es `true`, rechaza la operación con un error 503 simulado.
 * @returns Las tareas normalizadas para el modelo de la aplicación.
 */
export async function fetchTasks(simulateFailure = false): Promise<Task[]> {
  if (simulateFailure) {
    throw new Error('HTTP 503: servidor temporalmente indisponible (simulado)');
  }
  const tasks: Task[] = [];
  let skip = 0;
  while (true) {
    const response = await request(`${TASKS_PATH}?skip=${skip}&limit=${TASKS_PAGE_SIZE}`);
    const records = await response.json() as ApiTask[];
    tasks.push(...records.map(fromApiTask));
    if (records.length < TASKS_PAGE_SIZE) return tasks;
    skip += TASKS_PAGE_SIZE;
  }
}

/**
 * Crea una tarea en el backend.
 * @param input Campos de la tarea que acepta la API.
 * @returns La tarea creada y normalizada para la aplicación.
 */
export async function createTask(input: TaskInput): Promise<Task> {
  const response = await request(TASKS_PATH, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const task = await response.json() as ApiTask;
  return fromApiTask(task);
}

/**
 * Reemplaza los campos editables de una tarea en el backend.
 * @param id Identificador de la tarea.
 * @param input Campos actualizados de la tarea.
 * @returns La tarea actualizada y normalizada para la aplicación.
 */
export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  const response = await request(`${TASKS_PATH}${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  const task = await response.json() as ApiTask;
  return fromApiTask(task);
}

/**
 * Elimina una tarea del backend.
 * @param id Identificador de la tarea.
 */
export async function deleteTask(id: string): Promise<void> {
  await request(`${TASKS_PATH}${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
