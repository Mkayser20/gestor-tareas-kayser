import { createTask, deleteTask, fetchTasks, updateTask } from '../src/services/taskService';

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.montenegroariel.com.ar/';
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('taskService', () => {
  it('lee las tareas, normaliza IDs y asigna prioridad media', async () => {
    fetchMock.mockResolvedValue(response([
      { id: 12, title: 'Preparar entrega', description: null, completed: false },
    ]));

    await expect(fetchTasks()).resolves.toEqual([
      { id: '12', title: 'Preparar entrega', description: '', priority: 'media', completed: false },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.montenegroariel.com.ar/tasks/?skip=0&limit=100',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('pide páginas adicionales cuando hay más de 100 tareas', async () => {
    const firstPage = Array.from({ length: 100 }, (_, id) => ({
      id, title: `Tarea ${id}`, description: null, completed: false,
    }));
    fetchMock
      .mockResolvedValueOnce(response(firstPage))
      .mockResolvedValueOnce(response([
        { id: 100, title: 'Tarea 100', description: null, completed: false },
      ]));

    const tasks = await fetchTasks();

    expect(tasks).toHaveLength(101);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.montenegroariel.com.ar/tasks/?skip=0&limit=100',
      'https://api.montenegroariel.com.ar/tasks/?skip=100&limit=100',
    ]);
  });

  it('usa los endpoints y métodos de creación, actualización y borrado', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ id: 8, title: 'Nueva', description: 'Detalle', completed: false }, 201))
      .mockResolvedValueOnce(response({ id: 8, title: 'Nueva', description: 'Detalle', completed: true }))
      .mockResolvedValueOnce(response(null, 204));

    await createTask({ title: 'Nueva', description: 'Detalle', completed: false });
    await updateTask('8', { title: 'Nueva', description: 'Detalle', completed: true });
    await deleteTask('8');

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['https://api.montenegroariel.com.ar/tasks/', 'POST'],
      ['https://api.montenegroariel.com.ar/tasks/8', 'PUT'],
      ['https://api.montenegroariel.com.ar/tasks/8', 'DELETE'],
    ]);
  });

  it('expone errores HTTP en lugar de devolver una respuesta vacía', async () => {
    fetchMock.mockResolvedValue(response({}, 503));

    await expect(fetchTasks()).rejects.toThrow('Error del servidor (HTTP 503).');
  });
});
